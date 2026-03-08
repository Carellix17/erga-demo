import { FileUp, Sparkles, BookOpen, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onUploadClick: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center relative">
      <div className="relative z-10">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -left-16 w-40 h-40 rounded-full bg-primary/[0.06] blur-3xl animate-float" />
        <div className="absolute -bottom-16 -right-12 w-32 h-32 rounded-full bg-tertiary/[0.08] blur-2xl animate-float" style={{ animationDelay: "1.5s" }} />

        {/* Icon composition */}
        <div className="relative mb-10 flex items-center justify-center">
          <div className="w-28 h-28 rounded-3xl bg-primary flex items-center justify-center shadow-level-3 animate-bounce-in rotate-3">
            <Sparkles className="w-14 h-14 text-primary-foreground animate-wiggle" />
          </div>
          <div className="absolute -right-5 -top-5 w-14 h-14 rounded-2xl bg-secondary-container flex items-center justify-center shadow-level-2 animate-bounce-in animate-stagger-2 -rotate-6">
            <BookOpen className="w-7 h-7 text-secondary" />
          </div>
          <div className="absolute -left-5 -bottom-5 w-14 h-14 rounded-2xl bg-tertiary-container flex items-center justify-center shadow-level-2 animate-bounce-in animate-stagger-4 rotate-6">
            <Brain className="w-7 h-7 text-tertiary" />
          </div>
        </div>
        
        <h2 className="font-display text-2xl font-bold mb-3 text-foreground animate-fade-up animate-stagger-2">
          Inizia il tuo percorso
        </h2>
        
        <p className="body-large text-muted-foreground mb-8 max-w-sm leading-relaxed animate-fade-up animate-stagger-3">
          Carica i tuoi appunti o cerca un argomento sul web. L'AI creerà un piano di studio personalizzato con mini-lezioni interattive.
        </p>
        
        <div className="animate-fade-up animate-stagger-4">
          <Button onClick={onUploadClick} size="lg" className="h-14 px-8 text-base shadow-level-2">
            <FileUp className="w-5 h-5 mr-2" />
            Inizia ora
          </Button>
        </div>
        
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-up animate-stagger-5">
          {[
            { label: "📄 PDF", cls: "bg-primary-container text-primary" },
            { label: "🌐 Ricerca web", cls: "bg-secondary-container text-secondary" },
            { label: "🧠 AI Tutor", cls: "bg-tertiary-container text-tertiary" },
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
