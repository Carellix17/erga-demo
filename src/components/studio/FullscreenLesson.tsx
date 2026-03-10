import { useState, useCallback, useMemo, useRef } from "react";
import { X, ChevronRight, Lightbulb, BookOpen, Dumbbell, Trophy, CheckCircle2, Zap, Star } from "lucide-react";
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
  try {
    const parsed = JSON.parse(explanation);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].part_title) {
      return parsed;
    }
  } catch { /* not JSON */ }

  const lines = explanation.split(/\n/).filter(l => l.trim());
  if (lines.length <= 1) {
    return [{ part_title: "Spiegazione", content: explanation }];
  }
  
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
  if (lesson.example) steps.push({ type: "example" });
  const exercises = lesson.exercises || [];
  exercises.forEach((_, i) => {
    steps.push({ type: "exercise", exerciseIndex: i });
  });
  if (exercises.length > 0) steps.push({ type: "summary" });
  return steps;
}

export function FullscreenLesson({
  lesson, lessonNumber, totalLessons, onClose, onComplete, isLastLesson,
}: FullscreenLessonProps) {
  const explanationParts = useMemo(() => parseExplanationParts(lesson.explanation), [lesson.explanation]);
  const steps = useMemo(() => buildSteps(lesson, explanationParts), [lesson, explanationParts]);
  const [currentStep, setCurrentStep] = useState(0);
  const [exerciseResults, setExerciseResults] = useState<Record<number, boolean>>({});
  const [currentExerciseAnswered, setCurrentExerciseAnswered] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [showXpFloat, setShowXpFloat] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const exercises = lesson.exercises || [];

  const gainXp = useCallback((amount: number) => {
    setXpGained(prev => prev + amount);
    setShowXpFloat(true);
    setTimeout(() => setShowXpFloat(false), 800);
  }, []);

  const handleContinue = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    if (currentStep < steps.length - 1) {
      const nextStep = steps[currentStep + 1];
      if (nextStep.type === "summary") fireStarBurst();
      
      // Animate out, then in
      setTimeout(() => {
        setCurrentStep(s => s + 1);
        setCurrentExerciseAnswered(false);
        setIsAnimating(false);
      }, 250);
    } else {
      fireCelebration();
      onComplete();
    }
  }, [currentStep, steps, onComplete, isAnimating]);

  const handleExerciseComplete = useCallback(
    (correct: boolean) => {
      if (step.exerciseIndex !== undefined) {
        setExerciseResults(prev => ({ ...prev, [step.exerciseIndex!]: correct }));
        setCurrentExerciseAnswered(true);
        if (correct) gainXp(10);
      }
    },
    [step, gainXp]
  );

  const correctCount = Object.values(exerciseResults).filter(Boolean).length;
  const canContinue = step.type !== "exercise" || currentExerciseAnswered;

  // Segment the progress bar
  const segments = steps.length;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Top bar */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2 safe-area-top">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="rounded-full -ml-1">
            <X className="w-5 h-5" />
          </Button>
          
          {/* Segmented progress bar */}
          <div className="flex-1 flex gap-0.5 h-2">
            {Array.from({ length: segments }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 rounded-full transition-all duration-500 ease-m3-emphasized",
                  i < currentStep
                    ? "bg-primary"
                    : i === currentStep
                    ? "bg-primary animate-progress-glow"
                    : "bg-surface-container-highest"
                )}
              />
            ))}
          </div>

          {/* XP counter */}
          <div className="relative flex items-center gap-1 label-medium text-warning bg-warning/10 px-2.5 py-1 rounded-full">
            <Zap className="w-3.5 h-3.5" />
            <span>{xpGained}</span>
            {showXpFloat && (
              <span className="absolute -top-2 right-0 text-xs font-bold text-warning animate-xp-float">
                +10
              </span>
            )}
          </div>
        </div>
        <p className="body-small text-muted-foreground text-center">
          Lezione {lessonNumber} di {totalLessons} · <span className="text-foreground title-small">{lesson.title}</span>
        </p>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col" ref={contentRef}>
        <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
          <div key={currentStep} className={cn("animate-lesson-in", isAnimating && "animate-lesson-out")}>
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
              <SummaryStep correctCount={correctCount} totalExercises={exercises.length} isLastLesson={isLastLesson} xpGained={xpGained} />
            )}
          </div>
        </div>
      </div>

      {/* Bottom action */}
      <div className="flex-shrink-0 p-4 pb-8 safe-area-bottom">
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          className={cn(
            "w-full h-14 rounded-2xl text-base font-semibold transition-all duration-300 ease-m3-emphasized",
            canContinue
              ? "shadow-level-2 hover:shadow-level-3 active:scale-[0.97]"
              : "bg-surface-container-highest text-muted-foreground shadow-level-0"
          )}
          size="lg"
        >
          {currentStep === steps.length - 1
            ? isLastLesson ? "Completa corso 🎓" : "Prossima lezione"
            : step.type === "exercise" && !currentExerciseAnswered
            ? "Rispondi per continuare"
            : "Continua"}
          {(canContinue || step.type !== "exercise") && <ChevronRight className="w-5 h-5 ml-1" />}
        </Button>
      </div>
    </div>
  );
}

