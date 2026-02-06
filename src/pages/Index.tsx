import { useState, useEffect, useCallback } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { StudioView } from "@/components/studio/StudioView";
import { PianoView } from "@/components/piano/PianoView";
import { ChatView } from "@/components/chat/ChatView";
import { UploadSheet } from "@/components/upload/UploadSheet";
import { useUserData } from "@/hooks/useUserData";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "studio" | "piano" | "chat";

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
  const { currentUser } = useAuth();
  
  const { data: uploadedFiles, updateData: setUploadedFiles } = useUserData<UploadedFile[]>(
    "uploaded_files",
    []
  );

  const checkCloudContent = useCallback(async () => {
    if (!currentUser) return;
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated mesh background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="glass-orb glass-orb-primary w-[500px] h-[500px] -top-48 -right-48 animate-float" />
        <div className="glass-orb glass-orb-tertiary w-[400px] h-[400px] top-1/3 -left-32" style={{ animationDelay: '-4s', animationDuration: '15s' }} />
        <div className="glass-orb glass-orb-accent w-[350px] h-[350px] -bottom-32 right-1/4" style={{ animationDelay: '-7s', animationDuration: '18s' }} />
      </div>

      <div className="relative z-10">
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
        </main>

        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

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
