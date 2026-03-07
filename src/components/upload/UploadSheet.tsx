import { useState, useCallback } from "react";
import { FileUp, X, FileText, Loader2, Sparkles, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FileManager } from "./FileManager";
import { supabase } from "@/integrations/supabase/client";

interface UploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: { name: string; size: number }[], contextId?: string) => void;
  uploadedFiles: { name: string; size: number }[];
  onSelectFile?: (contextId: string) => void;
  onFileDeleted?: () => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;

type GenerationStep = "idle" | "uploading" | "processing" | "generating" | "complete";

export function UploadSheet({ open, onOpenChange, onUpload, uploadedFiles, onSelectFile, onFileDeleted }: UploadSheetProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [generationStep, setGenerationStep] = useState<GenerationStep>("idle");
  const [currentFileName, setCurrentFileName] = useState("");
  const [activeTab, setActiveTab] = useState<string>("upload");
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf");
    if (files.length > 0) setSelectedFiles(prev => [...prev, ...files]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type === "application/pdf");
    if (files.length > 0) setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => setSelectedFiles(prev => prev.filter((_, i) => i !== index));

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !currentUser) return;
    setIsUploading(true); setGenerationStep("uploading");
    const uploadedFileInfos: { name: string; size: number }[] = [];
    const uploadedContextIds: string[] = [];
    try {
      for (const file of selectedFiles) {
        setCurrentFileName(file.name);
        if (file.size > MAX_FILE_SIZE) { toast({ title: "File troppo grande", description: `${file.name} supera il limite di 20MB`, variant: "destructive" }); continue; }
        setGenerationStep("uploading");
        const formData = new FormData(); formData.append("file", file); formData.append("userId", currentUser);
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-pdf`, { method: "POST", headers: { Authorization: `Bearer ${authToken}` }, body: formData });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Errore nel caricamento");
        uploadedFileInfos.push({ name: file.name, size: file.size });
        if (data.contextId) uploadedContextIds.push(data.contextId as string);
        setGenerationStep("processing");
      }
      if (uploadedFileInfos.length > 0 && uploadedContextIds.length > 0) {
        setGenerationStep("generating");
        const { data: { session: sessionForLessons } } = await supabase.auth.getSession();
        const authTokenForLessons = sessionForLessons?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const waitForContextProcessing = async (contextId: string) => {
          const maxAttempts = 20; const delayMs = 2000;
          for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const statusResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
              { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authTokenForLessons}` },
                body: JSON.stringify({ userId: currentUser, action: "listContexts" }) });
            const statusData = await statusResponse.json();
            const context = statusData.contexts?.find((c: { id: string }) => c.id === contextId);
            if (context?.processing_status === "completed") return { ok: true };
            if (context?.processing_status === "failed") return { ok: false, error: context.error_message || "Errore durante l'elaborazione del PDF." };
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
          return { ok: false, error: "Timeout durante l'elaborazione del PDF." };
        };
        for (const contextId of uploadedContextIds) {
          setGenerationStep("processing");
          const processingResult = await waitForContextProcessing(contextId);
          if (!processingResult.ok) { toast({ title: "Elaborazione incompleta", description: processingResult.error, variant: "destructive" }); continue; }
          setGenerationStep("generating");
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
            { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authTokenForLessons}` },
              body: JSON.stringify({ userId: currentUser, contextId }) });
        }
        setGenerationStep("complete");
        await new Promise(resolve => setTimeout(resolve, 1500));
        const latestContextId = uploadedContextIds.at(-1);
        onUpload(uploadedFileInfos, latestContextId); setSelectedFiles([]); setGenerationStep("idle"); onOpenChange(false);
        toast({ title: "Contenuti pronti! 🎉", description: "Le mini-lezioni sono state generate. Buono studio!" });
      }
    } catch (error) { console.error("Upload error:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nel caricamento", variant: "destructive" }); setGenerationStep("idle");
    } finally { setIsUploading(false); }
  };

  const handleFileSelect = (contextId: string) => { onSelectFile?.(contextId); onOpenChange(false); };
  const handleFileDeleted = () => { onFileDeleted?.(); };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStepProgress = () => {
    switch (generationStep) { case "uploading": return 25; case "processing": return 50; case "generating": return 75; case "complete": return 100; default: return 0; }
  };
  const getStepLabel = () => {
    switch (generationStep) { case "uploading": return "Caricamento file..."; case "processing": return "Estrazione testo..."; case "generating": return "Generazione lezioni..."; case "complete": return "Completato!"; default: return ""; }
  };

  if (generationStep !== "idle") {
    return (
      <Sheet open={open} onOpenChange={() => {}}>
        <SheetContent side="bottom" className="rounded-t-xl pb-safe h-auto bg-surface-container-high border-t border-outline-variant">
          <div className="py-8 px-4">
            <div className="flex flex-col items-center text-center mb-8">
              <div className={cn(
                "w-20 h-20 rounded-xl flex items-center justify-center mb-4 transition-all duration-500 shadow-level-3",
                generationStep === "complete" ? "bg-success-container animate-bounce-in" : "bg-primary animate-pulse-soft"
              )}>
                {generationStep === "complete" ? (
                  <Check className="w-10 h-10 text-success animate-pop" />
                ) : (
                  <Sparkles className="w-10 h-10 text-primary-foreground animate-wiggle" />
                )}
              </div>
              <h3 className="font-display text-xl font-bold mb-2 animate-fade-up">
                {generationStep === "complete" ? "Tutto pronto!" : "Preparazione contenuti"}
              </h3>
              <p className="text-muted-foreground body-medium max-w-xs">{currentFileName}</p>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="label-large">{getStepLabel()}</span>
                <span className="text-primary label-large">{getStepProgress()}%</span>
              </div>
              <div className="h-3 m3-progress-track">
                <div className={cn("h-full m3-progress-indicator transition-all duration-700", generationStep === "complete" && "bg-success")}
                  style={{ width: `${getStepProgress()}%`, backgroundColor: generationStep === "complete" ? `hsl(var(--success))` : undefined }} />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { step: "uploading", label: "Upload", icon: FileUp },
                { step: "processing", label: "Analisi", icon: FileText },
                { step: "generating", label: "AI", icon: Sparkles },
                { step: "complete", label: "Fatto", icon: Check },
              ].map(({ step, label, icon: Icon }, i) => {
                const stepOrder = ["uploading", "processing", "generating", "complete"];
                const currentIndex = stepOrder.indexOf(generationStep);
                const stepIndex = stepOrder.indexOf(step);
                const isActive = step === generationStep;
                const isComplete = stepIndex < currentIndex;
                return (
                  <div key={step} className={`flex flex-col items-center animate-fade-up animate-stagger-${i + 1}`}>
                    <div className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center mb-1.5 transition-all duration-500",
                      isActive && "bg-primary text-primary-foreground scale-110 shadow-level-2 animate-pop",
                      isComplete && "bg-success-container text-success",
                      !isActive && !isComplete && "bg-surface-container-highest text-muted-foreground"
                    )}>
                      <Icon className={cn("w-5 h-5", isActive && step !== "complete" && "animate-pulse-soft")} />
                    </div>
                    <span className={cn("label-small", isActive && "text-primary", isComplete && "text-success", !isActive && !isComplete && "text-muted-foreground")}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl pb-safe max-h-[85vh] bg-surface-container-high border-t border-outline-variant flex flex-col overflow-hidden">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-display text-xl">I tuoi materiali</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-4 p-1.5 h-13 bg-surface-container-highest rounded-xl">
            <TabsTrigger value="upload" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-level-1 transition-all duration-300">
              Carica nuovo
            </TabsTrigger>
            <TabsTrigger value="manage" className="rounded-lg data-[state=active]:bg-tertiary data-[state=active]:text-tertiary-foreground data-[state=active]:shadow-level-1 transition-all duration-300">
              Gestisci file
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="flex-1 overflow-y-auto space-y-4 mt-0 pb-4">
            <div
              className={cn(
                "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-500",
                dragActive ? "border-primary bg-primary-container scale-[1.02] shadow-level-2" : "border-outline-variant hover:border-primary/40 hover:bg-surface-container-low",
                isUploading && "pointer-events-none opacity-50"
              )}
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            >
              <input type="file" accept=".pdf" multiple onChange={handleFileInput} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploading} />
              <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-level-2 animate-float">
                <FileUp className="w-8 h-8 text-primary-foreground" />
              </div>
              <p className="font-display font-semibold text-lg mb-1">Trascina qui i tuoi PDF</p>
              <p className="body-small text-muted-foreground">oppure tocca per selezionare (max 20MB)</p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2 animate-fade-up">
                <h3 className="label-medium text-muted-foreground">File selezionati ({selectedFiles.length})</h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className={cn(
                      "flex items-center gap-3 p-4 rounded-xl transition-all duration-300 animate-scale-in",
                      file.size > MAX_FILE_SIZE ? "bg-error-container border border-destructive/30" : "bg-secondary-container"
                    )}>
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center",
                        file.size > MAX_FILE_SIZE ? "bg-destructive/20" : "bg-primary-container"
                      )}>
                        <FileText className={cn("w-5 h-5", file.size > MAX_FILE_SIZE ? "text-destructive" : "text-primary")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="body-medium font-medium truncate block">{file.name}</span>
                        <span className={cn("body-small", file.size > MAX_FILE_SIZE ? "text-destructive" : "text-muted-foreground")}>
                          {formatFileSize(file.size)}{file.size > MAX_FILE_SIZE && " — Troppo grande!"}
                        </span>
                      </div>
                      <button onClick={() => removeFile(index)} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors" disabled={isUploading}>
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="sticky bottom-0 bg-surface-container-high/95 backdrop-blur-sm pt-3 pb-2 -mx-1 px-1 mt-auto">
              <Button onClick={handleUpload} disabled={selectedFiles.length === 0 || isUploading} className="w-full h-14 text-base" size="lg">
                {isUploading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Caricamento...</>
                ) : selectedFiles.length > 0 ? (
                  <><Sparkles className="w-5 h-5 mr-2" />Carica e genera lezioni</>
                ) : ("Seleziona file da caricare")}
              </Button>
              <p className="body-small text-muted-foreground text-center mt-2">✨ Ogni PDF creerà un percorso di studio personalizzato</p>
            </div>
          </TabsContent>

          <TabsContent value="manage" className="mt-0">
            <FileManager onFileDeleted={handleFileDeleted} onSelectFile={handleFileSelect} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
