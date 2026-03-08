import { FileUp, Sparkles, BookOpen, Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onUploadClick: () => void;
}

export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 gradient-surface opacity-60" />
      
      <div className="relative z-10">
        {/* Decorative blobs — colorful */}
        <div className="absolute -top-24 -left-20 w-48 h-48 rounded-full bg-primary/[0.08] blur-3xl animate-float" />
        <div className="absolute -top-10 right-0 w-36 h-36 rounded-full bg-secondary/[0.10] blur-3xl animate-float" style={{ animationDelay: "1s" }} />
        <div className="absolute -bottom-20 -right-16 w-40 h-40 rounded-full bg-tertiary/[0.10] blur-2xl animate-float" style={{ animationDelay: "2s" }} />

        {/* Icon composition */}
        <div className="relative mb-10 flex items-center justify-center">
          <div className="w-28 h-28 rounded-[2rem] gradient-primary flex items-center justify-center shadow-level-4 animate-bounce-in rotate-3">
            <Sparkles className="w-14 h-14 text-white animate-wiggle" />
          </div>
          <div className="absolute -right-5 -top-5 w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center shadow-level-2 animate-bounce-in animate-stagger-2 -rotate-6">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div className="absolute -left-5 -bottom-5 w-14 h-14 rounded-2xl bg-tertiary flex items-center justify-center shadow-level-2 animate-bounce-in animate-stagger-3 rotate-6">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div className="absolute right-2 -bottom-6 w-10 h-10 rounded-xl bg-warning flex items-center justify-center shadow-level-2 animate-bounce-in animate-stagger-4 rotate-12">
            <Zap className="w-5 h-5 text-white" />
          </div>
        </div>
        
        <h2 className="font-display text-2xl font-bold mb-3 text-foreground animate-fade-up animate-stagger-2">
          Inizia il tuo percorso
        </h2>
        
        <p className="body-large text-muted-foreground mb-8 max-w-sm leading-relaxed animate-fade-up animate-stagger-3">
          Carica i tuoi appunti o cerca un argomento sul web. L'AI creerà un piano di studio personalizzato con mini-lezioni interattive.
        </p>
        
        <div className="animate-fade-up animate-stagger-4">
          <Button onClick={onUploadClick} size="lg" className="h-14 px-8 text-base shadow-level-3 gradient-primary border-0 hover:shadow-level-4">
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
