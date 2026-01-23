import { FileUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onUploadClick: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center animate-fade-up">
      <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center mb-6">
        <Sparkles className="w-10 h-10 text-secondary-foreground" />
      </div>
      
      <h2 className="text-xl font-semibold mb-2">
        Inizia il tuo percorso
      </h2>
      
      <p className="text-muted-foreground mb-8 max-w-xs leading-relaxed">
        Carica i tuoi appunti o dispense in PDF. L'intelligenza artificiale creerà un piano di studio personalizzato per te.
      </p>
      
      <Button
        onClick={onUploadClick}
        size="lg"
        className="gap-3"
      >
        <FileUp className="w-5 h-5" />
        Carica PDF
      </Button>
      
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {["Appunti", "Dispense", "Libri"].map((item) => (
          <span
            key={item}
            className="px-3 py-1.5 rounded-xl bg-muted text-muted-foreground text-xs font-medium"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
