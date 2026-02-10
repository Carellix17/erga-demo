import { useState, useCallback } from "react";
import { X, ChevronRight, Lightbulb, BookOpen, Dumbbell, Trophy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExerciseRenderer, Exercise } from "./exercises/ExerciseRenderer";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

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

type StepType = "concept" | "explanation" | "example" | "exercise" | "summary";

interface Step {
  type: StepType;
  exerciseIndex?: number;
}

function buildSteps(lesson: FullscreenLessonProps["lesson"]): Step[] {
  const steps: Step[] = [
    { type: "concept" },
    { type: "explanation" },
  ];
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
  const steps = buildSteps(lesson);
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
  const totalAnswered = Object.keys(exerciseResults).length;

  // Can continue?
  const canContinue = step.type !== "exercise" || currentExerciseAnswered;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Top bar */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 safe-area-top">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="rounded-xl glass-subtle"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="flex-1 h-2.5 bg-muted/30 rounded-full overflow-hidden">
            <div
              className="h-full progress-animated rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
            {currentStep + 1}/{steps.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Lezione {lessonNumber} di {totalLessons} · <span className="text-foreground font-medium">{lesson.title}</span>
        </p>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col">
        <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full" key={currentStep}>
          <div className="animate-fade-up">
            {step.type === "concept" && (
              <ConceptStep concept={lesson.concept} />
            )}
            {step.type === "explanation" && (
              <ExplanationStep explanation={lesson.explanation} />
            )}
            {step.type === "example" && lesson.example && (
              <ExampleStep example={lesson.example} />
            )}
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
              <SummaryStep
                correctCount={correctCount}
                totalExercises={exercises.length}
                isLastLesson={isLastLesson}
              />
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
            "w-full h-14 text-base font-semibold border-0 rounded-2xl shadow-glass-lg transition-all duration-300",
            canContinue
              ? "gradient-primary text-white hover:shadow-glass-xl hover:scale-[1.02] active:scale-100 glow-ring"
              : "bg-muted text-muted-foreground"
          )}
          size="lg"
        >
          {currentStep === steps.length - 1
            ? isLastLesson
              ? "Completa corso 🎓"
              : "Prossima lezione"
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
      <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-glass-lg">
        <Lightbulb className="w-8 h-8 text-white" />
      </div>
      <div>
        <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">
          Concetto chiave
        </p>
        <div className="text-xl font-heading font-semibold leading-relaxed prose prose-sm max-w-none mx-auto">
          <ReactMarkdown>{concept}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function ExplanationStep({ explanation }: { explanation: string }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-xl glass-tertiary flex items-center justify-center shadow-glass">
          <BookOpen className="w-5 h-5 text-tertiary" />
        </div>
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Spiegazione
        </span>
      </div>
      <div className="text-muted-foreground leading-relaxed text-[15px] prose prose-sm max-w-none prose-p:text-muted-foreground prose-strong:text-foreground prose-em:text-foreground/90">
        <ReactMarkdown>{explanation}</ReactMarkdown>
      </div>
    </div>
  );
}

function ExampleStep({ example }: { example: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">💡</span>
        <span className="text-sm font-semibold text-accent uppercase tracking-wide">
          Esempio pratico
        </span>
      </div>
      <div className="p-5 rounded-2xl glass-accent border-l-4 border-accent">
        <div className="text-foreground leading-relaxed prose prose-sm max-w-none">
          <ReactMarkdown>{example}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function ExerciseStep({
  exercise,
  exerciseNumber,
  totalExercises,
  onComplete,
  isCompleted,
}: {
  exercise: Exercise;
  exerciseNumber: number;
  totalExercises: number;
  onComplete: (correct: boolean) => void;
  isCompleted: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl gradient-warm flex items-center justify-center shadow-glass">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Esercizio
            </span>
            <p className="text-xs text-muted-foreground">
              {exerciseNumber} di {totalExercises}
            </p>
          </div>
        </div>
      </div>
      <div className="p-5 rounded-2xl glass-subtle border border-border/30">
        <ExerciseRenderer
          exercise={exercise}
          onComplete={onComplete}
          isCompleted={isCompleted}
        />
      </div>
    </div>
  );
}

function SummaryStep({
  correctCount,
  totalExercises,
  isLastLesson,
}: {
  correctCount: number;
  totalExercises: number;
  isLastLesson: boolean;
}) {
  const great = correctCount >= totalExercises * 0.7;
  return (
    <div className="text-center space-y-6">
      <div
        className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center animate-bounce-in shadow-glass-lg"
        style={{
          background: great ? "hsl(var(--success))" : "hsl(var(--warning))",
        }}
      >
        {great ? (
          <Trophy className="w-10 h-10 text-white" />
        ) : (
          <CheckCircle2 className="w-10 h-10 text-white" />
        )}
      </div>
      <div>
        <p
          className={cn(
            "font-heading font-bold text-2xl mb-2",
            great ? "text-success" : "text-warning"
          )}
        >
          {great ? "Ottimo lavoro! 🎉" : "Continua così! 💪"}
        </p>
        <p className="text-muted-foreground">
          Hai risposto correttamente a{" "}
          <span className="font-semibold">{correctCount}</span> esercizi su{" "}
          <span className="font-semibold">{totalExercises}</span>.
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        {isLastLesson
          ? "Premi per completare il corso!"
          : "Premi per passare alla prossima lezione."}
      </p>
    </div>
  );
}
