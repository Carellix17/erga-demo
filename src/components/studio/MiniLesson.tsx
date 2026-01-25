import { useState } from "react";
import { ChevronRight, Clock, Lightbulb, BookOpen, Dumbbell, ChevronDown, ChevronUp, Trophy, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ExerciseRenderer, Exercise } from "./exercises/ExerciseRenderer";
import { cn } from "@/lib/utils";

interface MiniLessonProps {
  lesson: {
    id: string;
    title: string;
    concept: string;
    explanation: string;
    example?: string;
    exercises?: Exercise[];
    duration: number;
  };
  progress: number;
  totalLessons: number;
  currentIndex: number;
  onNext: () => void;
  isLastLesson: boolean;
}

export function MiniLesson({
  lesson,
  progress,
  totalLessons,
  currentIndex,
  onNext,
  isLastLesson,
}: MiniLessonProps) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseResults, setExerciseResults] = useState<boolean[]>([]);
  const [showExercises, setShowExercises] = useState(false);
  const [allExercisesCompleted, setAllExercisesCompleted] = useState(false);

  const exercises = lesson.exercises || [];
  const hasExercises = exercises.length > 0;

  const handleExerciseComplete = (correct: boolean) => {
    const newResults = [...exerciseResults, correct];
    setExerciseResults(newResults);

    setTimeout(() => {
      if (currentExerciseIndex < exercises.length - 1) {
        setCurrentExerciseIndex(currentExerciseIndex + 1);
      } else {
        setAllExercisesCompleted(true);
      }
    }, 1500);
  };

  const correctCount = exerciseResults.filter(r => r).length;
  const exerciseProgress = exercises.length > 0 ? (exerciseResults.length / exercises.length) * 100 : 0;

  const handleStartExercises = () => {
    setShowExercises(true);
    setCurrentExerciseIndex(0);
    setExerciseResults([]);
    setAllExercisesCompleted(false);
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Progress Header */}
      <div className="bg-card rounded-2xl p-4 shadow-soft-sm border border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <span className="font-heading font-semibold">
              Lezione {currentIndex + 1} di {totalLessons}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            <span>~{lesson.duration} min</span>
          </div>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full progress-animated rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Concept Card */}
      <Card className="border-0 bg-gradient-to-br from-primary/15 to-tertiary/10 shadow-soft-md overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-primary uppercase tracking-wide">
              Concetto chiave
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-heading font-semibold text-foreground leading-relaxed">
            {lesson.concept}
          </p>
        </CardContent>
      </Card>

      {/* Lesson Content */}
      <Card className="shadow-soft-md border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 font-heading">
            <div className="w-10 h-10 rounded-xl bg-tertiary/15 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-tertiary" />
            </div>
            <span className="text-xl">{lesson.title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-muted-foreground leading-relaxed text-[15px]">
            {lesson.explanation}
          </p>

          {/* Example */}
          {lesson.example && (
            <div className="p-5 rounded-2xl bg-secondary/70 border-l-4 border-accent">
              <p className="text-sm font-semibold text-accent mb-2 flex items-center gap-2">
                <span className="text-lg">💡</span> Esempio pratico
              </p>
              <p className="text-foreground leading-relaxed">{lesson.example}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercises Section */}
      {hasExercises && (
        <Card className="shadow-soft-md border-border/50 overflow-hidden">
          <CardHeader 
            className={cn(
              "cursor-pointer transition-colors",
              showExercises ? "bg-accent/10" : "hover:bg-muted/50"
            )}
            onClick={() => !showExercises && handleStartExercises()}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                  showExercises ? "bg-accent text-accent-foreground" : "bg-accent/15"
                )}>
                  <Dumbbell className={cn("w-5 h-5", !showExercises && "text-accent")} />
                </div>
                <div>
                  <span className="font-heading text-lg">Esercizi</span>
                  <span className="ml-2 text-sm text-muted-foreground">({exercises.length})</span>
                </div>
              </div>
              {showExercises ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <div className="chip-accent text-xs">Inizia</div>
              )}
            </CardTitle>
          </CardHeader>

          {showExercises && (
            <CardContent className="space-y-5 pt-4">
              {/* Exercise Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Esercizio {Math.min(currentExerciseIndex + 1, exercises.length)} di {exercises.length}
                  </span>
                  <span className="font-semibold text-accent">
                    {correctCount}/{exerciseResults.length} corretti
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${exerciseProgress}%` }}
                  />
                </div>
              </div>

              {/* Current Exercise */}
              {!allExercisesCompleted && exercises[currentExerciseIndex] && (
                <div className="p-5 rounded-2xl bg-muted/50 border border-border/50">
                  <ExerciseRenderer
                    exercise={exercises[currentExerciseIndex]}
                    onComplete={handleExerciseComplete}
                    isCompleted={exerciseResults.length > currentExerciseIndex}
                  />
                </div>
              )}

              {/* Completion Summary */}
              {allExercisesCompleted && (
                <div className={cn(
                  "p-6 rounded-2xl text-center space-y-4",
                  correctCount >= exercises.length * 0.7
                    ? "bg-success/15"
                    : "bg-warning/15"
                )}>
                  <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center animate-bounce-in"
                    style={{ background: correctCount >= exercises.length * 0.7 ? "hsl(var(--success))" : "hsl(var(--warning))" }}
                  >
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <p className={cn(
                    "font-heading font-bold text-xl",
                    correctCount >= exercises.length * 0.7 ? "text-success" : "text-warning"
                  )}>
                    {correctCount >= exercises.length * 0.7 
                      ? "Ottimo lavoro! 🎉" 
                      : "Continua così! 💪"}
                  </p>
                  <p className="text-muted-foreground">
                    Hai completato <span className="font-semibold">{correctCount}</span> esercizi su <span className="font-semibold">{exercises.length}</span> correttamente.
                  </p>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleStartExercises}
                    className="mt-2"
                  >
                    Ripeti esercizi
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Next Button */}
      {!hasExercises || allExercisesCompleted ? (
        <Button 
          onClick={onNext} 
          className="w-full h-14 text-base font-semibold gradient-primary text-white border-0 shadow-soft-md hover:shadow-soft-lg transition-all" 
          size="lg"
        >
          {isLastLesson ? "Completa corso 🎓" : "Prossima lezione"}
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      ) : !showExercises ? (
        <Button 
          onClick={handleStartExercises} 
          className="w-full h-14 text-base font-semibold bg-accent hover:bg-accent/90 text-accent-foreground shadow-soft-md hover:shadow-soft-lg transition-all" 
          size="lg"
        >
          Inizia esercizi
          <Dumbbell className="w-5 h-5 ml-2" />
        </Button>
      ) : null}
    </div>
  );
}
