import { ChevronLeft, CheckCircle2, Circle, Lock, Loader2, Sparkles, RefreshCw, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Exercise } from "./exercises/ExerciseRenderer";

interface Lesson {
  id: string;
  title: string;
  is_generated: boolean;
  lesson_order: number;
  concept?: string;
  explanation?: string;
  example?: string;
  exercises?: Exercise[];
}

interface LessonsListProps {
  lessons: Lesson[];
  currentIndex: number;
  onSelectLesson: (index: number) => void;
  onBack: () => void;
  isGenerating: boolean;
  showBackButton?: boolean;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  showFinalTest?: boolean;
  onStartFinalTest?: () => void;
  isLoadingFinalTest?: boolean;
}

export function LessonsList({
  lessons,
  currentIndex,
  onSelectLesson,
  onBack,
  isGenerating,
  showBackButton = true,
  onRegenerate,
  isRegenerating,
  showFinalTest,
  onStartFinalTest,
  isLoadingFinalTest,
}: LessonsListProps) {
  return (
    <div className="p-4 pb-24 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {showBackButton && (
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex-1">
          <h2 className="title-large font-display">Percorso di studio</h2>
          <p className="body-small text-muted-foreground">
            {lessons.filter(l => l.is_generated).length} di {lessons.length} lezioni generate
          </p>
        </div>
        {onRegenerate && (
          <Button
            variant="outline"
            size="icon-sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Progress overview */}
      <div className="m3-card-elevated rounded-3xl p-5 mb-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shadow-level-1">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <p className="title-small">Progresso totale</p>
            <p className="body-small text-muted-foreground">
              {Math.round((lessons.filter(l => l.is_generated).length / lessons.length) * 100)}% completato
            </p>
          </div>
        </div>
        <div className="h-1 m3-progress-track">
          <div 
            className="h-full m3-progress-indicator"
            style={{ width: `${(lessons.filter(l => l.is_generated).length / lessons.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Lessons List */}
      <div className="space-y-2.5">
        {lessons.map((lesson, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLocked = !lesson.is_generated && index > currentIndex;

          return (
            <button
              key={lesson.id}
              onClick={() => !isGenerating && onSelectLesson(index)}
              disabled={isGenerating}
              className={cn(
                "w-full p-4 rounded-xl text-left transition-all duration-300 ease-m3-emphasized",
                "flex items-center gap-3 state-layer",
                isCurrent && "bg-primary-container",
                isCompleted && !isCurrent && "bg-surface-container-low",
                !isCurrent && !isCompleted && "bg-surface-container-low",
                isLocked && "opacity-38",
                !isGenerating && "hover:shadow-level-1"
              )}
            >
              {/* Status Icon */}
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
                isCompleted && "bg-success-container",
                isCurrent && "bg-primary",
                !isCurrent && !isCompleted && "bg-surface-container-highest"
              )}>
                {isGenerating && isCurrent ? (
                  <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : isCurrent ? (
                  <span className="label-large text-primary-foreground">
                    {index + 1}
                  </span>
                ) : isLocked ? (
                  <Lock className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground" />
                )}
              </div>

              {/* Lesson Info */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "title-small truncate",
                  isCurrent && "text-primary",
                  isCompleted && "text-foreground",
                  isLocked && "text-muted-foreground"
                )}>
                  {lesson.title}
                </p>
                <p className="body-small text-muted-foreground">
                  {lesson.is_generated 
                    ? `${(lesson.exercises?.length || 0)} esercizi`
                    : "Da generare"}
                </p>
              </div>

              {/* Generated badge */}
              {lesson.is_generated && (
                <span className="label-small px-3 py-1 rounded-full bg-success-container text-success">
                  Pronta
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Final Test Button */}
      {showFinalTest && onStartFinalTest && (
        <div className="mt-6">
          <button
            onClick={onStartFinalTest}
            disabled={isLoadingFinalTest}
            className="w-full p-4 rounded-xl text-left transition-all duration-300 ease-m3-emphasized flex items-center gap-3 bg-tertiary-container shadow-level-1 hover:shadow-level-2 state-layer"
          >
            <div className="w-10 h-10 rounded-full bg-tertiary flex items-center justify-center flex-shrink-0">
              {isLoadingFinalTest ? (
                <Loader2 className="w-5 h-5 text-tertiary-foreground animate-spin" />
              ) : (
                <Target className="w-5 h-5 text-tertiary-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="title-small text-foreground">Test Finale</p>
              <p className="body-small text-muted-foreground">
                {isLoadingFinalTest ? "Generazione in corso..." : "Metti alla prova le tue conoscenze"}
              </p>
            </div>
            <span className="label-small px-3 py-1 rounded-full bg-tertiary text-tertiary-foreground">
              Quiz
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
