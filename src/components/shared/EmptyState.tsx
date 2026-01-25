import { FileUp, Sparkles, BookOpen, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onUploadClick: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-fade-up">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-tertiary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Animated icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center shadow-soft-xl animate-bounce-in">
            <Sparkles className="w-12 h-12 text-white" />
          </div>
          {/* Floating badges */}
          <div className="absolute -right-2 -top-2 w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-soft-md animate-bounce-in" style={{ animationDelay: "0.1s" }}>
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="absolute -left-2 -bottom-2 w-10 h-10 rounded-xl bg-tertiary flex items-center justify-center shadow-soft-md animate-bounce-in" style={{ animationDelay: "0.2s" }}>
            <Brain className="w-5 h-5 text-white" />
          </div>
        </div>
        
        <h2 className="font-heading text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
          Inizia il tuo percorso
        </h2>
        
        <p className="text-muted-foreground mb-8 max-w-sm leading-relaxed">
          Carica i tuoi appunti o dispense in PDF. L'AI creerà un piano di studio personalizzato con mini-lezioni ed esercizi interattivi.
        </p>
        
        <Button
          onClick={onUploadClick}
          size="lg"
          className="h-14 px-8 text-base font-semibold gradient-primary text-white border-0 shadow-soft-lg hover:shadow-soft-xl transition-all duration-300 hover:scale-105"
        >
          <FileUp className="w-5 h-5 mr-2" />
          Carica PDF
        </Button>
        
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {[
            { label: "Appunti", color: "chip-primary" },
            { label: "Dispense", color: "chip-tertiary" },
            { label: "Libri", color: "chip-accent" },
          ].map((item) => (
            <span
              key={item.label}
              className={item.color}
            >
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