/* ── Step Components ── */

function ConceptStep({ concept }: { concept: string }) {
  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto shadow-level-3 animate-bounce-in">
        <Lightbulb className="w-10 h-10 text-primary-foreground" />
      </div>
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary label-medium mb-4">
          <Star className="w-3.5 h-3.5" />
          Concetto chiave
        </div>
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
        <div className="w-12 h-12 rounded-2xl bg-secondary-container flex items-center justify-center shadow-level-1">
          <BookOpen className="w-6 h-6 text-secondary" />
        </div>
        <div className="flex-1">
          <span className="label-large text-foreground">{part.part_title}</span>
          <div className="flex items-center gap-2 mt-0.5">
            {Array.from({ length: totalParts }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 rounded-full flex-1 transition-all duration-300",
                  i < partNumber ? "bg-secondary" : "bg-surface-container-highest"
                )}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="p-5 rounded-2xl bg-surface-container-low shadow-level-1">
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
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-tertiary-container flex items-center justify-center shadow-level-1">
          <span className="text-2xl">💡</span>
        </div>
        <span className="label-large text-foreground">Esempio pratico</span>
      </div>
      <div className="p-5 rounded-2xl bg-tertiary-container/50 border-l-4 border-tertiary shadow-level-1">
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
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-level-2">
            <Dumbbell className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <span className="label-large text-foreground">Esercizio {exerciseNumber}</span>
            <p className="body-small text-muted-foreground">{exerciseNumber} di {totalExercises}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalExercises }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all",
                i < exerciseNumber - 1 ? "bg-success" : i === exerciseNumber - 1 ? "bg-primary scale-125" : "bg-surface-container-highest"
              )}
            />
          ))}
        </div>
      </div>
      <div className="p-5 rounded-2xl bg-surface-container-low shadow-level-1">
        <ExerciseRenderer exercise={exercise} onComplete={onComplete} isCompleted={isCompleted} />
      </div>
    </div>
  );
}

function SummaryStep({ correctCount, totalExercises, isLastLesson, xpGained }: { correctCount: number; totalExercises: number; isLastLesson: boolean; xpGained: number }) {
  const great = correctCount >= totalExercises * 0.7;
  const percentage = totalExercises > 0 ? Math.round((correctCount / totalExercises) * 100) : 0;
  
  return (
    <div className="text-center space-y-6">
      <div
        className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center animate-bounce-in shadow-level-4"
        style={{ background: great ? "hsl(var(--success))" : "hsl(var(--warning))" }}
      >
        {great ? <Trophy className="w-12 h-12 text-white" /> : <CheckCircle2 className="w-12 h-12 text-white" />}
      </div>
      
      <div>
        <p className={cn("font-display font-bold text-3xl mb-2", great ? "text-success" : "text-warning")}>
          {great ? "Fantastico! 🎉" : "Quasi! 💪"}
        </p>
        <p className="body-large text-muted-foreground">
          {percentage}% corretto — {correctCount}/{totalExercises} esercizi
        </p>
      </div>

      {/* Stats cards */}
      <div className="flex gap-3 justify-center">
        <div className="flex flex-col items-center p-4 rounded-2xl bg-primary-container min-w-[90px] animate-option-pop animate-stagger-1">
          <Zap className="w-5 h-5 text-primary mb-1" />
          <span className="title-medium font-bold text-primary">{xpGained}</span>
          <span className="label-small text-muted-foreground">XP</span>
        </div>
        <div className="flex flex-col items-center p-4 rounded-2xl bg-success-container min-w-[90px] animate-option-pop animate-stagger-2">
          <CheckCircle2 className="w-5 h-5 text-success mb-1" />
          <span className="title-medium font-bold text-success">{correctCount}</span>
          <span className="label-small text-muted-foreground">Corretti</span>
        </div>
        <div className="flex flex-col items-center p-4 rounded-2xl bg-secondary-container min-w-[90px] animate-option-pop animate-stagger-3">
          <Star className="w-5 h-5 text-secondary mb-1" />
          <span className="title-medium font-bold text-secondary">{percentage}%</span>
          <span className="label-small text-muted-foreground">Precisione</span>
        </div>
      </div>

      <p className="body-small text-muted-foreground">
        {isLastLesson ? "Premi per completare il corso!" : "Premi per passare alla prossima lezione."}
      </p>
    </div>
  );
}
