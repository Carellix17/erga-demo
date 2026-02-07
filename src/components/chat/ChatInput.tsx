import { useState, useRef } from "react";
import { Send, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string, imageUrl?: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedImage) || disabled || isUploading) return;

    let imageUrl: string | undefined;

    if (selectedImage) {
      setIsUploading(true);
      try {
        const reader = new FileReader();
        imageUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedImage);
        });
      } catch (error) {
        console.error("Error reading image:", error);
      } finally {
        setIsUploading(false);
      }
    }

    onSend(message.trim() || "Guarda questa immagine", imageUrl);
    setMessage("");
    setSelectedImage(null);
    setImagePreview(null);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize textarea
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("L'immagine deve essere inferiore a 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        alert("Seleziona un file immagine valido");
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const hasContent = message.trim() || selectedImage;

  return (
    <form onSubmit={handleSubmit}>
      <div className="relative glass-card rounded-2xl border border-border/20 shadow-glass-md focus-within:border-primary/30 focus-within:shadow-glass-lg transition-all duration-300">
        {/* Image Preview - inside the card */}
        {imagePreview && (
          <div className="px-3 pt-3 animate-scale-in">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="h-16 w-auto rounded-xl object-cover border border-border/20"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-1 p-1.5">
          {/* Image upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className={cn(
              "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
              "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              "disabled:opacity-40 disabled:pointer-events-none"
            )}
          >
            <ImageIcon className="w-[18px] h-[18px]" />
          </button>

          {/* Auto-resizing textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Chiedi qualcosa..."
            rows={1}
            disabled={disabled || isUploading}
            className={cn(
              "flex-1 bg-transparent border-0 outline-none resize-none",
              "text-sm leading-relaxed placeholder:text-muted-foreground/60",
              "py-2 px-1 min-h-[36px] max-h-[120px]",
              "disabled:opacity-50"
            )}
          />

          {/* Send button */}
          <Button
            type="submit"
            size="icon"
            disabled={!hasContent || disabled || isUploading}
            className={cn(
              "flex-shrink-0 rounded-xl h-9 w-9 transition-all duration-300",
              hasContent
                ? "gradient-primary text-white shadow-glass scale-100 opacity-100"
                : "bg-muted/40 text-muted-foreground scale-95 opacity-60"
            )}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
