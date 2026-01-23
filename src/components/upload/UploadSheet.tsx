import { useState, useCallback } from "react";
import { FileUp, X, FileText, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (files: File[]) => void;
  uploadedFiles: File[];
}

export function UploadSheet({ open, onOpenChange, onUpload, uploadedFiles }: UploadSheetProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles);
      setSelectedFiles([]);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-safe h-[80vh]">
        <SheetHeader className="mb-6">
          <SheetTitle>Carica i tuoi materiali</SheetTitle>
        </SheetHeader>

        {/* Drop Zone */}
        <div
          className={cn(
            "relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
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
          />
          
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <FileUp className="w-7 h-7 text-primary" />
          </div>
          
          <p className="font-medium mb-1">
            Trascina qui i tuoi PDF
          </p>
          <p className="text-sm text-muted-foreground">
            oppure tocca per selezionare
          </p>
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              File selezionati ({selectedFiles.length})
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
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
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Already Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Già caricati ({uploadedFiles.length})
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-xl bg-primary/10"
                >
                  <Check className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm flex-1 truncate">{file.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div className="mt-6">
          <Button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0}
            className="w-full"
            size="lg"
          >
            {selectedFiles.length > 0
              ? `Carica ${selectedFiles.length} file`
              : "Seleziona file da caricare"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
