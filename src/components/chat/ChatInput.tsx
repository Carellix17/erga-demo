import { useState, useRef } from "react";
import { Send, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedImage) || disabled || isUploading) return;

    let imageUrl: string | undefined;

    // If there's an image, convert to base64 for display
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
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
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
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Image Preview */}
      {imagePreview && (
        <div className="relative inline-block animate-scale-in">
          <img 
            src={imagePreview} 
            alt="Preview" 
            className="h-20 w-auto rounded-xl object-cover border border-border/50 shadow-glass"
          />
          <button
            type="button"
            onClick={removeImage}
            className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-glass-md hover:scale-110 transition-transform"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex gap-2 items-end">
        {/* Image upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="flex-shrink-0 rounded-xl h-12 w-12 border-border/50 hover:bg-primary/10 hover:border-primary/30 transition-all"
        >
          <ImageIcon className="w-5 h-5 text-muted-foreground" />
        </Button>

        {/* Text input */}
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Chiedi qualcosa sui tuoi appunti..."
          className="min-h-[48px] max-h-32 resize-none rounded-2xl border-border/50 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          disabled={disabled || isUploading}
        />

        {/* Send button */}
        <Button
          type="submit"
          size="icon"
          disabled={(!message.trim() && !selectedImage) || disabled || isUploading}
          className="flex-shrink-0 rounded-xl h-12 w-12 gradient-primary text-white shadow-glass-md hover:shadow-glass-lg transition-all hover:scale-105 active:scale-100"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </form>
  );
}
