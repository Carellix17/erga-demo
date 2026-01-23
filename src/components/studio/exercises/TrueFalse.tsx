import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrueFalseProps {
  statement: string;
  correct: boolean;
  onComplete: (correct: boolean) => void;
  isCompleted: boolean;
}

export function TrueFalse({
  statement,
  correct,
  onComplete,
  isCompleted,
}: TrueFalseProps) {
  const [selected, setSelected] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (value: boolean) => {
    if (showResult) return;
    setSelected(value);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    setShowResult(true);
    onComplete(selected === correct);
  };

  const isCorrect = selected === correct;

  return (
    <div className="space-y-4">
      <p className="font-medium text-foreground">{statement}</p>
      
      <div className="flex gap-3">
        <button
          onClick={() => handleSelect(true)}
          disabled={showResult}
          className={cn(
            "flex-1 p-4 rounded-xl border-2 font-medium transition-all",
            selected === true && !showResult && "border-primary bg-primary/10",
            selected !== true && !showResult && "border-border hover:border-primary/50",
            showResult && correct === true && "border-green-500 bg-green-50 dark:bg-green-900/20",
            showResult && selected === true && correct !== true && "border-red-500 bg-red-50 dark:bg-red-900/20"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <span className={cn(
              showResult && correct === true && "text-green-700 dark:text-green-400",
              showResult && selected === true && correct !== true && "text-red-700 dark:text-red-400"
            )}>
              Vero
            </span>
            {showResult && correct === true && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            {showResult && selected === true && correct !== true && <XCircle className="w-5 h-5 text-red-500" />}
          </div>
        </button>

        <button
          onClick={() => handleSelect(false)}
          disabled={showResult}
          className={cn(
            "flex-1 p-4 rounded-xl border-2 font-medium transition-all",
            selected === false && !showResult && "border-primary bg-primary/10",
            selected !== false && !showResult && "border-border hover:border-primary/50",
            showResult && correct === false && "border-green-500 bg-green-50 dark:bg-green-900/20",
            showResult && selected === false && correct !== false && "border-red-500 bg-red-50 dark:bg-red-900/20"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <span className={cn(
              showResult && correct === false && "text-green-700 dark:text-green-400",
              showResult && selected === false && correct !== false && "text-red-700 dark:text-red-400"
            )}>
              Falso
            </span>
            {showResult && correct === false && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            {showResult && selected === false && correct !== false && <XCircle className="w-5 h-5 text-red-500" />}
          </div>
        </button>
      </div>

      {!showResult && (
        <Button 
          onClick={handleSubmit} 
          disabled={selected === null}
          className="w-full"
        >
          Verifica
        </Button>
      )}

      {showResult && (
        <div className={cn(
          "p-3 rounded-xl text-center font-medium",
          isCorrect ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        )}>
          {isCorrect ? "Corretto! 🎉" : `Non esatto. L'affermazione è ${correct ? "vera" : "falsa"}.`}
        </div>
      )}
    </div>
  );
}
