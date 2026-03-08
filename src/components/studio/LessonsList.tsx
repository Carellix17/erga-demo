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
  const progress = Math.round((lessons.filter(l => l.is_generated).length / lessons.length) * 100);

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

      {/* Progress overview — colorful gradient card */}
      <div className="rounded-3xl p-5 mb-5 shadow-level-2 gradient-cool text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/5" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="title-small text-white">Progresso totale</p>
              <p className="body-small text-white/75">{progress}% completato</p>
            </div>
            <span className="text-2xl font-display font-bold text-white/90">{progress}%</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-500 ease-m3-emphasized"
              style={{ width: `${progress}%` }}
            />
          </div>
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
                "w-full p-4 rounded-3xl text-left transition-all duration-400 ease-m3-emphasized",
                "flex items-center gap-3.5 state-layer active:scale-[0.97]",
                isCurrent && "bg-primary-container shadow-level-1",
                isCompleted && !isCurrent && "bg-surface-container-low",
                !isCurrent && !isCompleted && "bg-surface-container-low",
                isLocked && "opacity-38",
                !isGenerating && "hover:shadow-level-1 hover:scale-[1.01]"
              )}
            >
              {/* Status Icon */}
              <div className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-400 ease-m3-emphasized",
                isCompleted && "bg-success text-white",
                isCurrent && "gradient-primary text-white",
                !isCurrent && !isCompleted && "bg-surface-container-highest"
              )}>
                {isGenerating && isCurrent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : isCurrent ? (
                  <span className="label-large">{index + 1}</span>
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
                  isCurrent && "text-primary font-semibold",
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
                <span className="label-small px-3 py-1.5 rounded-full bg-success/10 text-success font-semibold">
                  ✓ Pronta
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Final Test Button — warm gradient */}
      {showFinalTest && onStartFinalTest && (
        <div className="mt-6">
          <button
            onClick={onStartFinalTest}
            disabled={isLoadingFinalTest}
            className="w-full p-4 rounded-3xl text-left transition-all duration-400 ease-m3-emphasized flex items-center gap-3.5 gradient-warm text-white shadow-level-2 hover:shadow-level-3 hover:scale-[1.01] active:scale-[0.97] relative overflow-hidden"
          >
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              {isLoadingFinalTest ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Target className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="title-small text-white font-semibold">Test Finale</p>
              <p className="body-small text-white/75">
                {isLoadingFinalTest ? "Generazione in corso..." : "Metti alla prova le tue conoscenze"}
              </p>
            </div>
            <span className="label-small px-3 py-1.5 rounded-full bg-white/20 text-white font-semibold">
              🎯 Quiz
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
