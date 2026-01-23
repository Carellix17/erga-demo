import { ChevronLeft, CheckCircle2, Circle, Lock, Loader2 } from "lucide-react";
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
}

export function LessonsList({
  lessons,
  currentIndex,
  onSelectLesson,
  onBack,
  isGenerating,
}: LessonsListProps) {
  return (
    <div className="p-4 pb-24 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Percorso di studio</h2>
          <p className="text-sm text-muted-foreground">
            {lessons.filter(l => l.is_generated).length} di {lessons.length} lezioni generate
          </p>
        </div>
      </div>

      {/* Lessons List */}
      <div className="space-y-2">
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
                "w-full p-4 rounded-xl text-left transition-all",
                "flex items-center gap-3",
                isCurrent && "bg-primary/10 border-2 border-primary",
                isCompleted && !isCurrent && "bg-secondary",
                !isCurrent && !isCompleted && "bg-card border border-border",
                isLocked && "opacity-60",
                !isGenerating && "hover:shadow-md"
              )}
            >
              {/* Status Icon */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                isCompleted && "bg-green-100 dark:bg-green-900/30",
                isCurrent && "bg-primary",
                !isCurrent && !isCompleted && "bg-muted"
              )}>
                {isGenerating && isCurrent ? (
                  <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : isCurrent ? (
                  <span className="text-sm font-bold text-primary-foreground">
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
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Pronta
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
