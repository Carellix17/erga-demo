import { FileUp, Sparkles, BookOpen, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onUploadClick: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center relative">
      <div className="relative z-10">
        {/* Icon with M3 containers — bouncy stagger */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-xl bg-primary flex items-center justify-center shadow-level-3 animate-bounce-in">
            <Sparkles className="w-12 h-12 text-primary-foreground animate-wiggle" />
          </div>
          <div 
            className="absolute -right-4 -top-4 w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center shadow-level-2 animate-bounce-in animate-stagger-2"
          >
            <BookOpen className="w-6 h-6 text-secondary" />
          </div>
          <div 
            className="absolute -left-4 -bottom-4 w-12 h-12 rounded-lg bg-tertiary-container flex items-center justify-center shadow-level-2 animate-bounce-in animate-stagger-4"
          >
            <Brain className="w-6 h-6 text-tertiary" />
          </div>
        </div>
        
        <h2 className="font-display text-2xl font-bold mb-3 text-foreground animate-fade-up animate-stagger-2">
          Inizia il tuo percorso
        </h2>
        
        <p className="body-large text-muted-foreground mb-8 max-w-sm leading-relaxed animate-fade-up animate-stagger-3">
          Carica i tuoi appunti o dispense in PDF. L'AI creerà un piano di studio personalizzato con mini-lezioni ed esercizi interattivi.
        </p>
        
        <div className="animate-fade-up animate-stagger-4">
          <Button
            onClick={onUploadClick}
            size="lg"
            className="h-14 px-8"
          >
            <FileUp className="w-5 h-5 mr-2" />
            Carica PDF
          </Button>
        </div>
        
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-up animate-stagger-5">
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
