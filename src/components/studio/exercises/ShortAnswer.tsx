import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortAnswerProps {
  question: string;
  expectedKeywords: string[];
  onComplete: (correct: boolean) => void;
  isCompleted: boolean;
}

export function ShortAnswer({
  question,
  expectedKeywords,
  onComplete,
  isCompleted,
}: ShortAnswerProps) {
  const [answer, setAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!answer.trim()) return;
    
    const lowerAnswer = answer.toLowerCase();
    const matched = expectedKeywords.filter(keyword => 
      lowerAnswer.includes(keyword.toLowerCase())
    );
    
    setMatchedKeywords(matched);
    setShowResult(true);
    
    // Consider correct if at least half of keywords are matched
    const isCorrect = matched.length >= Math.ceil(expectedKeywords.length / 2);
    onComplete(isCorrect);
  };

  const matchRatio = matchedKeywords.length / expectedKeywords.length;
  const isGood = matchRatio >= 0.5;

  return (
    <div className="space-y-4">
      <p className="font-medium text-foreground">{question}</p>
      
      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Scrivi la tua risposta..."
        className="min-h-[100px]"
        disabled={showResult}
      />

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
        <div className="space-y-3">
          <div className={cn(
            "p-3 rounded-xl font-medium flex items-center gap-2",
            isGood 
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          )}>
            {isGood ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Ottima risposta! Hai menzionato i concetti chiave.
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5" />
                Buon tentativo! Prova a includere più concetti chiave.
              </>
            )}
          </div>

          <div className="p-3 rounded-xl bg-secondary">
            <p className="text-sm text-muted-foreground mb-2">
              Concetti chiave da menzionare:
            </p>
            <div className="flex flex-wrap gap-2">
              {expectedKeywords.map((keyword, index) => (
                <span
                  key={index}
                  className={cn(
                    "px-2 py-1 rounded-full text-sm",
                    matchedKeywords.includes(keyword)
                      ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
