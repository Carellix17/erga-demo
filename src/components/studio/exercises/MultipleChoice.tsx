import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  question,
  options,
  correctIndex,
  onComplete,
  isCompleted,
}: MultipleChoiceProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelectedIndex(index);
  };

  const handleSubmit = () => {
    if (selectedIndex === null) return;
    setShowResult(true);
    onComplete(selectedIndex === correctIndex);
  };

  const isCorrect = selectedIndex === correctIndex;

  return (
    <div className="space-y-4">
      <p className="font-medium text-foreground">{question}</p>
      
      <div className="space-y-2">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={showResult}
            className={cn(
              "w-full p-3 text-left rounded-xl border-2 transition-all",
              selectedIndex === index && !showResult && "border-primary bg-primary/10",
              selectedIndex !== index && !showResult && "border-border hover:border-primary/50",
              showResult && index === correctIndex && "border-green-500 bg-green-50 dark:bg-green-900/20",
              showResult && selectedIndex === index && index !== correctIndex && "border-red-500 bg-red-50 dark:bg-red-900/20",
              showResult && selectedIndex !== index && index !== correctIndex && "border-border opacity-50"
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn(
                showResult && index === correctIndex && "text-green-700 dark:text-green-400",
                showResult && selectedIndex === index && index !== correctIndex && "text-red-700 dark:text-red-400"
              )}>
                {option}
              </span>
              {showResult && index === correctIndex && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              {showResult && selectedIndex === index && index !== correctIndex && (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
          </button>
        ))}
      </div>

      {!showResult && (
        <Button 
          onClick={handleSubmit} 
          disabled={selectedIndex === null}
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
          {isCorrect ? "Corretto! 🎉" : "Non esatto. La risposta corretta è evidenziata."}
        </div>
      )}
    </div>
  );
}
