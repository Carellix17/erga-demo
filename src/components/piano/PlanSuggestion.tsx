import { Sparkles, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanSuggestionProps {
  explanation: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function PlanSuggestion({ explanation, onAccept, onDecline }: PlanSuggestionProps) {
  return (
    <div className="glass-primary rounded-2xl p-5 shadow-glass-md animate-scale-in glow-ring">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glass animate-glow-pulse">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-base">Piano suggerito</h3>
          <p className="text-xs text-muted-foreground">Generato dall'AI</p>
        </div>
      </div>
      
      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        {explanation}
      </p>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onDecline}
          className="flex-1 glass-subtle rounded-xl border-border/30 hover:shadow-glass transition-all"
        >
          <X className="w-4 h-4 mr-1.5" />
          Modifica
        </Button>
        <Button
          size="sm"
          onClick={onAccept}
          className="flex-1 gradient-primary text-white border-0 rounded-xl shadow-glass-md hover:shadow-glass-lg transition-all hover:scale-[1.02]"
        >
          <Check className="w-4 h-4 mr-1.5" />
          Accetta
        </Button>
      </div>
    </div>
  );
}
