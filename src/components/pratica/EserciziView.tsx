import { useState, useEffect, useCallback } from "react";
import { BookOpen, Dumbbell, RefreshCw, CheckCircle2, XCircle, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface Course {
  id: string;
  file_name: string;
}

type ExerciseType = "multiple_choice" | "true_false" | "fill_blank" | "short_answer" | "matching" | "ordering";

interface Exercise {
  type: ExerciseType;
  question: string;
  options?: string[];
  pairs?: { left: string; right: string }[];
  items?: string[];
  correctAnswer: string | string[];
  explanation: string;
}

interface ExerciseResult {
  exercise: Exercise;
  userAnswer: string | string[];
  isCorrect: boolean;
}

export function EserciziView() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [matchAnswers, setMatchAnswers] = useState<Record<string, string>>({});
  const [orderAnswers, setOrderAnswers] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  // Load courses
  useEffect(() => {
    const loadCourses = async () => {
      if (!currentUser) return;
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ userId: currentUser, action: "listContexts" }),
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data.contexts || []);
      }
    };
    loadCourses();
  }, [currentUser]);

  const generateExercises = useCallback(async (courseId: string) => {
    setIsLoading(true);
    setSelectedCourse(courseId);
    setExercises([]);
    setCurrentIndex(0);
    setResults([]);
    setIsFinished(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ userId: currentUser, contextId: courseId }),
      });
      if (!response.ok) throw new Error("Errore nella generazione");
      const data = await response.json();
      setExercises(data.exercises || []);
    } catch {
      toast({ title: "Errore", description: "Non riesco a generare gli esercizi", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  const currentExercise = exercises[currentIndex];

  const checkAnswer = () => {
    if (!currentExercise) return;

    let isCorrect = false;
    let answer: string | string[] = userAnswer;

    if (currentExercise.type === "multiple_choice" || currentExercise.type === "true_false") {
      isCorrect = userAnswer === currentExercise.correctAnswer;
    } else if (currentExercise.type === "fill_blank" || currentExercise.type === "short_answer") {
      const correct = Array.isArray(currentExercise.correctAnswer)
        ? currentExercise.correctAnswer[0] : currentExercise.correctAnswer;
      isCorrect = userAnswer.trim().toLowerCase() === correct.toLowerCase();
    } else if (currentExercise.type === "matching") {
      const correctPairs = currentExercise.pairs || [];
      isCorrect = correctPairs.every(p => matchAnswers[p.left] === p.right);
      answer = Object.entries(matchAnswers).map(([k, v]) => `${k}→${v}`);
    } else if (currentExercise.type === "ordering") {
      const correct = currentExercise.correctAnswer as string[];
      isCorrect = JSON.stringify(orderAnswers) === JSON.stringify(correct);
      answer = orderAnswers;
    }

    setResults(prev => [...prev, { exercise: currentExercise, userAnswer: answer, isCorrect }]);
    setShowResult(true);
  };

  const nextExercise = () => {
    setShowResult(false);
    setUserAnswer("");
    setMatchAnswers({});
    setOrderAnswers([]);
    if (currentIndex + 1 < exercises.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  const correctCount = results.filter(r => r.isCorrect).length;

  // Course selection
  if (!selectedCourse || exercises.length === 0) {
    return (
      <div className="flex flex-col h-full px-4 py-4 space-y-5 overflow-y-auto">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <Dumbbell className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">Esercizi Mirati</h2>
          <p className="body-medium text-muted-foreground">Allenati con esercizi generati dai tuoi materiali</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="body-medium text-muted-foreground">Genero gli esercizi...</p>
          </div>
        ) : courses.length === 0 ? (
          <p className="text-center text-muted-foreground body-medium">Nessun corso disponibile.</p>
        ) : (
          <div className="space-y-2">
            <p className="label-large text-foreground">Scegli il corso:</p>
            {courses.map(course => (
              <button
                key={course.id}
                onClick={() => generateExercises(course.id)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border bg-surface-container border-outline-variant/30 hover:bg-surface-container-high transition-all active:scale-[0.98]"
              >
                <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="label-large text-foreground truncate">
                  {course.file_name.replace(/^🌐\s*/, "").replace(/\.pdf$/i, "")}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Finished summary
  if (isFinished) {
    const pct = Math.round((correctCount / results.length) * 100);
    return (
      <div className="flex flex-col h-full px-4 py-6 items-center justify-center space-y-6">
        <div className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center",
          pct >= 70 ? "bg-success-container" : pct >= 50 ? "bg-warning/10" : "bg-error-container"
        )}>
          <span className="font-display text-3xl font-bold">
            {pct}%
          </span>
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-display text-xl font-bold text-foreground">
            {pct >= 70 ? "Ottimo lavoro! 🎉" : pct >= 50 ? "Buon inizio! 💪" : "Continua a studiare! 📚"}
          </h3>
          <p className="body-medium text-muted-foreground">
            {correctCount}/{results.length} risposte corrette
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setSelectedCourse(null); setExercises([]); }} className="rounded-full">
            Cambia corso
          </Button>
          <Button onClick={() => generateExercises(selectedCourse!)} className="rounded-full bg-primary text-primary-foreground">
            <RefreshCw className="w-4 h-4 mr-2" /> Nuovi esercizi
          </Button>
        </div>
      </div>
    );
  }

  // Exercise view
  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="label-small text-muted-foreground">
            Esercizio {currentIndex + 1}/{exercises.length}
          </span>
          <span className="label-small text-success">
            {correctCount} corrette
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-container overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${((currentIndex + (showResult ? 1 : 0)) / exercises.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Exercise content */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full label-small bg-tertiary-container text-tertiary">
            {currentExercise.type === "multiple_choice" ? "Scelta multipla" :
             currentExercise.type === "true_false" ? "Vero o Falso" :
             currentExercise.type === "fill_blank" ? "Completa" :
             currentExercise.type === "short_answer" ? "Risposta breve" :
             currentExercise.type === "matching" ? "Abbinamento" :
             "Ordinamento"}
          </span>
        </div>

        {/* Question */}
        <div className="body-large text-foreground font-medium">
          <ReactMarkdown>{currentExercise.question}</ReactMarkdown>
        </div>

        {/* Answer input based on type */}
        {!showResult && (
          <div className="space-y-2">
            {(currentExercise.type === "multiple_choice" || currentExercise.type === "true_false") && (
              <div className="space-y-2">
                {(currentExercise.options || []).map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setUserAnswer(opt)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all duration-200",
                      userAnswer === opt
                        ? "bg-primary-container border-primary/30 shadow-level-1"
                        : "bg-surface-container border-outline-variant/30 hover:bg-surface-container-high"
                    )}
                  >
                    <span className="body-medium">{opt}</span>
                  </button>
                ))}
              </div>
            )}

            {(currentExercise.type === "fill_blank" || currentExercise.type === "short_answer") && (
              <input
                type="text"
                value={userAnswer}
                onChange={e => setUserAnswer(e.target.value)}
                placeholder="Scrivi la tua risposta..."
                className="w-full p-4 rounded-xl bg-surface-container-high border border-outline-variant/30 body-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                onKeyDown={e => e.key === "Enter" && checkAnswer()}
              />
            )}

            {currentExercise.type === "matching" && currentExercise.pairs && (
              <div className="space-y-3">
                {currentExercise.pairs.map((pair, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex-1 p-3 rounded-xl bg-tertiary-container text-tertiary label-medium">{pair.left}</span>
                    <span className="text-muted-foreground">→</span>
                    <select
                      value={matchAnswers[pair.left] || ""}
                      onChange={e => setMatchAnswers(prev => ({ ...prev, [pair.left]: e.target.value }))}
                      className="flex-1 p-3 rounded-xl bg-surface-container-high border border-outline-variant/30 body-small"
                    >
                      <option value="">Seleziona...</option>
                      {currentExercise.pairs!.map((p, j) => (
                        <option key={j} value={p.right}>{p.right}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {currentExercise.type === "ordering" && currentExercise.items && (
              <div className="space-y-2">
                <p className="label-small text-muted-foreground">Clicca gli elementi nell'ordine corretto:</p>
                <div className="flex flex-wrap gap-2">
                  {currentExercise.items.filter(item => !orderAnswers.includes(item)).map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setOrderAnswers(prev => [...prev, item])}
                      className="px-4 py-2 rounded-full bg-surface-container border border-outline-variant/30 label-medium hover:bg-surface-container-high transition-all"
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {orderAnswers.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-primary-container/50 min-h-[48px]">
                    {orderAnswers.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => setOrderAnswers(prev => prev.filter((_, idx) => idx !== i))}
                        className="px-4 py-2 rounded-full bg-primary text-primary-foreground label-medium"
                      >
                        {i + 1}. {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Result feedback */}
        {showResult && (
          <div className={cn(
            "p-4 rounded-2xl border animate-fade-up",
            results[results.length - 1]?.isCorrect
              ? "bg-success-container border-success/20"
              : "bg-error-container border-destructive/20"
          )}>
            <div className="flex items-center gap-2 mb-2">
              {results[results.length - 1]?.isCorrect
                ? <CheckCircle2 className="w-5 h-5 text-success" />
                : <XCircle className="w-5 h-5 text-destructive" />
              }
              <span className="label-large">
                {results[results.length - 1]?.isCorrect ? "Corretto! ✨" : "Non corretto"}
              </span>
            </div>
            {!results[results.length - 1]?.isCorrect && (
              <p className="body-small text-muted-foreground mb-2">
                Risposta corretta: <strong>{Array.isArray(currentExercise.correctAnswer) ? currentExercise.correctAnswer.join(", ") : currentExercise.correctAnswer}</strong>
              </p>
            )}
            <div className="body-small text-muted-foreground prose prose-sm">
              <ReactMarkdown>{currentExercise.explanation}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="px-4 pb-4 pt-2">
        {showResult ? (
          <Button onClick={nextExercise} className="w-full h-12 rounded-full bg-primary text-primary-foreground">
            {currentIndex + 1 < exercises.length ? "Prossimo esercizio" : "Vedi risultati"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={checkAnswer}
            disabled={!userAnswer && Object.keys(matchAnswers).length === 0 && orderAnswers.length === 0}
            className="w-full h-12 rounded-full bg-primary text-primary-foreground"
          >
            Controlla
          </Button>
        )}
      </div>
    </div>
  );
}
