import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FillBlankProps {
  sentenceWithBlank: string;
  correctAnswer: string;
  onComplete: (correct: boolean) => void;
  isCompleted: boolean;
}

export function FillBlank({
  sentenceWithBlank,
  correctAnswer,
  onComplete,
  isCompleted,
}: FillBlankProps) {
  const [answer, setAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);

  const handleSubmit = () => {
    if (!answer.trim()) return;
    setShowResult(true);
    const isCorrect = answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    onComplete(isCorrect);
  };

  const isCorrect = answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

  // Split sentence by ___ to show input inline
  const parts = sentenceWithBlank.split("___");

  return (
    <div className="space-y-4">
      <div className="font-medium text-foreground leading-relaxed">
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < parts.length - 1 && (
              <span className="inline-block mx-1">
                {showResult ? (
                  <span className={cn(
                    "px-2 py-1 rounded font-semibold",
                    isCorrect 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  )}>
                    {answer || "___"}
                  </span>
                ) : (
                  <Input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="inline-block w-32 h-8 mx-1"
                    placeholder="..."
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                )}
              </span>
            )}
          </span>
        ))}
      </div>

      {!showResult && (
        <Button 
          onClick={handleSubmit} 
          disabled={!answer.trim()}
          className="w-full"
        >
          Verifica
        </Button>
      )}

      {showResult && (
        <div className={cn(
          "p-3 rounded-xl text-center font-medium flex items-center justify-center gap-2",
          isCorrect ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        )}>
          {isCorrect ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Corretto! 🎉
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5" />
              La risposta corretta è: <strong>{correctAnswer}</strong>
            </>
          )}
        </div>
      )}
    </div>
  );
}
