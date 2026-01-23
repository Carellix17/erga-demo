import { useState } from "react";
import { ChevronRight, Clock, Lightbulb, BookOpen, Dumbbell, ChevronDown, ChevronUp } from "lucide-react";
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

    // Move to next exercise after a short delay
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
    <div className="space-y-4 animate-fade-up">
      {/* Progress Header */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Lezione {currentIndex + 1} di {totalLessons}
          </span>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>~{lesson.duration} min</span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Concept Card */}
      <Card className="border-0 bg-primary/10">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-primary">
            <Lightbulb className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wide">
              Concetto chiave
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold text-foreground">
            {lesson.concept}
          </p>
        </CardContent>
      </Card>

      {/* Lesson Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {lesson.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {lesson.explanation}
          </p>

          {/* Example */}
          {lesson.example && (
            <div className="p-4 rounded-xl bg-secondary border-l-4 border-primary">
              <p className="text-sm font-medium text-primary mb-1">Esempio</p>
              <p className="text-foreground">{lesson.example}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercises Section */}
      {hasExercises && (
        <Card>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => !showExercises && handleStartExercises()}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-primary" />
                Esercizi ({exercises.length})
              </div>
              {showExercises ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-5 h-5 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>

          {showExercises && (
            <CardContent className="space-y-4">
              {/* Exercise Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Esercizio {Math.min(currentExerciseIndex + 1, exercises.length)} di {exercises.length}
                  </span>
                  <span className="font-medium text-primary">
                    {correctCount}/{exerciseResults.length} corretti
                  </span>
                </div>
                <Progress value={exerciseProgress} className="h-2" />
              </div>

              {/* Current Exercise */}
              {!allExercisesCompleted && exercises[currentExerciseIndex] && (
                <div className="p-4 rounded-xl bg-secondary/50">
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
                  "p-6 rounded-xl text-center space-y-3",
                  correctCount >= exercises.length * 0.7
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-amber-100 dark:bg-amber-900/30"
                )}>
                  <div className="text-4xl">
                    {correctCount >= exercises.length * 0.7 ? "🎉" : "💪"}
                  </div>
                  <p className={cn(
                    "font-semibold text-lg",
                    correctCount >= exercises.length * 0.7
                      ? "text-green-700 dark:text-green-400"
                      : "text-amber-700 dark:text-amber-400"
                  )}>
                    {correctCount >= exercises.length * 0.7 
                      ? "Ottimo lavoro!" 
                      : "Continua così!"}
                  </p>
                  <p className="text-muted-foreground">
                    Hai completato {correctCount} esercizi su {exercises.length} correttamente.
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
        <Button onClick={onNext} className="w-full" size="lg">
          {isLastLesson ? "Completa corso" : "Prossima lezione"}
          <ChevronRight className="w-5 h-5" />
        </Button>
      ) : !showExercises ? (
        <Button onClick={handleStartExercises} className="w-full" size="lg">
          Inizia esercizi
          <Dumbbell className="w-5 h-5 ml-2" />
        </Button>
      ) : null}
    </div>
  );
}
