import { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { StudioView } from "@/components/studio/StudioView";
import { PianoView } from "@/components/piano/PianoView";
import { ChatView } from "@/components/chat/ChatView";
import { UploadSheet } from "@/components/upload/UploadSheet";
import { useUserData } from "@/hooks/useUserData";

type Tab = "studio" | "piano" | "chat";

interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: string;
}

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("studio");
  const [showUpload, setShowUpload] = useState(false);
  
  // User-specific uploaded files stored in localStorage
  const { data: uploadedFiles, updateData: setUploadedFiles } = useUserData<UploadedFile[]>(
    "uploaded_files",
    []
  );

  const hasFiles = uploadedFiles.length > 0;

  const handleUpload = (files: File[]) => {
    const newFiles: UploadedFile[] = files.map((file) => ({
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  // Convert UploadedFile to File-like object for UploadSheet display
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
            hasFiles={hasFiles}
            onUploadClick={() => setShowUpload(true)}
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

      <UploadSheet
        open={showUpload}
        onOpenChange={setShowUpload}
        onUpload={handleUpload}
        uploadedFiles={displayFiles as File[]}
      />
    </div>
  );
};

export default Index;
