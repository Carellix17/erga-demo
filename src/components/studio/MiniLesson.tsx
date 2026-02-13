import { useState } from "react";
import { ChevronRight, Clock, Lightbulb, BookOpen, Dumbbell, ChevronUp, Trophy, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExerciseRenderer, Exercise } from "./exercises/ExerciseRenderer";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

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
      <div className="m3-card-elevated rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <span className="title-small">
              Lezione {currentIndex + 1} di {totalLessons}
            </span>
          </div>
          <div className="flex items-center gap-1.5 label-medium text-muted-foreground bg-surface-container-highest px-3 py-1.5 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            <span>~{lesson.duration} min</span>
          </div>
        </div>
        <div className="h-1 m3-progress-track">
          <div 
            className="h-full m3-progress-indicator"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Concept Card */}
      <Card className="bg-primary-container border-0 shadow-level-0 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="label-large text-primary uppercase tracking-wide">
              Concetto chiave
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="title-large font-display text-foreground leading-relaxed prose prose-sm max-w-none">
            <ReactMarkdown>{lesson.concept}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {/* Lesson Content */}
      <Card className="border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-secondary-container flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-secondary" />
            </div>
            <span>{lesson.title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="body-large text-muted-foreground leading-relaxed prose prose-sm max-w-none prose-p:text-muted-foreground prose-strong:text-foreground prose-em:text-foreground/90">
            <ReactMarkdown>{lesson.explanation}</ReactMarkdown>
          </div>

          {/* Example */}
          {lesson.example && (
            <div className="p-5 rounded-xl bg-tertiary-container border-l-4 border-tertiary">
              <p className="label-large text-tertiary mb-2 flex items-center gap-2">
                <span className="text-lg">💡</span> Esempio pratico
              </p>
              <div className="body-large text-foreground leading-relaxed prose prose-sm max-w-none"><ReactMarkdown>{lesson.example}</ReactMarkdown></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercises Section */}
      {hasExercises && (
        <Card className="border-0 overflow-hidden">
          <CardHeader 
            className={cn(
              "cursor-pointer transition-all duration-300 ease-m3-standard",
              showExercises ? "bg-tertiary-container" : "hover:bg-foreground/[0.08]"
            )}
            onClick={() => !showExercises && handleStartExercises()}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300",
                  showExercises ? "bg-tertiary text-tertiary-foreground" : "bg-tertiary-container"
                )}>
                  <Dumbbell className={cn("w-5 h-5", !showExercises && "text-tertiary")} />
                </div>
                <div>
                  <span className="title-medium">Esercizi</span>
                  <span className="ml-2 body-small text-muted-foreground">({exercises.length})</span>
                </div>
              </div>
              {showExercises ? (
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              ) : (
                <span className="label-small px-3 py-1 rounded-full bg-tertiary-container text-tertiary">Inizia</span>
              )}
            </CardTitle>
          </CardHeader>

          {showExercises && (
            <CardContent className="space-y-5 pt-4">
              {/* Exercise Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between label-medium">
                  <span className="text-muted-foreground">
                    Esercizio {Math.min(currentExerciseIndex + 1, exercises.length)} di {exercises.length}
                  </span>
                  <span className="text-tertiary">
                    {correctCount}/{exerciseResults.length} corretti
                  </span>
                </div>
                <div className="h-1 m3-progress-track">
                  <div 
                    className="h-full rounded-full bg-tertiary transition-all duration-500"
                    style={{ width: `${exerciseProgress}%` }}
                  />
                </div>
              </div>

              {/* Current Exercise */}
              {!allExercisesCompleted && exercises[currentExerciseIndex] && (
                <div className="p-5 rounded-xl bg-surface-container-high">
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
                  "p-6 rounded-xl text-center space-y-4",
                  correctCount >= exercises.length * 0.7
                    ? "bg-success-container"
                    : "bg-tertiary-container"
                )}>
                  <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center animate-bounce-in shadow-level-2"
                    style={{ background: correctCount >= exercises.length * 0.7 ? "hsl(var(--success))" : "hsl(var(--warning))" }}
                  >
                    <Trophy className="w-8 h-8 text-white" />
                  </div>
                  <p className={cn(
                    "font-display font-bold text-xl",
                    correctCount >= exercises.length * 0.7 ? "text-success" : "text-warning"
                  )}>
                    {correctCount >= exercises.length * 0.7 
                      ? "Ottimo lavoro! 🎉" 
                      : "Continua così! 💪"}
                  </p>
                  <p className="body-medium text-muted-foreground">
                    Hai completato <span className="font-semibold">{correctCount}</span> esercizi su <span className="font-semibold">{exercises.length}</span> correttamente.
                  </p>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleStartExercises}
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
          className="w-full h-14"
          size="lg"
        >
          {isLastLesson ? "Completa corso 🎓" : "Prossima lezione"}
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      ) : !showExercises ? (
        <Button 
          onClick={handleStartExercises} 
          variant="tonal"
          className="w-full h-14 bg-tertiary-container text-tertiary hover:shadow-level-1"
          size="lg"
        >
          Inizia esercizi
          <Dumbbell className="w-5 h-5 ml-2" />
        </Button>
      ) : null}
    </div>
  );
}
