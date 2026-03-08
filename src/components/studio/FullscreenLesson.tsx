import { useState, useCallback, useMemo, useEffect } from "react";
import { X, ChevronRight, Lightbulb, BookOpen, Dumbbell, Trophy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExerciseRenderer, Exercise } from "./exercises/ExerciseRenderer";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { fireCelebration, fireStarBurst } from "@/lib/confetti";

interface ExplanationPart {
  part_title: string;
  content: string;
}

interface FullscreenLessonProps {
  lesson: {
    id: string;
    title: string;
    concept: string;
    explanation: string;
    example?: string;
    exercises?: Exercise[];
    duration: number;
  };
  lessonNumber: number;
  totalLessons: number;
  onClose: () => void;
  onComplete: () => void;
  isLastLesson: boolean;
}

type StepType = "concept" | "explanation_part" | "example" | "exercise" | "summary";

interface Step {
  type: StepType;
  exerciseIndex?: number;
  explanationPartIndex?: number;
}

function parseExplanationParts(explanation: string): ExplanationPart[] {
  // Try parsing as JSON array of parts
  try {
    const parsed = JSON.parse(explanation);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].part_title) {
      return parsed;
    }
  } catch { /* not JSON */ }

  // Fallback: split by bullet points or paragraphs
  const lines = explanation.split(/\n/).filter(l => l.trim());
  if (lines.length <= 1) {
    return [{ part_title: "Spiegazione", content: explanation }];
  }
  
  // Group bullet points into parts
  const parts: ExplanationPart[] = [];
  let currentContent = "";
  let partIndex = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*")) {
      if (currentContent) {
        parts.push({ part_title: `Parte ${partIndex + 1}`, content: currentContent.trim() });
        partIndex++;
      }
      currentContent = trimmed.replace(/^[•\-*]\s*/, "");
    } else {
      currentContent += (currentContent ? "\n" : "") + trimmed;
    }
  }
  if (currentContent) {
    parts.push({ part_title: `Parte ${partIndex + 1}`, content: currentContent.trim() });
  }
  
  return parts.length > 0 ? parts : [{ part_title: "Spiegazione", content: explanation }];
}

function buildSteps(lesson: FullscreenLessonProps["lesson"], explanationParts: ExplanationPart[]): Step[] {
  const steps: Step[] = [{ type: "concept" }];
  
  explanationParts.forEach((_, i) => {
    steps.push({ type: "explanation_part", explanationPartIndex: i });
  });
  
  if (lesson.example) {
    steps.push({ type: "example" });
  }
  const exercises = lesson.exercises || [];
  exercises.forEach((_, i) => {
    steps.push({ type: "exercise", exerciseIndex: i });
  });
  if (exercises.length > 0) {
    steps.push({ type: "summary" });
  }
  return steps;
}

export function FullscreenLesson({
  lesson,
  lessonNumber,
  totalLessons,
  onClose,
  onComplete,
  isLastLesson,
}: FullscreenLessonProps) {
  const explanationParts = useMemo(() => parseExplanationParts(lesson.explanation), [lesson.explanation]);
  const steps = useMemo(() => buildSteps(lesson, explanationParts), [lesson, explanationParts]);
  const [currentStep, setCurrentStep] = useState(0);
  const [exerciseResults, setExerciseResults] = useState<Record<number, boolean>>({});
  const [currentExerciseAnswered, setCurrentExerciseAnswered] = useState(false);

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const exercises = lesson.exercises || [];

  const handleContinue = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
      setCurrentExerciseAnswered(false);
    } else {
      onComplete();
    }
  }, [currentStep, steps.length, onComplete]);

  const handleExerciseComplete = useCallback(
    (correct: boolean) => {
      if (step.exerciseIndex !== undefined) {
        setExerciseResults((prev) => ({ ...prev, [step.exerciseIndex!]: correct }));
        setCurrentExerciseAnswered(true);
      }
    },
    [step]
  );

  const correctCount = Object.values(exerciseResults).filter(Boolean).length;
  const canContinue = step.type !== "exercise" || currentExerciseAnswered;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Top bar */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 safe-area-top">
        <div className="flex items-center gap-3 mb-3">
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
          <div className="flex-1 h-1 m3-progress-track">
            <div className="h-full m3-progress-indicator" style={{ width: `${progress}%` }} />
          </div>
          <span className="label-medium text-muted-foreground whitespace-nowrap">
            {currentStep + 1}/{steps.length}
          </span>
        </div>
        <p className="body-small text-muted-foreground text-center">
          Lezione {lessonNumber} di {totalLessons} · <span className="text-foreground title-small">{lesson.title}</span>
        </p>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col">
        <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full" key={currentStep}>
          <div className="animate-fade-up">
            {step.type === "concept" && <ConceptStep concept={lesson.concept} />}
            {step.type === "explanation_part" && step.explanationPartIndex !== undefined && (
              <ExplanationPartStep
                part={explanationParts[step.explanationPartIndex]}
                partNumber={step.explanationPartIndex + 1}
                totalParts={explanationParts.length}
              />
            )}
            {step.type === "example" && lesson.example && <ExampleStep example={lesson.example} />}
            {step.type === "exercise" && step.exerciseIndex !== undefined && exercises[step.exerciseIndex] && (
              <ExerciseStep
                exercise={exercises[step.exerciseIndex]}
                exerciseNumber={step.exerciseIndex + 1}
                totalExercises={exercises.length}
                onComplete={handleExerciseComplete}
                isCompleted={currentExerciseAnswered}
              />
            )}
            {step.type === "summary" && (
              <SummaryStep correctCount={correctCount} totalExercises={exercises.length} isLastLesson={isLastLesson} />
            )}
          </div>
        </div>
      </div>

      {/* Bottom action */}
      <div className="flex-shrink-0 p-4 pb-8 mb-20 safe-area-bottom">
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          className={cn(
            "w-full h-14 transition-all duration-300 ease-m3-emphasized",
            !canContinue && "bg-surface-container-highest text-muted-foreground shadow-level-0"
          )}
          size="lg"
        >
          {currentStep === steps.length - 1
            ? isLastLesson ? "Completa corso 🎓" : "Prossima lezione"
            : "Continua"}
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      </div>
    </div>
  );
}

