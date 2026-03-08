import { useState, useEffect, useCallback } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { StudioView } from "@/components/studio/StudioView";
import { PianoView } from "@/components/piano/PianoView";
import { PraticaView } from "@/components/pratica/PraticaView";
import { ProfileView } from "@/components/profile/ProfileView";
import { UploadSheet } from "@/components/upload/UploadSheet";
import { useUserData } from "@/hooks/useUserData";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Tab = "studio" | "piano" | "pratica" | "profilo";

interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: string;
}

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("studio");
  const [showUpload, setShowUpload] = useState(false);
  const [hasCloudContent, setHasCloudContent] = useState(false);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { currentUser } = useAuth();
  
  const { data: uploadedFiles, updateData: setUploadedFiles } = useUserData<UploadedFile[]>(
    "uploaded_files",
    []
  );

  const checkCloudContent = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ userId: currentUser, action: "hasContent" }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setHasCloudContent(data.hasContent || false);
      }
    } catch (error) {
      console.error("Error checking cloud content:", error);
    }
  }, [currentUser]);

  useEffect(() => {
    checkCloudContent();
  }, [checkCloudContent]);

  const hasFiles = uploadedFiles.length > 0 || hasCloudContent;

  const handleUpload = (files: { name: string; size: number }[], contextId?: string) => {
    const newFiles: UploadedFile[] = files.map((file) => ({
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    setHasCloudContent(true);
    if (contextId) {
      setSelectedContextId(contextId);
    }
    setRefreshKey(prev => prev + 1);
  };

  const handleSelectFile = (contextId: string) => {
    setSelectedContextId(contextId);
    setActiveTab("studio");
    setRefreshKey(prev => prev + 1);
  };

  const handleFileDeleted = () => {
    setRefreshKey(prev => prev + 1);
    checkCloudContent();
  };

  const displayFiles = uploadedFiles.map((f) => ({
    name: f.name,
    size: f.size,
  }));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        onUploadClick={() => setShowUpload(true)}
        hasFiles={hasFiles}
      />

      <main className="max-w-lg mx-auto">
        {activeTab === "studio" && (
          <StudioView
            key={`studio-${refreshKey}`}
            hasFiles={hasFiles}
            onUploadClick={() => setShowUpload(true)}
            selectedContextId={selectedContextId}
            onClearContext={() => setSelectedContextId(null)}
            onFullscreenChange={setIsFullscreen}
          />
        )}
        {activeTab === "piano" && (
          <PianoView
            hasFiles={hasFiles}
            onUploadClick={() => setShowUpload(true)}
          />
        )}
        {activeTab === "chat" && (
          <ChatView
            hasFiles={hasFiles}
            onUploadClick={() => setShowUpload(true)}
          />
        )}
        {activeTab === "profilo" && (
          <ProfileView />
        )}
      </main>

      {!isFullscreen && <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />}

      <UploadSheet
        open={showUpload}
        onOpenChange={setShowUpload}
        onUpload={handleUpload}
        uploadedFiles={displayFiles}
        onSelectFile={handleSelectFile}
        onFileDeleted={handleFileDeleted}
      />
    </div>
  );
};

export default Index;
