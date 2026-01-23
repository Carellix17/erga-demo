import { Sparkles, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PlanSuggestionProps {
  explanation: string;
  onAccept: () => void;
  onDecline: () => void;
}

export function PlanSuggestion({ explanation, onAccept, onDecline }: PlanSuggestionProps) {
  return (
    <Card className="border-2 border-primary/30 bg-primary/5 animate-scale-in">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <CardTitle className="text-base">Piano suggerito</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {explanation}
        </p>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDecline}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-1" />
            Modifica
          </Button>
          <Button
            size="sm"
            onClick={onAccept}
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-1" />
            Accetta
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