/* ── Step Components ── */

function ConceptStep({ concept }: { concept: string }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto shadow-level-2">
        <Lightbulb className="w-8 h-8 text-primary-foreground" />
      </div>
      <div>
        <p className="label-large text-primary uppercase tracking-wide mb-3">Concetto chiave</p>
        <div className="title-large font-display leading-relaxed prose prose-sm max-w-none mx-auto">
          <ReactMarkdown>{concept}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function ExplanationPartStep({ part, partNumber, totalParts }: { part: ExplanationPart; partNumber: number; totalParts: number }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-full bg-secondary-container flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-secondary" />
        </div>
        <div>
          <span className="label-large text-muted-foreground uppercase tracking-wide">Spiegazione</span>
          <p className="body-small text-muted-foreground">{partNumber} di {totalParts}</p>
        </div>
      </div>
      <div className="p-5 rounded-xl bg-surface-container">
        <h3 className="title-medium font-display font-semibold mb-3 text-foreground">{part.part_title}</h3>
        <div className="body-large text-muted-foreground leading-relaxed prose prose-sm max-w-none prose-p:text-muted-foreground prose-strong:text-foreground prose-em:text-foreground/90">
          <ReactMarkdown>{part.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function ExampleStep({ example }: { example: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">💡</span>
        <span className="label-large text-tertiary uppercase tracking-wide">Esempio pratico</span>
      </div>
      <div className="p-5 rounded-xl bg-tertiary-container border-l-4 border-tertiary">
        <div className="body-large text-foreground leading-relaxed prose prose-sm max-w-none">
          <ReactMarkdown>{example}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function ExerciseStep({
  exercise, exerciseNumber, totalExercises, onComplete, isCompleted,
}: {
  exercise: Exercise; exerciseNumber: number; totalExercises: number;
  onComplete: (correct: boolean) => void; isCompleted: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-tertiary flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-tertiary-foreground" />
          </div>
          <div>
            <span className="label-large uppercase tracking-wide text-muted-foreground">Esercizio</span>
            <p className="body-small text-muted-foreground">{exerciseNumber} di {totalExercises}</p>
          </div>
        </div>
      </div>
      <div className="p-5 rounded-xl bg-surface-container-high">
        <ExerciseRenderer exercise={exercise} onComplete={onComplete} isCompleted={isCompleted} />
      </div>
    </div>
  );
}

function SummaryStep({ correctCount, totalExercises, isLastLesson }: { correctCount: number; totalExercises: number; isLastLesson: boolean }) {
  const great = correctCount >= totalExercises * 0.7;
  return (
    <div className="text-center space-y-6">
      <div
        className="w-20 h-20 rounded-full mx-auto flex items-center justify-center animate-bounce-in shadow-level-3"
        style={{ background: great ? "hsl(var(--success))" : "hsl(var(--warning))" }}
      >
        {great ? <Trophy className="w-10 h-10 text-white" /> : <CheckCircle2 className="w-10 h-10 text-white" />}
      </div>
      <div>
        <p className={cn("font-display font-bold text-2xl mb-2", great ? "text-success" : "text-warning")}>
          {great ? "Ottimo lavoro! 🎉" : "Continua così! 💪"}
        </p>
        <p className="body-medium text-muted-foreground">
          Hai risposto correttamente a <span className="font-semibold">{correctCount}</span> esercizi su <span className="font-semibold">{totalExercises}</span>.
        </p>
      </div>
      <p className="body-small text-muted-foreground">
        {isLastLesson ? "Premi per completare il corso!" : "Premi per passare alla prossima lezione."}
      </p>
    </div>
  );
}
