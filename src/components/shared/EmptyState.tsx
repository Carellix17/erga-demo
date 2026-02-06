import { FileUp, Sparkles, BookOpen, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onUploadClick: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center animate-fade-up relative">
      {/* Decorative glass orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="glass-orb glass-orb-primary w-72 h-72 -top-20 -right-20 animate-float" />
        <div className="glass-orb glass-orb-accent w-60 h-60 -bottom-16 -left-16" style={{ animationDelay: '-3s' }} />
        <div className="glass-orb glass-orb-tertiary w-48 h-48 top-1/2 left-1/2 -translate-x-1/2" style={{ animationDelay: '-6s', animationDuration: '10s' }} />
      </div>

      <div className="relative z-10">
        {/* Animated icon with floating badges */}
        <div className="relative mb-8">
          <div className="w-28 h-28 rounded-[2rem] gradient-primary flex items-center justify-center shadow-glass-xl animate-bounce-in glow-ring">
            <Sparkles className="w-14 h-14 text-white" />
          </div>
          {/* Floating badge - top right */}
          <div 
            className="absolute -right-3 -top-3 w-12 h-12 rounded-xl glass-accent flex items-center justify-center shadow-glass-md animate-bounce-in" 
            style={{ animationDelay: "0.15s" }}
          >
            <BookOpen className="w-6 h-6 text-accent" />
          </div>
          {/* Floating badge - bottom left */}
          <div 
            className="absolute -left-3 -bottom-3 w-12 h-12 rounded-xl glass-tertiary flex items-center justify-center shadow-glass-md animate-bounce-in" 
            style={{ animationDelay: "0.3s" }}
          >
            <Brain className="w-6 h-6 text-tertiary" />
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
          className="h-14 px-8 text-base font-semibold gradient-primary text-white border-0 rounded-2xl shadow-glass-lg hover:shadow-glass-xl transition-all duration-300 hover:scale-105 active:scale-100 glow-ring"
        >
          <FileUp className="w-5 h-5 mr-2" />
          Carica PDF
        </Button>
        
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {[
            { label: "Appunti", className: "chip-primary glass-primary" },
            { label: "Dispense", className: "chip-tertiary glass-tertiary" },
            { label: "Libri", className: "chip-accent glass-accent" },
          ].map((item) => (
            <span key={item.label} className={item.className}>
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
