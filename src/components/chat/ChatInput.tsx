import { useState, useRef, useEffect } from "react";
import { Send, Image as ImageIcon, X, Loader2, Mic, MicOff } from "lucide-react";
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
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Setup speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = "it-IT";
      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        if (finalTranscript) {
          setMessage(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
    return () => { recognitionRef.current?.stop(); };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedImage) || disabled || isUploading) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

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

    onSend(message.trim() || "Analizza questa immagine", imageUrl);
    setMessage("");
    setSelectedImage(null);
    setImagePreview(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert("L'immagine deve essere inferiore a 5MB"); return; }
      if (!file.type.startsWith("image/")) { alert("Seleziona un file immagine valido"); return; }
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
  const hasSpeechSupport = !!(typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));

  return (
    <form onSubmit={handleSubmit}>
      <div className={cn(
        "relative rounded-[28px] shadow-level-2 transition-all duration-300 ease-m3-standard",
        "bg-surface-container-high",
        "focus-within:shadow-level-3",
        isListening && "ring-2 ring-destructive/50 shadow-level-3"
      )}>
        {/* Image Preview */}
        {imagePreview && (
          <div className="px-4 pt-3 animate-scale-in">
            <div className="relative inline-block">
              <img src={imagePreview} alt="Preview" className="h-20 w-auto rounded-xl object-cover shadow-level-1" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-level-2 hover:scale-110 transition-transform"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-1 p-1.5">
          {/* Image upload */}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-foreground/[0.08] disabled:opacity-38"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Auto-resizing textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Sto ascoltando..." : "Chiedi qualcosa..."}
            rows={1}
            disabled={disabled || isUploading}
            className="flex-1 bg-transparent border-0 outline-none resize-none body-large placeholder:text-muted-foreground py-2 px-1 min-h-[40px] max-h-[120px] disabled:opacity-50"
          />

          {/* Voice button */}
          {hasSpeechSupport && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={disabled}
              className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                isListening
                  ? "bg-destructive text-destructive-foreground animate-pulse-soft shadow-level-2"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.08]",
                "disabled:opacity-38"
              )}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}

          {/* Send button */}
          <Button
            type="submit"
            size="icon"
            disabled={!hasContent || disabled || isUploading}
            className={cn(
              "flex-shrink-0 h-10 w-10 rounded-full transition-all duration-300 ease-m3-emphasized",
              hasContent
                ? "bg-primary text-primary-foreground shadow-level-1 scale-100 opacity-100"
                : "bg-surface-container-highest text-muted-foreground scale-90 opacity-50"
            )}
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </form>
  );
}
