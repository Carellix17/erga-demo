import { useState, useCallback } from "react";
import { FileUp, X, FileText, Check, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FileManager } from "./FileManager";

interface UploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: { name: string; size: number }[], contextId?: string) => void;
  uploadedFiles: { name: string; size: number }[];
  onSelectFile?: (contextId: string) => void;
  onFileDeleted?: () => void;
}

export function UploadSheet({ open, onOpenChange, onUpload, uploadedFiles, onSelectFile, onFileDeleted }: UploadSheetProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === "application/pdf"
    );
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(
      (file) => file.type === "application/pdf"
    );
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !currentUser) return;

    setIsUploading(true);
    const uploadedFileInfos: { name: string; size: number }[] = [];

    try {
      for (const file of selectedFiles) {
        toast({
          title: `Caricamento: ${file.name}`,
          description: "Estrazione del testo in corso...",
        });

        const pdfBase64 = await fileToBase64(file);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-pdf`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              userId: currentUser,
              fileName: file.name,
              pdfBase64,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Errore nel caricamento");
        }

        uploadedFileInfos.push({ name: file.name, size: file.size });

        toast({
          title: "File caricato",
          description: `${file.name} - Estratti ${data.extractedLength} caratteri`,
        });
      }

      onUpload(uploadedFileInfos);
      setSelectedFiles([]);
      onOpenChange(false);

      // Trigger lesson generation
      toast({
        title: "Generazione lezioni",
        description: "Sto creando le mini-lezioni basate sui tuoi contenuti...",
      });

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ userId: currentUser }),
        }
      );

      toast({
        title: "Contenuti pronti!",
        description: "Le mini-lezioni sono state generate. Buono studio!",
      });

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore nel caricamento",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (contextId: string) => {
    onSelectFile?.(contextId);
    onOpenChange(false);
  };

  const handleFileDeleted = () => {
    onFileDeleted?.();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-safe h-[85vh]">
        <SheetHeader className="mb-4">
          <SheetTitle>I tuoi materiali</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="upload">Carica nuovo</TabsTrigger>
            <TabsTrigger value="manage">Gestisci file</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-0">
            {/* Drop Zone */}
            <div
              className={cn(
                "relative border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50",
                isUploading && "pointer-events-none opacity-50"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <FileUp className="w-6 h-6 text-primary" />
              </div>
              
              <p className="font-medium mb-1 text-sm">
                Trascina qui i tuoi PDF
              </p>
              <p className="text-xs text-muted-foreground">
                oppure tocca per selezionare
              </p>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  File selezionati ({selectedFiles.length})
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted"
                    >
                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm flex-1 truncate">{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-background rounded-lg transition-colors"
                        disabled={isUploading}
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className="w-full"
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Caricamento in corso...
                </>
              ) : selectedFiles.length > 0 ? (
                `Carica ${selectedFiles.length} file`
              ) : (
                "Seleziona file da caricare"
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Ogni PDF creerà un percorso di studio separato
            </p>
          </TabsContent>

          <TabsContent value="manage" className="mt-0">
            <FileManager 
              onFileDeleted={handleFileDeleted}
              onSelectFile={handleFileSelect}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
