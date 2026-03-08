import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, RotateCcw, BookOpen, MessageSquare, Play, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

type Mode = "select" | "structured" | "free";
type Phase = "idle" | "question" | "listening" | "evaluating" | "feedback";

interface Course {
  id: string;
  file_name: string;
}

interface ExchangeItem {
  type: "question" | "answer" | "feedback";
  content: string;
}

export function InterrogazioneView() {
  const [mode, setMode] = useState<Mode>("select");
  const [phase, setPhase] = useState<Phase>("idle");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [exchanges, setExchanges] = useState<ExchangeItem[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
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

  // Setup speech recognition
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const recognition = new SR();
      recognition.lang = "it-IT";
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.onresult = (event: any) => {
        let final = "";
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) final += event.results[i][0].transcript;
          else interim += event.results[i][0].transcript;
        }
        if (final) setTranscript(prev => prev + " " + final);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [exchanges, phase]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const callInterrogazione = useCallback(async (action: string, extraBody: Record<string, unknown> = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interrogazione`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ userId: currentUser, action, contextId: selectedCourse, ...extraBody }),
    });
    if (!response.ok) throw new Error("Errore nella risposta");
    return response.json();
  }, [currentUser, selectedCourse]);

  const startInterrogazione = async (courseId: string, selectedMode: "structured" | "free") => {
    setSelectedCourse(courseId);
    setMode(selectedMode);
    setExchanges([]);
    setScore(null);
    setQuestionCount(0);

    if (selectedMode === "structured") {
      setPhase("evaluating");
      try {
        const data = await callInterrogazione("ask", { contextId: courseId });
        setCurrentQuestion(data.question);
        setExchanges([{ type: "question", content: data.question }]);
        setQuestionCount(1);
        setPhase("question");
      } catch {
        toast({ title: "Errore", description: "Non riesco a generare la domanda", variant: "destructive" });
        setPhase("idle");
      }
    } else {
      // Free mode: give topic prompt
      setPhase("evaluating");
      try {
        const data = await callInterrogazione("topic", { contextId: courseId });
        setCurrentQuestion(data.topic);
        setExchanges([{ type: "question", content: `📖 Argomento: ${data.topic}\n\nEsponi liberamente quello che sai su questo argomento. Quando hai finito, premi il pulsante di stop.` }]);
        setPhase("question");
      } catch {
        toast({ title: "Errore", description: "Non riesco a selezionare l'argomento", variant: "destructive" });
        setPhase("idle");
      }
    }
  };

  const submitAnswer = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    const answer = transcript.trim();
    if (!answer) {
      toast({ title: "Rispondi prima!", description: "Dì qualcosa prima di inviare", variant: "destructive" });
      return;
    }

    setExchanges(prev => [...prev, { type: "answer", content: answer }]);
    setPhase("evaluating");
    setTranscript("");

    try {
      const action = mode === "structured" ? "evaluate" : "evaluate_free";
      const data = await callInterrogazione(action, {
        question: currentQuestion,
        answer,
        history: exchanges,
        questionNumber: questionCount,
      });

      setExchanges(prev => [...prev, { type: "feedback", content: data.feedback }]);

      if (data.score !== undefined) setScore(data.score);

      if (data.nextQuestion && mode === "structured") {
        setTimeout(() => {
          setCurrentQuestion(data.nextQuestion);
          setExchanges(prev => [...prev, { type: "question", content: data.nextQuestion }]);
          setQuestionCount(prev => prev + 1);
          setPhase("question");
        }, 2000);
      } else if (data.finished) {
        setPhase("idle");
      } else {
        setPhase("question");
      }
    } catch {
      toast({ title: "Errore", description: "Non riesco a valutare la risposta", variant: "destructive" });
      setPhase("question");
    }
  };

  const resetInterrogazione = () => {
    setMode("select");
    setPhase("idle");
    setExchanges([]);
    setScore(null);
    setTranscript("");
    setQuestionCount(0);
  };

  const hasSpeech = typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Course & mode selection
  if (mode === "select") {
    return (
      <div className="flex flex-col h-full px-4 py-4 space-y-5 overflow-y-auto">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-tertiary/10 flex items-center justify-center">
            <Mic className="w-8 h-8 text-tertiary" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">Interrogazione</h2>
          <p className="body-medium text-muted-foreground">Scegli un corso e la modalità</p>
        </div>

        {courses.length === 0 ? (
          <p className="text-center text-muted-foreground body-medium">Nessun corso disponibile. Carica prima dei materiali.</p>
        ) : (
          <>
            <div className="space-y-2">
              <p className="label-large text-foreground">Scegli il corso:</p>
              <div className="space-y-2">
                {courses.map(course => (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourse(course.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300",
                      selectedCourse === course.id
                        ? "bg-tertiary-container border-tertiary/30 shadow-level-1"
                        : "bg-surface-container border-outline-variant/30 hover:bg-surface-container-high"
                    )}
                  >
                    <BookOpen className="w-5 h-5 text-tertiary flex-shrink-0" />
                    <span className="label-large text-foreground truncate">
                      {course.file_name.replace(/^🌐\s*/, "").replace(/\.pdf$/i, "")}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {selectedCourse && (
              <div className="space-y-2 animate-fade-up">
                <p className="label-large text-foreground">Modalità:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => startInterrogazione(selectedCourse, "structured")}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-primary-container border border-primary/20 hover:shadow-level-2 transition-all active:scale-95"
                  >
                    <MessageSquare className="w-7 h-7 text-primary" />
                    <span className="label-large text-primary">Domande</span>
                    <span className="label-small text-muted-foreground text-center">Il tutor ti fa domande</span>
                  </button>
                  <button
                    onClick={() => startInterrogazione(selectedCourse, "free")}
                    className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-secondary-container border border-secondary/20 hover:shadow-level-2 transition-all active:scale-95"
                  >
                    <Volume2 className="w-7 h-7 text-secondary" />
                    <span className="label-large text-secondary">Esposizione</span>
                    <span className="label-small text-muted-foreground text-center">Esponi l'argomento</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Active interrogation
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
        <div className="flex items-center gap-2">
          <span className="label-large text-foreground">
            {mode === "structured" ? `Domanda ${questionCount}` : "Esposizione libera"}
          </span>
          {score !== null && (
            <span className={cn(
              "px-2.5 py-0.5 rounded-full label-small",
              score >= 7 ? "bg-success-container text-success" :
              score >= 5 ? "bg-warning/10 text-warning" :
              "bg-error-container text-destructive"
            )}>
              {score}/10
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={resetInterrogazione} className="rounded-full">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Exchanges */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {exchanges.map((item, i) => (
          <div
            key={i}
            className={cn(
              "rounded-2xl px-4 py-3 animate-fade-up",
              item.type === "question" && "bg-tertiary-container text-on-tertiary-container",
              item.type === "answer" && "bg-surface-container-high text-foreground ml-8",
              item.type === "feedback" && "bg-primary-container text-on-primary-container border border-primary/10"
            )}
          >
            <div className="label-small text-muted-foreground mb-1">
              {item.type === "question" ? "🎓 Tutor" : item.type === "answer" ? "🎤 Tu" : "📝 Valutazione"}
            </div>
            <div className="body-medium prose prose-sm max-w-none">
              <ReactMarkdown>{item.content}</ReactMarkdown>
            </div>
          </div>
        ))}

        {phase === "evaluating" && (
          <div className="flex justify-center py-4">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 bg-tertiary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Voice input */}
      {phase === "question" && (
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-outline-variant/20">
          {transcript && (
            <div className="p-3 rounded-xl bg-surface-container text-foreground body-small max-h-24 overflow-y-auto">
              {transcript}
            </div>
          )}
          <div className="flex items-center gap-3">
            {hasSpeech && (
              <button
                onClick={toggleListening}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-level-2",
                  isListening
                    ? "bg-destructive text-destructive-foreground animate-pulse-soft scale-110"
                    : "bg-tertiary text-tertiary-foreground hover:scale-105"
                )}
              >
                {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
            )}
            <Button
              onClick={submitAnswer}
              disabled={!transcript.trim()}
              className="flex-1 h-12 rounded-full bg-primary text-primary-foreground shadow-level-1"
            >
              {mode === "structured" ? "Invia risposta" : "Ho finito"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
