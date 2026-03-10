import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShortAnswerProps {
  question: string;
  expectedKeywords: string[];
  onComplete: (correct: boolean) => void;
  isCompleted: boolean;
}

export function ShortAnswer({
  question, expectedKeywords, onComplete, isCompleted,
}: ShortAnswerProps) {
  const [answer, setAnswer] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [matchedKeywords, setMatchedKeywords] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!answer.trim()) return;
    const lowerAnswer = answer.toLowerCase();
    const matched = expectedKeywords.filter(kw => lowerAnswer.includes(kw.toLowerCase()));
    setMatchedKeywords(matched);
    setShowResult(true);
    onComplete(matched.length >= Math.ceil(expectedKeywords.length / 2));
  };

  const matchRatio = matchedKeywords.length / expectedKeywords.length;
  const isGood = matchRatio >= 0.5;

  return (
    <div className="space-y-5">
      <p className="title-medium text-foreground">{question}</p>
      
      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Scrivi la tua risposta..."
        className="min-h-[100px] rounded-2xl border-2 border-outline-variant focus:border-primary"
        disabled={showResult}
      />

      {!showResult && (
        <Button onClick={handleSubmit} disabled={!answer.trim()} className="w-full h-12 rounded-2xl">
          <Send className="w-4 h-4 mr-2" />
          Verifica
        </Button>
      )}

      {showResult && (
        <div className="space-y-3 animate-fade-up">
          <div className={cn(
            "p-4 rounded-2xl font-medium flex items-center gap-2",
            isGood ? "bg-success-container text-success animate-feedback-correct" : "bg-warning/10 text-warning animate-feedback-wrong"
          )}>
            {isGood ? (
              <><CheckCircle2 className="w-5 h-5" /> Ottima risposta! 🎉</>
            ) : (
              <><AlertCircle className="w-5 h-5" /> Puoi fare di meglio! 💪</>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-surface-container-low">
            <p className="label-medium text-muted-foreground mb-2">Concetti chiave:</p>
            <div className="flex flex-wrap gap-2">
              {expectedKeywords.map((keyword, index) => (
                <span
                  key={index}
                  className={cn(
                    "px-3 py-1.5 rounded-full label-medium transition-all animate-option-pop",
                    matchedKeywords.includes(keyword)
                      ? "bg-success-container text-success"
                      : "bg-surface-container-highest text-muted-foreground"
                  )}
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  {matchedKeywords.includes(keyword) && "✓ "}{keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
