import { FileUp, Sparkles, BookOpen, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onUploadClick: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-fade-up relative">
      <div className="relative z-10">
        {/* Icon with M3 containers */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-xl bg-primary flex items-center justify-center shadow-level-3 animate-bounce-in">
            <Sparkles className="w-12 h-12 text-primary-foreground" />
          </div>
          {/* Badge - top right */}
          <div 
            className="absolute -right-3 -top-3 w-11 h-11 rounded-lg bg-tertiary-container flex items-center justify-center shadow-level-2 animate-bounce-in" 
            style={{ animationDelay: "0.15s" }}
          >
            <BookOpen className="w-5 h-5 text-tertiary" />
          </div>
          {/* Badge - bottom left */}
          <div 
            className="absolute -left-3 -bottom-3 w-11 h-11 rounded-lg bg-secondary-container flex items-center justify-center shadow-level-2 animate-bounce-in" 
            style={{ animationDelay: "0.3s" }}
          >
            <Brain className="w-5 h-5 text-secondary" />
          </div>
        </div>
        
        <h2 className="font-display text-2xl font-bold mb-3 text-foreground">
          Inizia il tuo percorso
        </h2>
        
        <p className="body-large text-muted-foreground mb-8 max-w-sm leading-relaxed">
          Carica i tuoi appunti o dispense in PDF. L'AI creerà un piano di studio personalizzato con mini-lezioni ed esercizi interattivi.
        </p>
        
        <Button
          onClick={onUploadClick}
          size="lg"
          className="h-14 px-8"
        >
          <FileUp className="w-5 h-5 mr-2" />
          Carica PDF
        </Button>
        
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {[
            { label: "Appunti", cls: "bg-primary-container text-primary" },
            { label: "Dispense", cls: "bg-secondary-container text-secondary" },
            { label: "Libri", cls: "bg-tertiary-container text-tertiary" },
          ].map((item) => (
            <span key={item.label} className={`m3-chip ${item.cls}`}>
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
