import { useState, useEffect, useCallback } from "react";
import { BookOpen, Dumbbell, RefreshCw, CheckCircle2, XCircle, ArrowRight, Loader2, X, ChevronLeft, Check, History, ChevronRight, Cpu, Brain, Zap, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { EserciziMenuSkeleton, EserciziGenerationSkeleton, LessonPickerSkeleton, EserciziCardSkeleton } from "./EserciziSkeleton";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Slider } from "@/components/ui/slider";
import { currentLanguage } from "@/i18n";

const MAX_EXERCISES = 20;
const MIN_PER_LESSON = 2;
const MAX_PER_LESSON = 5;
function exerciseRangeFor(n: number) {
  const min = Math.min(MAX_EXERCISES, MIN_PER_LESSON * n);
  const max = Math.min(MAX_EXERCISES, Math.max(min, MAX_PER_LESSON * n));
  const def = Math.min(max, Math.max(min, Math.round((min + max) / 2)));
  return { min, max, def };
}

interface Course {
  id: string;
  file_name: string;
}

interface Lesson {
  id: string;
  title: string;
  lesson_order: number;
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

interface EserciziViewProps {
  onFullscreenChange?: (isFullscreen: boolean) => void;
  contextId?: string | null;
  contextName?: string | null;
  /** P42: avvisa il contenitore quando si lascia il menu (il bottom sheet
   *  si espande a schermo intero). */
  onSessionStart?: () => void;
}

interface PastJob {
  id: string;
  context_id: string | null;
  created_at: string;
  exercises: Exercise[];
  contextName: string;
}

/** 🧾 P7 — il verbale di un quiz finito (tabella quiz_results). */
interface QuizResultRow {
  id: string;
  title: string;
  score: number;
  total: number;
  details: { q: string; ok: boolean; explanation?: string; correctAnswer?: string }[];
  created_at: string;
}

function formatGroupLabel(date: Date): string {
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Oggi";
  if (sameDay(date, yest)) return "Ieri";
  return date.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

export function EserciziView({ onFullscreenChange, contextId, contextName, onSessionStart }: EserciziViewProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(contextId ?? null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [exerciseCount, setExerciseCount] = useState<number>(10);
  const [showLessonPicker, setShowLessonPicker] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [matchAnswers, setMatchAnswers] = useState<Record<string, string>>({});
  const [orderAnswers, setOrderAnswers] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [genStage, setGenStage] = useState<"queue" | "analyze" | "generate" | "finalize">("queue");
  const [genProgress, setGenProgress] = useState(0); // 0..100
  const [genCourseName, setGenCourseName] = useState<string>("");
  const [pastJobs, setPastJobs] = useState<PastJob[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [quizResults, setQuizResults] = useState<QuizResultRow[]>([]);
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);
  const [view, setView] = useState<"menu" | "generate" | "history">("menu");

  // 📈 P42: "Genera esercizi" (anche via picker delle lezioni) / "I tuoi
  // esercizi" portano fuori dal menu → il bottom sheet si espande.
  useEffect(() => {
    if (view !== "menu" || showLessonPicker) onSessionStart?.();
  }, [view, showLessonPicker, onSessionStart]);
  const { currentUser } = useAuth();
  const { supported: pushSupported, permission: pushPermission, subscribe: subscribePush } = usePushNotifications();
  const { toast } = useToast();

  // Load courses
  useEffect(() => {
    if (contextId) {
      setSelectedCourse(contextId);
    }
  }, [contextId]);

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

  // Load past completed exercise jobs (history)
  const loadHistory = useCallback(async () => {
    if (!currentUser) return;
    setLoadingHistory(true);
    try {
      const { data: jobs } = await supabase
        .from("exercise_jobs")
        .select("id, context_id, created_at, result")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(50);
      const ctxIds = Array.from(
        new Set((jobs || []).map((j: { context_id: string | null }) => j.context_id).filter(Boolean))
      ) as string[];
      let ctxMap: Record<string, string> = {};
      if (ctxIds.length > 0) {
        const { data: ctxs } = await supabase
          .from("study_contexts")
          .select("id, file_name")
          .in("id", ctxIds);
        ctxMap = Object.fromEntries(
          (ctxs || []).map((c: { id: string; file_name: string }) => [c.id, c.file_name])
        );
      }
      const mapped: PastJob[] = (jobs || [])
        .map((j: { id: string; context_id: string | null; created_at: string; result: unknown }) => {
          const result = j.result as { exercises?: Exercise[] } | null;
          const exs = result?.exercises || [];
          return {
            id: j.id,
            context_id: j.context_id,
            created_at: j.created_at,
            exercises: exs,
            contextName: (j.context_id && ctxMap[j.context_id])
              ? ctxMap[j.context_id].replace(/^🌐\s*/, "").replace(/\.pdf$/i, "")
              : "Esercizi",
          };
        })
        .filter((j: PastJob) => j.exercises.length > 0);
      setPastJobs(mapped);
    } catch (e) {
      console.error("[esercizi] history load error:", e);
    } finally {
      setLoadingHistory(false);
    }
  }, [currentUser]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // 🧾 P7 — carica i verbali dei quiz completati (cronologia risultati)
  const loadQuizResults = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { data } = await supabase
        .from("quiz_results")
        .select("id, title, score, total, details, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (data) setQuizResults(data as QuizResultRow[]);
    } catch (e) {
      console.warn("[esercizi] quiz_results load error:", e);
    }
  }, [currentUser]);

  useEffect(() => { loadQuizResults(); }, [loadQuizResults]);

  const openPastJob = useCallback((job: PastJob) => {
    setSelectedCourse(job.context_id);
    setShowLessonPicker(false);
    setExercises(job.exercises);
    setCurrentIndex(0);
    setResults([]);
    setUserAnswer("");
    setMatchAnswers({});
    setOrderAnswers([]);
    setShowResult(false);
    setIsFinished(false);
    setIsLoading(false);
    onFullscreenChange?.(true);
  }, [onFullscreenChange]);

  // Load lessons for a course
  const loadLessonsForCourse = useCallback(async (courseId: string) => {
    setLoadingLessons(true);
    setSelectedCourse(courseId);
    setShowLessonPicker(true);
    setSelectedLessonIds([]);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ userId: currentUser, action: "get", contextId: courseId }),
      });
      if (response.ok) {
        const data = await response.json();
        setLessons((data.lessons || []).sort((a: Lesson, b: Lesson) => a.lesson_order - b.lesson_order));
      }
    } catch {
      toast({ title: "Errore", description: "Non riesco a caricare le lezioni", variant: "destructive" });
    } finally {
      setLoadingLessons(false);
    }
  }, [currentUser, toast]);

  const toggleLessonSelection = (lessonId: string) => {
    setSelectedLessonIds(prev =>
      prev.includes(lessonId) ? prev.filter(id => id !== lessonId) : [...prev, lessonId]
    );
  };

  const selectAllLessons = () => {
    if (selectedLessonIds.length === lessons.length) {
      setSelectedLessonIds([]);
    } else {
      setSelectedLessonIds(lessons.map(l => l.id));
    }
  };

  // Clamp exerciseCount within range proportional to # selected lessons
  useEffect(() => {
    const { min, max, def } = exerciseRangeFor(selectedLessonIds.length);
    setExerciseCount(prev => {
      if (selectedLessonIds.length === 0) return def;
      if (prev < min) return min;
      if (prev > max) return max;
      return prev;
    });
  }, [selectedLessonIds.length]);

  const generateExercises = useCallback(async (courseId: string, lessonIds?: string[], count?: number) => {
    setIsLoading(true);
    setShowLessonPicker(false);
    setExercises([]);
    setCurrentIndex(0);
    setResults([]);
    setIsFinished(false);
    setGenStage("queue");
    setGenProgress(2);
    const courseObj = courses.find(c => c.id === courseId);
    setGenCourseName(courseObj ? courseObj.file_name.replace(/^🌐\s*/, "").replace(/\.pdf$/i, "") : "");
    onFullscreenChange?.(true);

    // Animated progress: target moves with stage; ticker eases toward it and caps at 95% until completion.
    const stageTargets: Record<typeof genStage extends infer T ? string : never, number> = { queue: 10, analyze: 35, generate: 80, finalize: 95 } as never;
    let stageRef: "queue" | "analyze" | "generate" | "finalize" = "queue";
    const setStage = (s: "queue" | "analyze" | "generate" | "finalize") => { stageRef = s; setGenStage(s); };
    const ticker = window.setInterval(() => {
      const target = (stageTargets as Record<string, number>)[stageRef] ?? 95;
      setGenProgress(prev => {
        if (prev >= 95) return 95;
        const diff = target - prev;
        if (diff <= 0.3) return prev + 0.15; // creep
        return prev + diff * 0.06;
      });
    }, 250);
    const t1 = window.setTimeout(() => setStage("analyze"), 1200);
    const t2 = window.setTimeout(() => setStage("generate"), 6000);
    const t3 = window.setTimeout(() => setStage("finalize"), 25000);
    const stopProgress = () => {
      window.clearInterval(ticker);
      window.clearTimeout(t1); window.clearTimeout(t2); window.clearTimeout(t3);
    };

    try {
      // Notifica push opt-in al primo uso
      if (pushSupported && pushPermission !== "denied") {
        subscribePush().catch(() => {});
      }
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const body: Record<string, unknown> = { userId: currentUser, contextId: courseId };
      body.language = currentLanguage();
      if (lessonIds && lessonIds.length > 0 && lessonIds.length < lessons.length) {
        body.lessonIds = lessonIds;
      }
      if (typeof count === "number" && count > 0) {
        body.count = Math.min(MAX_EXERCISES, Math.max(1, Math.round(count)));
      }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Errore nella generazione");
      const data = await response.json();
      // Backend ora risponde 202 con jobId: lavoro in background.
      const jobId = data.jobId;
      if (!jobId) throw new Error("Job non avviato");
      setStage("analyze");

      // Polling + realtime fallback sullo stato del job.
      // Realtime sub
      const channel = supabase
        .channel(`exercise-job-${jobId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "exercise_jobs", filter: `id=eq.${jobId}` },
          (payload) => {
            const row = payload.new as { status: string; result: { exercises?: Exercise[] } | null; error: string | null };
            if (row.status === "completed" && row.result?.exercises) {
              stopProgress();
              setGenProgress(100);
              setStage("finalize");
              setExercises(row.result.exercises);
              setIsLoading(false);
              supabase.removeChannel(channel);
            } else if (row.status === "failed") {
              stopProgress();
              toast({ title: "Errore", description: row.error || "Generazione fallita", variant: "destructive" });
              setIsLoading(false);
              onFullscreenChange?.(false);
              supabase.removeChannel(channel);
            }
          }
        )
        .subscribe();

      // Poll di backup (ogni 4s, max 5 min) nel caso realtime non arrivi
      let elapsed = 0;
      const poll = window.setInterval(async () => {
        elapsed += 4;
        const { data: job } = await supabase
          .from("exercise_jobs")
          .select("status, result, error")
          .eq("id", jobId)
          .maybeSingle();
        const result = job?.result as unknown as { exercises?: Exercise[] } | null;
        if (job?.status === "completed" && result?.exercises) {
          stopProgress();
          setGenProgress(100);
          setStage("finalize");
          setExercises(result.exercises);
          setIsLoading(false);
          window.clearInterval(poll);
          supabase.removeChannel(channel);
        } else if (job?.status === "failed") {
          stopProgress();
          toast({ title: "Errore", description: job.error || "Generazione fallita", variant: "destructive" });
          setIsLoading(false);
          onFullscreenChange?.(false);
          window.clearInterval(poll);
          supabase.removeChannel(channel);
        } else if (elapsed > 300) {
          stopProgress();
          window.clearInterval(poll);
          supabase.removeChannel(channel);
        }
      }, 4000);
      return;
    } catch {
      stopProgress();
      toast({ title: "Errore", description: "Non riesco a generare gli esercizi", variant: "destructive" });
      setIsLoading(false);
      onFullscreenChange?.(false);
    }
  }, [currentUser, toast, lessons.length, courses, onFullscreenChange, pushPermission, pushSupported, subscribePush]);

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
      // 🧾 P7 — salva il verbale del quiz in cronologia (punteggio + errori con
      // spiegazione), così "La tua cronologia" mostra com'è andata davvero.
      (async () => {
        try {
          const details = results.map((r) => ({
            q: r.exercise.question,
            ok: r.isCorrect,
            explanation: r.exercise.explanation,
            correctAnswer: Array.isArray(r.exercise.correctAnswer)
              ? r.exercise.correctAnswer.join(", ")
              : String(r.exercise.correctAnswer ?? ""),
          }));
          const { error } = await supabase.from("quiz_results").insert({
            user_id: currentUser,
            context_id: selectedCourse ?? null,
            title: courses.find((c) => c.id === selectedCourse)?.file_name || "Esercizi",
            score: results.filter((r) => r.isCorrect).length,
            total: results.length,
            details,
          });
          if (error) throw error;
          loadQuizResults();
        } catch (e) {
          console.warn("[esercizi] quiz_results save failed:", e);
        }
      })();
      // Aggiornamento dinamico del profilo cognitivo (APP) basato sulle
      // performance reali. Solo esercizi a valutazione deterministica.
      (async () => {
        try {
          const scorable = results.filter(
            (r) => r.exercise.type === "multiple_choice" || r.exercise.type === "true_false"
          );
          if (scorable.length === 0) return;
          const correct = scorable.filter((r) => r.isCorrect).length;
          const total = scorable.length;
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) return;
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cognitive-profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ action: "updateFromPerformance", userId: currentUser, correct, total, area: "APP" }),
          });
        } catch {
          /* fire-and-forget */
        }
      })();
    }
  };

  const correctCount = results.filter(r => r.isCorrect).length;

  // Exit exercises
  const exitExercises = () => {
    if (!contextId) setSelectedCourse(null);
    setShowLessonPicker(false);
    setExercises([]);
    setIsFinished(false);
    setView("menu");
    onFullscreenChange?.(false);
    loadHistory();
    loadQuizResults();
  };

  // Lesson picker view — layoutScroll preserves scroll position
  if (showLessonPicker && selectedCourse) {
    return (
      <div className="flex flex-col h-full">
        <motion.div layoutScroll className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowLessonPicker(false);
                if (!contextId) setSelectedCourse(null);
                setView("menu");
              }}
              className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-foreground/[0.08] transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <h2 className="font-display text-lg font-bold text-foreground">Scegli le lezioni</h2>
          </div>

          {loadingLessons ? (
            <LessonPickerSkeleton />
          ) : lessons.length === 0 ? (
            <p className="text-center text-muted-foreground body-medium">Nessuna lezione disponibile per questo corso.</p>
          ) : (
            <>
              <button
                onClick={selectAllLessons}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-foreground/[0.05] transition-colors self-start"
              >
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                  selectedLessonIds.length === lessons.length
                    ? "bg-primary border-primary"
                    : "border-muted-foreground/40"
                )}>
                  {selectedLessonIds.length === lessons.length && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <span className="label-medium text-muted-foreground">
                  {selectedLessonIds.length === lessons.length ? "Deseleziona tutto" : "Seleziona tutto"}
                </span>
              </button>

              <div className="space-y-2 pb-4">
                {lessons.map((lesson, i) => (
                  <button
                    key={lesson.id}
                    onClick={() => toggleLessonSelection(lesson.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98]",
                      selectedLessonIds.includes(lesson.id)
                        ? "bg-primary-container border-primary/30 shadow-level-1"
                        : "bg-surface-container border-outline-variant/30 hover:bg-surface-container-high"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                      selectedLessonIds.includes(lesson.id)
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/40"
                    )}>
                      {selectedLessonIds.includes(lesson.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="label-large text-foreground text-left truncate">
                      {i + 1}. {lesson.title}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {!loadingLessons && lessons.length > 0 && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-outline-variant/20 bg-background">
            {selectedLessonIds.length > 0 && (() => {
              const { min, max } = exerciseRangeFor(selectedLessonIds.length);
              return (
                <div className="mb-4 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="label-medium text-foreground">Numero di esercizi</span>
                    <span className="label-large font-display font-bold text-primary">{exerciseCount}</span>
                  </div>
                  <Slider
                    value={[exerciseCount]}
                    min={min}
                    max={max}
                    step={1}
                    onValueChange={(v) => setExerciseCount(v[0])}
                  />
                  <div className="flex justify-between mt-1.5">
                    <span className="body-small text-muted-foreground">min {min}</span>
                    <span className="body-small text-muted-foreground">max {max}</span>
                  </div>
                </div>
              );
            })()}
            <Button
              onClick={() => generateExercises(selectedCourse, selectedLessonIds, exerciseCount)}
              disabled={selectedLessonIds.length === 0}
              className="w-full h-12 rounded-full bg-primary text-primary-foreground"
            >
              Genera {exerciseCount} esercizi {selectedLessonIds.length > 0 && `· ${selectedLessonIds.length} ${selectedLessonIds.length === 1 ? "lezione" : "lezioni"}`}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Menu + sotto-sezioni (Genera / I tuoi esercizi)
  if (!selectedCourse || exercises.length === 0) {
    // === MENU ===
    if (view === "menu" && !isLoading) {
      return (
        <div className="flex flex-col h-full px-4 py-6 space-y-6 overflow-y-auto">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary text-primary-foreground flex items-center justify-center animate-bounce-in shadow-level-2">
              <Dumbbell className="w-8 h-8" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">Esercizi Mirati</h2>
            <p className="body-medium text-muted-foreground">Allenati con esercizi creati dai tuoi materiali</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                if (contextId) {
                  loadLessonsForCourse(contextId);
                } else {
                  setView("generate");
                }
              }}
              className="group relative overflow-hidden text-left p-5 rounded-2xl bg-primary text-primary-foreground shadow-level-2 transition-all duration-200 ease-m3-emphasized active:scale-[0.98]"
            >
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-primary-foreground/10 blur-2xl" />
              <div className="relative space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-foreground/15 flex items-center justify-center">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <p className="title-medium font-display font-bold">Genera esercizi</p>
                  <p className="body-small opacity-90 mt-1">Crea un nuovo set di esercizi mirati dai tuoi corsi</p>
                </div>
                <div className="flex items-center gap-1 label-medium pt-1">
                  Inizia <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>

            <button
              onClick={() => setView("history")}
              className="group relative overflow-hidden text-left p-5 rounded-2xl bg-tertiary-container text-foreground shadow-level-1 transition-all duration-200 ease-m3-emphasized active:scale-[0.98] border border-outline-variant/60"
            >
              <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-tertiary/10 blur-2xl" />
              <div className="relative space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-tertiary/15 flex items-center justify-center">
                  <History className="w-6 h-6 text-tertiary" />
                </div>
                <div>
                  <p className="title-medium font-display font-bold">I tuoi esercizi</p>
                  <p className="body-small text-muted-foreground mt-1">
                    {loadingHistory
                      ? "Carico la cronologia..."
                      : pastJobs.length === 0
                        ? "Qui troverai tutti i set già generati"
                        : `${pastJobs.length} set disponibili da rifare`}
                  </p>
                </div>
                <div className="flex items-center gap-1 label-medium text-tertiary pt-1">
                  Apri <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          </div>
        </div>
      );
    }

    // === GENERA ESERCIZI: lista corsi ===
    if (view === "generate" && !isLoading) {
      return (
        <div className="flex flex-col h-full px-4 py-4 space-y-5 overflow-y-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("menu")}
              className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-foreground/[0.08] transition-colors"
              aria-label="Indietro"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Genera esercizi</h2>
              <p className="body-small text-muted-foreground">Scegli un corso per iniziare</p>
            </div>
          </div>

          {courses.length === 0 ? (
            <p className="text-center text-muted-foreground body-medium py-6">Nessun corso disponibile.</p>
          ) : (
            <div className="space-y-2">
              {courses.map(course => (
                <button
                  key={course.id}
                  onClick={() => loadLessonsForCourse(course.id)}
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

    // === I TUOI ESERCIZI: cronologia ===
    if (view === "history" && !isLoading) {
      return (
        <div className="flex flex-col h-full px-4 py-4 space-y-5 overflow-y-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("menu")}
              className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-foreground/[0.08] transition-colors"
              aria-label="Indietro"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">I tuoi esercizi</h2>
              <p className="body-small text-muted-foreground">Riprendi un set già generato</p>
            </div>
          </div>

          {/* 🧾 P7 — la cronologia risultati: ogni quiz finito lascia un verbale
              con punteggio e, all'interno, gli errori spiegati ("hai sbagliato
              qui, ecco perché"). Sotto restano i set rigenerabili di sempre. */}
          {quizResults.length > 0 && (
            <div className="space-y-2">
              <p className="label-small text-muted-foreground uppercase tracking-wide">La tua cronologia risultati</p>
              <div className="space-y-2">
                {quizResults.map((r) => {
                  const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                  const wrong = (r.details || []).filter((d) => !d.ok);
                  const expanded = expandedResultId === r.id;
                  return (
                    <div key={r.id} className="rounded-2xl bg-surface-container-high border border-outline-variant/30 shadow-level-1 overflow-hidden">
                      <button
                        onClick={() => setExpandedResultId(expanded ? null : r.id)}
                        className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-foreground/[0.03] transition-colors"
                      >
                        <div className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-display font-bold text-sm",
                          pct >= 70 ? "bg-success-container text-success" : pct >= 50 ? "bg-warning/10 text-warning" : "bg-error-container text-error"
                        )}>
                          {pct}%
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="body-small font-semibold text-foreground truncate">{r.title}</p>
                          <p className="label-small text-muted-foreground">
                            {formatGroupLabel(new Date(r.created_at))} · {formatTime(new Date(r.created_at))} · {r.score}/{r.total} corrette
                          </p>
                        </div>
                        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", expanded && "rotate-90")} />
                      </button>
                      {expanded && (
                        <div className="px-3.5 pb-3 space-y-2 animate-fade-up">
                          {wrong.length === 0 ? (
                            <p className="body-small text-success">Nessun errore: perfetto</p>
                          ) : (
                            wrong.map((d, i) => (
                              <div key={i} className="p-2.5 rounded-xl bg-error-container/40 border border-error/15 space-y-1">
                                <p className="body-small font-medium text-foreground">{d.q}</p>
                                {d.correctAnswer && <p className="body-small text-success font-medium">✓ {d.correctAnswer}</p>}
                                {d.explanation && (
                                  <div className="body-small text-muted-foreground prose prose-sm max-w-none prose-p:my-1">
                                    <ReactMarkdown>{d.explanation}</ReactMarkdown>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loadingHistory ? (
            <div className="flex items-center gap-2 text-muted-foreground py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="body-small">Carico la cronologia...</span>
            </div>
          ) : pastJobs.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-tertiary-container flex items-center justify-center">
                <History className="w-6 h-6 text-tertiary" />
              </div>
              <p className="body-medium text-muted-foreground">
                Non hai ancora generato esercizi. I tuoi set appariranno qui per riprenderli quando vuoi.
              </p>
              <Button onClick={() => setView("generate")} className="rounded-full mt-2">
                <Cpu className="w-4 h-4 mr-2" /> Genera ora
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(
                pastJobs.reduce<Record<string, PastJob[]>>((acc, job) => {
                  const label = formatGroupLabel(new Date(job.created_at));
                  (acc[label] ||= []).push(job);
                  return acc;
                }, {})
              ).map(([label, jobs]) => (
                <div key={label} className="space-y-2">
                  <p className="label-small text-muted-foreground uppercase tracking-wide">{label}</p>
                  <div className="space-y-2">
                    {jobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => openPastJob(job)}
                        className="w-full flex items-center gap-3 p-4 rounded-2xl border bg-tertiary-container/30 border-outline-variant/30 hover:bg-tertiary-container/60 transition-all active:scale-[0.98]"
                      >
                        <div className="w-10 h-10 rounded-2xl bg-tertiary-container flex items-center justify-center flex-shrink-0">
                          <Dumbbell className="w-5 h-5 text-tertiary" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="label-large text-foreground truncate">{job.contextName}</p>
                          <p className="label-small text-muted-foreground">
                            {job.exercises.length} esercizi • {formatTime(new Date(job.created_at))}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // === Loading generazione (fallback) ===
    return <ExerciseGenerationProgress stage={genStage} progress={genProgress} courseName={genCourseName} />;
  }

  // Finished summary
  if (isFinished) {
    const grade = Math.round((correctCount / results.length) * 10 * 10) / 10;
    const pct = Math.round((correctCount / results.length) * 100);
    return (
      <div className="no-halo fixed inset-0 z-50 bg-background flex flex-col h-full px-4 py-6 items-center justify-center space-y-6 pt-safe pb-safe">
        <div className={cn(
          "w-28 h-28 rounded-full flex flex-col items-center justify-center",
          grade >= 7 ? "bg-success-container" : grade >= 5 ? "bg-warning/10" : "bg-error-container"
        )}>
          <span className="font-display text-4xl font-bold">
            {grade}
          </span>
          <span className="label-small text-muted-foreground">/10</span>
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-display text-xl font-bold text-foreground">
            {grade >= 8 ? "Ottimo lavoro" : grade >= 6 ? "Buon inizio" : "Continua a studiare"}
          </h3>
          <p className="body-medium text-muted-foreground">
            {correctCount}/{results.length} risposte corrette
          </p>
        </div>

        {/* 🧑‍🏫 P7 — la pagella: gli errori con la spiegazione del perché,
            ripresi subito mentre sono freschi (e salvati in cronologia). */}
        {results.some((r) => !r.isCorrect) && (
          <div className="w-full max-w-md max-h-[36vh] overflow-y-auto space-y-2 scrollbar-thin">
            <p className="label-medium font-semibold text-error text-left">Da ripassare ({results.filter((r) => !r.isCorrect).length}):</p>
            {results.filter((r) => !r.isCorrect).map((r, i) => (
              <div key={i} className="text-left p-3 rounded-2xl bg-error-container/50 border border-error/20 space-y-1.5">
                <p className="body-small font-medium text-foreground">{r.exercise.question}</p>
                <p className="body-small text-success font-medium">
                  ✓ {Array.isArray(r.exercise.correctAnswer) ? r.exercise.correctAnswer.join(", ") : r.exercise.correctAnswer}
                </p>
                {r.exercise.explanation && (
                  <div className="body-small text-muted-foreground prose prose-sm max-w-none prose-p:my-1">
                    <ReactMarkdown>{r.exercise.explanation}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={exitExercises} className="rounded-full">
            {contextId ? "Torna agli esercizi" : "Cambia corso"}
          </Button>
          <Button onClick={() => generateExercises(selectedCourse!, selectedLessonIds)} className="rounded-full bg-primary text-primary-foreground">
            <RefreshCw className="w-4 h-4 mr-2" /> Nuovi esercizi
          </Button>
        </div>
      </div>
    );
  }

  // Exercise view
  return (
    <div className="no-halo fixed inset-0 z-50 bg-background flex flex-col h-full pt-safe pb-safe">
      {/* Header with X button */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <button onClick={exitExercises} className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-foreground/[0.08] transition-colors">
            <X className="w-5 h-5 text-foreground" />
          </button>
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

      {/* Exercise content — slide between exercises */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="space-y-4"
          >
        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full label-small bg-surface-container-high text-muted-foreground">
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
                        ? "bg-primary text-primary-foreground border-primary shadow-level-1"
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

          </motion.div>
        </AnimatePresence>

        {/* Result feedback — outside slide, fade only */}
        {showResult && (
          <div className={cn(
            "p-4 rounded-2xl border animate-fade-up mt-4",
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
                {results[results.length - 1]?.isCorrect ? "Corretto" : "Non corretto"}
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

type GenStage = "queue" | "analyze" | "generate" | "finalize";

const STAGE_STEPS: { id: GenStage; label: string; sublabel: string; icon: typeof Brain }[] = [
  { id: "queue", label: "Avvio generazione", sublabel: "Preparo la richiesta", icon: Loader2 },
  { id: "analyze", label: "Analisi materiali", sublabel: "Leggo lezioni e concetti", icon: FileSearch },
  { id: "generate", label: "Creazione esercizi", sublabel: "L'AI scrive 10 esercizi su misura", icon: Brain },
  { id: "finalize", label: "Quasi pronto", sublabel: "Controllo qualità e formattazione", icon: Zap },
];

const TIPS = [
  "Scelgo le domande più utili per te…",
  "Mescolo scelta multipla, V/F, abbinamenti…",
  "Verifico le risposte e le spiegazioni…",
  "Ancora qualche secondo, sto rifinendo…",
];

function ExerciseGenerationProgress({ stage, progress, courseName }: { stage: GenStage; progress: number; courseName: string }) {
  const [tipIndex, setTipIndex] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const a = setInterval(() => setTipIndex(i => (i + 1) % TIPS.length), 3500);
    const b = setInterval(() => setDots(d => (d.length >= 3 ? "" : d + ".")), 500);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);

  const currentIdx = STAGE_STEPS.findIndex(s => s.id === stage);
  const radius = 56;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 animate-fade-up">
      <div className="relative mb-8">
        <div className="w-28 h-28 rounded-[2rem] bg-primary text-primary-foreground flex items-center justify-center shadow-level-3">
          <Dumbbell className="w-12 h-12 text-primary-foreground" />
        </div>
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--outline-variant))" strokeWidth="3" opacity="0.3" />
          <circle
            cx="60" cy="60" r={radius} fill="none"
            stroke="hsl(var(--primary))" strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={`${circumference * (1 - progress / 100)}`}
            className="transition-all duration-300"
          />
        </svg>
      </div>

      <div className="text-center mb-6">
        <span className="text-4xl font-display font-bold text-foreground">{Math.round(progress)}%</span>
        {courseName && (
          <p className="body-small text-primary font-medium mt-1 bg-primary-container px-3 py-1 rounded-full inline-block">
            {courseName}
          </p>
        )}
      </div>

      <div className="w-full max-w-xs space-y-1.5 mb-8">
        {STAGE_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentIdx;
          const isComplete = index < currentIdx;
          const isPending = index > currentIdx;
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200",
                isActive && "bg-primary-container scale-[1.02]",
                isComplete && "opacity-60",
                isPending && "opacity-30"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0",
                isActive && "bg-primary text-primary-foreground shadow-level-1",
                isComplete && "bg-success text-success-foreground",
                isPending && "bg-surface-container-highest text-muted-foreground"
              )}>
                {isComplete ? <Check className="w-4 h-4" /> : <Icon className={cn("w-4 h-4", isActive && "animate-pulse")} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "label-large leading-tight",
                  isActive && "text-primary font-semibold",
                  isComplete && "text-success"
                )}>
                  {step.label}{isActive && dots}
                </p>
                <p className="body-small text-muted-foreground">{step.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p key={tipIndex} className="text-center body-medium text-muted-foreground animate-fade-up max-w-[280px]">
        {TIPS[tipIndex]}
      </p>
      <p className="mt-6 text-center body-small text-muted-foreground/90 max-w-[320px] px-4 py-3 rounded-2xl bg-surface-container-highest/60 border border-outline-variant/20">
        Puoi anche uscire dall'app: la generazione continua in background e ti avviseremo con una notifica quando è pronta.
      </p>
    </div>
  );
}
