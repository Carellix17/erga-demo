import { useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrueFalseProps {
  statement: string;
  correct: boolean;
  onComplete: (correct: boolean) => void;
  isCompleted: boolean;
}

export function TrueFalse({
  statement, correct, onComplete, isCompleted,
}: TrueFalseProps) {
  const [selected, setSelected] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (value: boolean) => {
    if (showResult) return;
    setSelected(value);
    setTimeout(() => {
      setShowResult(true);
      onComplete(value === correct);
    }, 300);
  };

  const isCorrect = selected === correct;

  return (
    <div className="space-y-5">
      <p className="title-medium text-foreground leading-relaxed">{statement}</p>
      
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((value) => {
          const isSelected = selected === value;
          const isCorrectOption = value === correct;
          
          return (
            <button
              key={String(value)}
              onClick={() => handleSelect(value)}
              disabled={showResult}
              className={cn(
                "p-5 rounded-2xl border-2 font-semibold transition-all duration-300 ease-m3-emphasized flex flex-col items-center gap-2",
                !showResult && !isSelected && "border-outline-variant bg-surface-container-lowest hover:border-primary/50 active:scale-[0.95]",
                !showResult && isSelected && "border-primary bg-primary/10 scale-[1.03] shadow-level-1",
                showResult && isCorrectOption && "border-success bg-success-container animate-feedback-correct",
                showResult && isSelected && !isCorrectOption && "border-destructive bg-destructive/10 animate-feedback-wrong",
                showResult && !isSelected && !isCorrectOption && "opacity-40",
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                !showResult && "bg-surface-container-highest",
                showResult && isCorrectOption && "bg-success",
                showResult && isSelected && !isCorrectOption && "bg-destructive",
              )}>
                {value ? (
                  <Check className={cn("w-6 h-6", showResult && isCorrectOption ? "text-white" : showResult && isSelected && !isCorrectOption ? "text-white" : "text-success")} />
                ) : (
                  <X className={cn("w-6 h-6", showResult && isCorrectOption ? "text-white" : showResult && isSelected && !isCorrectOption ? "text-white" : "text-destructive")} />
                )}
              </div>
              <span className={cn(
                "title-medium",
                showResult && isCorrectOption && "text-success",
                showResult && isSelected && !isCorrectOption && "text-destructive",
              )}>
                {value ? "Vero" : "Falso"}
              </span>
            </button>
          );
        })}
      </div>

      {showResult && (
        <div className={cn(
          "p-4 rounded-2xl text-center font-medium animate-fade-up",
          isCorrect ? "bg-success-container text-success" : "bg-destructive/10 text-destructive"
        )}>
          {isCorrect ? "Esatto! 🎉" : `L'affermazione è ${correct ? "vera" : "falsa"}.`}
        </div>
      )}
    </div>
  );
}
