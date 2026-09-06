import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface FillBlankProps {
  sentenceWithBlank: string;
  correctAnswer: string;
  onComplete: (correct: boolean) => void;
  isCompleted: boolean;
}

export function FillBlank({
  sentenceWithBlank, correctAnswer, onComplete, isCompleted,
}: FillBlankProps) {
  const [answer, setAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);

  const handleSubmit = () => {
    if (!answer.trim()) return;
    setShowResult(true);
    onComplete(answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim());
  };

  const isCorrect = answer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
  const parts = sentenceWithBlank.split("___");

  return (
    <div className="space-y-5">
      <div className="title-medium text-foreground leading-relaxed p-4 rounded-2xl bg-surface-container">
        {parts.map((part, index) => (
          <span key={index}>
            {part}
            {index < parts.length - 1 && (
              <span className="inline-block mx-1 align-middle">
                {showResult ? (
                  <span className={cn(
                    "inline-flex items-center gap-1 px-3 py-1 rounded-xl font-bold transition-all border",
                    isCorrect
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100 animate-feedback-correct"
                      : "border-rose-500/40 bg-rose-500/15 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100 animate-feedback-wrong"
                  )}>
                    {answer || "___"}
                    {isCorrect ? <CheckCircle2 className="w-4 h-4 inline" /> : <XCircle className="w-4 h-4 inline" />}
                  </span>
                ) : (
                  <Input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="inline-block w-36 h-9 mx-1 rounded-xl border-2 border-primary/30 focus:border-primary text-center font-semibold"
                    placeholder="..."
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    autoFocus
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
          className="w-full h-12 rounded-2xl"
        >
          <Send className="w-4 h-4 mr-2" />
          Verifica
        </Button>
      )}

      {showResult && !isCorrect && (
        <div className="p-4 rounded-2xl bg-surface-container-low text-center animate-fade-up border border-emerald-500/30">
          <p className="body-small text-muted-foreground mb-1">Risposta corretta:</p>
          <p className="title-medium text-emerald-700 dark:text-emerald-300 font-bold">{correctAnswer}</p>
        </div>
      )}
    </div>
  );
}
