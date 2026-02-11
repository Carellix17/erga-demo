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
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl glass-subtle">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex-1">
          <h2 className="text-lg font-heading font-semibold">Percorso di studio</h2>
          <p className="text-sm text-muted-foreground">
            {lessons.filter(l => l.is_generated).length} di {lessons.length} lezioni generate
          </p>
        </div>
        {onRegenerate && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="rounded-xl glass-subtle border-border/30 hover:shadow-glass transition-all duration-300"
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
      <div className="glass-card rounded-2xl p-4 mb-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glass">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Progresso totale</p>
            <p className="text-xs text-muted-foreground">
              {Math.round((lessons.filter(l => l.is_generated).length / lessons.length) * 100)}% completato
            </p>
          </div>
        </div>
        <div className="h-2 bg-muted/30 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className="h-full progress-animated rounded-full transition-all duration-500"
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
                "w-full p-4 rounded-2xl text-left transition-all duration-300",
                "flex items-center gap-3",
                isCurrent && "glass-primary border border-primary/20 shadow-glass-md",
                isCompleted && !isCurrent && "glass-subtle",
                !isCurrent && !isCompleted && "glass-subtle border border-border/20",
                isLocked && "opacity-50",
                !isGenerating && "hover:shadow-glass-md hover:translate-x-1"
              )}
            >
              {/* Status Icon */}
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 shadow-glass",
                isCompleted && "glass-success",
                isCurrent && "gradient-primary",
                !isCurrent && !isCompleted && "glass-subtle"
              )}>
                {isGenerating && isCurrent ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : isCurrent ? (
                  <span className="text-sm font-bold text-white">
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
                  "font-medium truncate",
                  isCurrent && "text-primary",
                  isCompleted && "text-foreground",
                  isLocked && "text-muted-foreground"
                )}>
                  {lesson.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {lesson.is_generated 
                    ? `${(lesson.exercises?.length || 0)} esercizi`
                    : "Da generare"}
                </p>
              </div>

              {/* Generated badge */}
              {lesson.is_generated && (
                <span className="text-xs px-2.5 py-1 rounded-full glass-success text-success font-medium">
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
            className="w-full p-4 rounded-2xl text-left transition-all duration-300 flex items-center gap-3 glass-card border border-primary/30 shadow-glass-md hover:shadow-glass-lg hover:scale-[1.01]"
          >
            <div className="w-9 h-9 rounded-xl gradient-warm flex items-center justify-center flex-shrink-0 shadow-glass">
              {isLoadingFinalTest ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Target className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground">Test Finale</p>
              <p className="text-xs text-muted-foreground">
                {isLoadingFinalTest ? "Generazione in corso..." : "Metti alla prova le tue conoscenze"}
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full gradient-warm text-white font-medium">
              Quiz
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
