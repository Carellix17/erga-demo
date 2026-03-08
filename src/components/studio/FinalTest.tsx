import { useState, useCallback } from "react";
import { X, ChevronRight, Trophy, Target, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExerciseRenderer, Exercise } from "./exercises/ExerciseRenderer";
import { cn } from "@/lib/utils";
import { fireCelebration } from "@/lib/confetti";

interface FinalTestProps {
  exercises: Exercise[];
  onClose: () => void;
  onComplete: () => void;
}

export function FinalTest({ exercises, onClose, onComplete }: FinalTestProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [answered, setAnswered] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const total = exercises.length;
  const progress = showResults ? 100 : ((currentIndex + 1) / (total + 1)) * 100;

  const handleAnswer = useCallback((correct: boolean) => {
    setResults((prev) => ({ ...prev, [currentIndex]: correct }));
    setAnswered(true);
  }, [currentIndex]);

  const handleContinue = useCallback(() => {
    if (showResults) {
      onComplete();
      return;
    }
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
      setAnswered(false);
    } else {
      setShowResults(true);
    }
  }, [currentIndex, total, showResults, onComplete]);

  const correctCount = Object.values(results).filter(Boolean).length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const great = score >= 70;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Top bar */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 safe-area-top">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="flex-1 h-1 m3-progress-track">
            <div
              className="h-full m3-progress-indicator"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="label-medium text-muted-foreground whitespace-nowrap">
            {showResults ? "Risultati" : `${currentIndex + 1}/${total}`}
          </span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <p className="body-small text-muted-foreground text-center">
            <span className="text-foreground title-small">Test Finale</span> · Verifica le tue conoscenze
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col">
        <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full" key={showResults ? "results" : currentIndex}>
          <div className="animate-fade-up">
            {showResults ? (
              <ResultsView score={score} correctCount={correctCount} total={total} great={great} />
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-tertiary flex items-center justify-center">
                      <Award className="w-5 h-5 text-tertiary-foreground" />
                    </div>
                    <div>
                      <span className="label-large uppercase tracking-wide text-muted-foreground">
                        Domanda
                      </span>
                      <p className="body-small text-muted-foreground">
                        {currentIndex + 1} di {total}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-surface-container-high">
                  <ExerciseRenderer
                    exercise={exercises[currentIndex]}
                    onComplete={handleAnswer}
                    isCompleted={answered}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex-shrink-0 p-4 pb-8 mb-20 safe-area-bottom">
        <Button
          onClick={handleContinue}
          disabled={!showResults && !answered}
          className={cn(
            "w-full h-14 transition-all duration-300 ease-m3-emphasized",
            !(showResults || answered) && "bg-surface-container-highest text-muted-foreground shadow-level-0"
          )}
          size="lg"
        >
          {showResults ? "Chiudi" : currentIndex === total - 1 ? "Vedi risultati" : "Continua"}
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function ResultsView({ score, correctCount, total, great }: { score: number; correctCount: number; total: number; great: boolean }) {
  return (
    <div className="text-center space-y-8">
      <div
        className="w-24 h-24 rounded-full mx-auto flex items-center justify-center animate-bounce-in shadow-level-3"
        style={{ background: great ? "hsl(var(--success))" : "hsl(var(--warning))" }}
      >
        <Trophy className="w-12 h-12 text-white" />
      </div>

      <div>
        <p className="text-5xl font-display font-bold mb-2" style={{ color: great ? "hsl(var(--success))" : "hsl(var(--warning))" }}>
          {score}%
        </p>
        <p className={cn("font-display font-bold text-2xl mb-2", great ? "text-success" : "text-warning")}>
          {great ? "Ottimo risultato! 🎉" : "Puoi migliorare! 💪"}
        </p>
        <p className="body-medium text-muted-foreground">
          Hai risposto correttamente a{" "}
          <span className="font-semibold">{correctCount}</span> domande su{" "}
          <span className="font-semibold">{total}</span>.
        </p>
      </div>

      <p className="body-small text-muted-foreground">
        {great
          ? "Hai dimostrato un'ottima padronanza degli argomenti!"
          : "Rivedi le lezioni e riprova il test per migliorare."}
      </p>
    </div>
  );
}
