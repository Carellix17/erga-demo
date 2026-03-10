import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultipleChoiceProps {
  question: string;
  options: string[];
  correctIndex: number;
  onComplete: (correct: boolean) => void;
  isCompleted: boolean;
}

export function MultipleChoice({
  question, options, correctIndex, onComplete, isCompleted,
}: MultipleChoiceProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelectedIndex(index);
    // Auto-submit on tap like Duolingo
    setTimeout(() => {
      setShowResult(true);
      onComplete(index === correctIndex);
    }, 300);
  };

  const isCorrect = selectedIndex === correctIndex;

  return (
    <div className="space-y-5">
      <p className="title-medium text-foreground">{question}</p>
      
      <div className="space-y-2.5">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          const isCorrectOption = index === correctIndex;
          
          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={showResult}
              className={cn(
                "w-full p-4 text-left rounded-2xl border-2 transition-all duration-300 ease-m3-emphasized animate-option-pop",
                // Default
                !showResult && !isSelected && "border-outline-variant bg-surface-container-lowest hover:border-primary/50 hover:bg-primary/5 active:scale-[0.97]",
                // Selected pre-submit
                !showResult && isSelected && "border-primary bg-primary/10 scale-[1.02] shadow-level-1",
                // Correct answer revealed
                showResult && isCorrectOption && "border-success bg-success-container animate-feedback-correct",
                // Wrong answer selected
                showResult && isSelected && !isCorrectOption && "border-destructive bg-destructive/10 animate-feedback-wrong",
                // Other options after submit
                showResult && !isSelected && !isCorrectOption && "border-outline-variant opacity-40"
              )}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all",
                  !showResult && !isSelected && "bg-surface-container-highest text-muted-foreground",
                  !showResult && isSelected && "bg-primary text-primary-foreground",
                  showResult && isCorrectOption && "bg-success text-white",
                  showResult && isSelected && !isCorrectOption && "bg-destructive text-white",
                )}>
                  {showResult && isCorrectOption ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : showResult && isSelected && !isCorrectOption ? (
                    <XCircle className="w-5 h-5" />
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </div>
                <span className={cn(
                  "body-large flex-1",
                  showResult && isCorrectOption && "text-success font-medium",
                  showResult && isSelected && !isCorrectOption && "text-destructive",
                )}>
                  {option}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {showResult && (
        <div className={cn(
          "p-4 rounded-2xl text-center font-medium flex items-center justify-center gap-2 animate-fade-up",
          isCorrect ? "bg-success-container text-success" : "bg-destructive/10 text-destructive"
        )}>
          {isCorrect ? "Perfetto! 🎉" : "La risposta corretta è evidenziata sopra."}
        </div>
      )}
    </div>
  );
}
