import { useState, useEffect } from "react";
import { Loader2, Sparkles, Check, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerationProgressProps {
  isGenerating: boolean;
  totalLessons: number;
  generatedCount: number;
  currentStep: "analyzing" | "creating-index" | "generating-lessons" | "complete";
  fileName?: string;
}

const steps = [
  { id: "analyzing", label: "Analisi contenuti", icon: Sparkles },
  { id: "creating-index", label: "Creazione indice", icon: BookOpen },
  { id: "generating-lessons", label: "Generazione lezioni", icon: Loader2 },
  { id: "complete", label: "Completato!", icon: Check },
];

export function GenerationProgress({
  isGenerating,
  totalLessons,
  generatedCount,
  currentStep,
  fileName,
}: GenerationProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const stepProgress = {
    "analyzing": 10,
    "creating-index": 25,
    "generating-lessons": 25 + ((generatedCount / Math.max(totalLessons, 1)) * 70),
    "complete": 100,
  };

  const targetProgress = stepProgress[currentStep] || 0;

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimatedProgress((prev) => {
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 0.5) return targetProgress;
        return prev + diff * 0.1;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [targetProgress]);

  if (!isGenerating && currentStep !== "complete") return null;

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="m3-card-elevated rounded-xl p-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-level-2">
          <Sparkles className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h3 className="title-medium font-display">
            {currentStep === "complete" ? "Percorso pronto!" : "Generazione in corso"}
          </h3>
          {fileName && (
            <p className="body-small text-muted-foreground truncate max-w-[200px]">
              {fileName}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between label-medium mb-2">
          <span className="text-muted-foreground">Progresso</span>
          <span className="text-primary">{Math.round(animatedProgress)}%</span>
        </div>
        <div className="h-1 m3-progress-track">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              currentStep === "complete" ? "bg-success" : "m3-progress-indicator"
            )}
            style={{ width: `${animatedProgress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isComplete = index < currentStepIndex || currentStep === "complete";
          const isPending = index > currentStepIndex;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ease-m3-standard",
                isActive && "bg-primary-container",
                isComplete && step.id !== "complete" && "bg-success-container",
                isPending && "opacity-38"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                  isActive && "bg-primary text-primary-foreground",
                  isComplete && step.id !== "complete" && "bg-success text-success-foreground",
                  currentStep === "complete" && step.id === "complete" && "bg-success text-success-foreground",
                  isPending && "bg-surface-container-highest text-muted-foreground"
                )}
              >
                {isComplete && step.id !== "complete" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Icon className={cn("w-4 h-4", isActive && step.id === "generating-lessons" && "animate-spin")} />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={cn(
                    "label-large transition-colors duration-300",
                    isActive && "text-primary",
                    isComplete && step.id !== "complete" && "text-success",
                    currentStep === "complete" && step.id === "complete" && "text-success"
                  )}
                >
                  {step.label}
                </p>
                {isActive && step.id === "generating-lessons" && totalLessons > 0 && (
                  <p className="body-small text-muted-foreground">
                    {generatedCount} / {totalLessons} lezioni create
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fun message */}
      {currentStep !== "complete" && (
        <p className="text-center body-small text-muted-foreground mt-6 italic">
          L'AI sta creando il tuo percorso personalizzato... ✨
        </p>
      )}
    </div>
  );
}
