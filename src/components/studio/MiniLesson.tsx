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
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl glass-primary flex items-center justify-center shadow-glass">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <span className="font-heading font-semibold">
              Lezione {currentIndex + 1} di {totalLessons}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground glass-subtle px-3 py-1.5 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            <span>~{lesson.duration} min</span>
          </div>
        </div>
        <div className="h-2.5 bg-muted/30 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className="h-full progress-animated rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Concept Card - Glass effect */}
      <Card className="border-0 glass-primary shadow-glass-md overflow-hidden glow-ring">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-glass">
              <Lightbulb className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-primary uppercase tracking-wide">
              Concetto chiave
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-lg font-heading font-semibold text-foreground leading-relaxed prose prose-sm max-w-none">
            <ReactMarkdown>{lesson.concept}</ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {/* Lesson Content - Glass card */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 font-heading">
            <div className="w-11 h-11 rounded-xl glass-tertiary flex items-center justify-center shadow-glass">
              <BookOpen className="w-5 h-5 text-tertiary" />
            </div>
            <span className="text-xl">{lesson.title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="text-muted-foreground leading-relaxed text-[15px] prose prose-sm max-w-none prose-p:text-muted-foreground prose-strong:text-foreground prose-em:text-foreground/90">
            <ReactMarkdown>{lesson.explanation}</ReactMarkdown>
          </div>

          {/* Example - subtle glass accent */}
          {lesson.example && (
            <div className="p-5 rounded-2xl glass-accent border-l-4 border-accent">
              <p className="text-sm font-semibold text-accent mb-2 flex items-center gap-2">
                <span className="text-lg">💡</span> Esempio pratico
              </p>
              <div className="text-foreground leading-relaxed prose prose-sm max-w-none"><ReactMarkdown>{lesson.example}</ReactMarkdown></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercises Section */}
      {hasExercises && (
        <Card className="glass-card border-0 overflow-hidden">
          <CardHeader 
            className={cn(
              "cursor-pointer transition-all duration-300",
              showExercises ? "glass-accent" : "hover:bg-muted/20"
            )}
            onClick={() => !showExercises && handleStartExercises()}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 shadow-glass",
                  showExercises ? "gradient-warm text-white" : "glass-accent"
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
                <div className="chip-accent glass-accent text-xs">Inizia</div>
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
                <div className="h-2 bg-muted/30 rounded-full overflow-hidden backdrop-blur-sm">
                  <div 
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${exerciseProgress}%` }}
                  />
                </div>
              </div>

              {/* Current Exercise */}
              {!allExercisesCompleted && exercises[currentExerciseIndex] && (
                <div className="p-5 rounded-2xl glass-subtle border border-border/30">
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
                    ? "glass-success"
                    : "glass-accent"
                )}>
                  <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center animate-bounce-in shadow-glass-lg"
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
                    className="mt-2 glass-subtle rounded-xl"
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
          className="w-full h-14 text-base font-semibold gradient-primary text-white border-0 rounded-2xl shadow-glass-lg hover:shadow-glass-xl transition-all duration-300 hover:scale-[1.02] active:scale-100 glow-ring" 
          size="lg"
        >
          {isLastLesson ? "Completa corso 🎓" : "Prossima lezione"}
          <ChevronRight className="w-5 h-5 ml-1" />
        </Button>
      ) : !showExercises ? (
        <Button 
          onClick={handleStartExercises} 
          className="w-full h-14 text-base font-semibold gradient-warm text-white border-0 rounded-2xl shadow-glass-lg hover:shadow-glass-xl transition-all duration-300 hover:scale-[1.02] active:scale-100" 
          size="lg"
        >
          Inizia esercizi
          <Dumbbell className="w-5 h-5 ml-2" />
        </Button>
      ) : null}
    </div>
  );
}
