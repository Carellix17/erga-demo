import { useState, useEffect, useCallback } from "react";
import { FullscreenLesson } from "./FullscreenLesson";
import { FinalTest } from "./FinalTest";
import { LessonsList } from "./LessonsList";
import { CourseSelector } from "./CourseSelector";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Exercise } from "./exercises/ExerciseRenderer";
import { supabase } from "@/integrations/supabase/client";

interface StudioViewProps {
  hasFiles: boolean;
  onUploadClick: () => void;
  selectedContextId?: string | null;
  onClearContext?: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

interface Lesson {
  id: string;
  title: string;
  concept: string;
  explanation: string;
  example?: string;
  exercises?: Exercise[];
  is_generated: boolean;
  lesson_order: number;
  context_id?: string;
}

export function StudioView({ hasFiles, onUploadClick, selectedContextId, onClearContext }: StudioViewProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [showList, setShowList] = useState(true);
  const [activeLessonIndex, setActiveLessonIndex] = useState<number | null>(null);
  const [contextFileName, setContextFileName] = useState<string | null>(null);
  const [activeContextId, setActiveContextId] = useState<string | null>(null);
  const [showFinalTest, setShowFinalTest] = useState(false);
  const [finalTestExercises, setFinalTestExercises] = useState<Exercise[]>([]);
  const [isLoadingFinalTest, setIsLoadingFinalTest] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [contextStatus, setContextStatus] = useState<string | null>(null);
  const [allContexts, setAllContexts] = useState<{ id: string; file_name: string; processing_status?: string | null }[]>([]);

  useEffect(() => {
    if (selectedContextId) setActiveContextId(selectedContextId);
  }, [selectedContextId]);

  const fetchLessons = useCallback(async () => {
    if (!currentUser || !hasFiles) return;
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const contextsResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, action: "listContexts" }) }
      );
      const contextsData = await contextsResponse.json();
      const contexts = (contextsData.contexts || []) as { id: string; file_name: string; processing_status?: string | null }[];
      setAllContexts(contexts);
      const availableContextIds = new Set(contexts.map((c) => c.id));
      const latestContext = contexts[0] || null;
      let effectiveContextId = selectedContextId && availableContextIds.has(selectedContextId) ? selectedContextId : null;
      if (!effectiveContextId && activeContextId && availableContextIds.has(activeContextId)) effectiveContextId = activeContextId;
      if (!effectiveContextId && latestContext) effectiveContextId = latestContext.id;
      if (contexts.length > 0 && !effectiveContextId && selectedContextId) onClearContext?.();
      if (contexts.length > 0) {
        const ctx = effectiveContextId ? contexts.find((c) => c.id === effectiveContextId) : contexts[0];
        if (ctx) { setContextFileName(ctx.file_name || null); setContextStatus(ctx.processing_status || null);
          if (!selectedContextId && ctx.id !== activeContextId) setActiveContextId(ctx.id); }
      } else { setContextFileName(null); setContextStatus(null); setActiveContextId(null); setLessons([]); }
      const body: Record<string, unknown> = { userId: currentUser, action: "get" };
      if (effectiveContextId) body.contextId = effectiveContextId;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify(body) }
      );
      const data = await response.json();
      if (response.ok && data.lessons) { setLessons(data.lessons); setCurrentLessonIndex(data.currentIndex || 0); }
    } catch (error) { console.error("Error fetching lessons:", error); }
    finally { setIsLoading(false); }
  }, [currentUser, hasFiles, selectedContextId, activeContextId, onClearContext]);

  useEffect(() => { fetchLessons(); }, [fetchLessons]);
  useEffect(() => { if (lessons.length === 0) return; setCurrentLessonIndex((idx) => { if (idx < 0) return 0; if (idx > lessons.length - 1) return lessons.length - 1; return idx; }); }, [lessons.length]);
  useEffect(() => { if (lessons.length === 0) return; const lesson = lessons[currentLessonIndex]; if (!lesson || lesson.is_generated || isGeneratingLesson || isGenerating) return; generateLessonContent(currentLessonIndex); }, [currentLessonIndex, lessons, isGeneratingLesson, isGenerating]);

  const handleGenerateLessons = async () => {
    if (!currentUser) return;
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const contextId = selectedContextId || activeContextId;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, ...(contextId ? { contextId } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore nella generazione");
      toast({ title: "Percorso creato!", description: `Creato un percorso con ${data.lessonsCount} mini-lezioni.` });
      await fetchLessons();
    } catch (error) { console.error("Error generating lessons:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella generazione", variant: "destructive" });
    } finally { setIsGenerating(false); }
  };

  const generateLessonContent = async (lessonIndex: number) => {
    if (!currentUser) return null;
    setIsGeneratingLesson(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const body: Record<string, unknown> = { userId: currentUser, action: "generateLesson", lessonIndex };
      const contextId = selectedContextId || activeContextId;
      if (contextId) body.contextId = contextId;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore nella generazione");
      if (data.lesson) setLessons(prev => prev.map(l => l.lesson_order === lessonIndex ? data.lesson : l));
      return data.lesson;
    } catch (error) { console.error("Error generating lesson:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella generazione", variant: "destructive" }); return null;
    } finally { setIsGeneratingLesson(false); }
  };

  const handleNext = async () => {
    if (currentLessonIndex < lessons.length - 1) {
      const newIndex = currentLessonIndex + 1;
      const nextLesson = lessons[newIndex];
      if (!nextLesson) return;
      if (!nextLesson.is_generated) await generateLessonContent(newIndex);
      setCurrentLessonIndex(newIndex);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
          { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
            body: JSON.stringify({ userId: currentUser, action: "updateProgress", lessonIndex: newIndex }) });
      } catch (error) { console.error("Error updating progress:", error); }
    } else { handleStartFinalTest(); }
  };

  const handleStartFinalTest = async () => {
    if (!currentUser) return;
    setIsLoadingFinalTest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const contextId = selectedContextId || activeContextId;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, action: "generateFinalTest", ...(contextId ? { contextId } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore generazione test");
      setFinalTestExercises(data.exercises || []);
      setShowFinalTest(true);
    } catch (error) { console.error("Error generating final test:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella generazione del test", variant: "destructive" });
    } finally { setIsLoadingFinalTest(false); }
  };

  const handleSelectLesson = async (index: number) => {
    const selectedLesson = lessons[index];
    if (!selectedLesson) return;
    if (!selectedLesson.is_generated) await generateLessonContent(index);
    setCurrentLessonIndex(index); setShowList(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, action: "updateProgress", lessonIndex: index }) });
    } catch (error) { console.error("Error updating progress:", error); }
  };

  if (!hasFiles) return <EmptyState onUploadClick={onUploadClick} />;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-4">
        <div className="w-20 h-20 rounded-xl bg-primary flex items-center justify-center animate-pulse-soft shadow-level-3">
          <Loader2 className="w-9 h-9 text-primary-foreground animate-spin" />
        </div>
        <p className="text-muted-foreground font-display font-medium animate-fade-up">Caricamento lezioni...</p>
        <div className="w-32 h-1.5 m3-progress-track overflow-hidden">
          <div className="h-full m3-progress-indicator w-2/3 animate-pulse-soft" />
        </div>
      </div>
    );
  }

  if (lessons.length === 0) {
    const isPdfProcessing = contextStatus === "pending" || contextStatus === "processing";
    const isPdfFailed = contextStatus === "failed";

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-6 text-center animate-fade-up">
        <div className={`w-20 h-20 rounded-xl flex items-center justify-center shadow-level-3 ${
          isPdfProcessing ? "bg-primary animate-pulse-soft" : 
          isPdfFailed ? "bg-error-container" : "bg-tertiary-container"
        }`}>
          {isPdfProcessing ? (
            <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
          ) : (
            <RefreshCw className={`w-10 h-10 ${isPdfFailed ? "text-destructive" : "text-tertiary"}`} />
          )}
        </div>
        <div>
          <h3 className="font-display text-xl font-bold mb-2">
            {isPdfProcessing ? "Elaborazione PDF in corso..." : 
             isPdfFailed ? "Errore nell'elaborazione" :
             "Nessuna lezione disponibile"}
          </h3>
          <p className="text-muted-foreground max-w-xs body-medium">
            {isPdfProcessing ? "Attendi qualche secondo mentre analizziamo il tuo documento." :
             isPdfFailed ? "Si è verificato un errore. Prova a ricaricare il file." :
             "L'AI analizzerà i tuoi materiali e creerà un percorso di mini-lezioni personalizzato."}
          </p>
          {contextFileName && (
            <p className="text-sm text-primary font-medium mt-2 bg-primary-container inline-block px-3 py-1 rounded-full animate-bounce-in">{contextFileName}</p>
          )}
        </div>
        
        {isPdfProcessing ? (
          <Button onClick={fetchLessons} variant="outline" className="h-12 px-6">
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna stato
          </Button>
        ) : (
          <Button onClick={handleGenerateLessons} disabled={isGenerating} className="h-12 px-6">
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analisi in corso...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Genera percorso</>
            )}
          </Button>
        )}
      </div>
    );
  }

  const currentLesson = activeLessonIndex !== null ? lessons[activeLessonIndex] : null;
  const allGenerated = lessons.length > 0 && lessons.every(l => l.is_generated);

  const handleSelectCourse = (contextId: string) => {
    setActiveContextId(contextId);
    setActiveLessonIndex(null);
    setLessons([]);
    setCurrentLessonIndex(0);
  };

  return (
    <>
      <CourseSelector
        courses={allContexts}
        activeContextId={activeContextId}
        onSelectCourse={handleSelectCourse}
      />
      <LessonsList
        lessons={lessons}
        currentIndex={currentLessonIndex}
        onSelectLesson={async (index) => {
          const lesson = lessons[index];
          if (!lesson) return;
          if (!lesson.is_generated) await generateLessonContent(index);
          setActiveLessonIndex(index);
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
              { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
                body: JSON.stringify({ userId: currentUser, action: "updateProgress", lessonIndex: index }) });
          } catch (error) { console.error("Error updating progress:", error); }
        }}
        onBack={() => {}}
        isGenerating={isGeneratingLesson}
        showBackButton={false}
        onRegenerate={handleGenerateLessons}
        isRegenerating={isGenerating}
        showFinalTest={allGenerated}
        onStartFinalTest={handleStartFinalTest}
        isLoadingFinalTest={isLoadingFinalTest}
      />

      {activeLessonIndex !== null && currentLesson && currentLesson.is_generated && !isGeneratingLesson && (
        <FullscreenLesson
          lesson={{ ...currentLesson, duration: 5 }}
          lessonNumber={activeLessonIndex + 1}
          totalLessons={lessons.length}
          onClose={() => setActiveLessonIndex(null)}
          onComplete={async () => {
            if (activeLessonIndex < lessons.length - 1) {
              const nextIndex = activeLessonIndex + 1;
              const nextLesson = lessons[nextIndex];
              if (nextLesson && !nextLesson.is_generated) await generateLessonContent(nextIndex);
              setCurrentLessonIndex(nextIndex); setActiveLessonIndex(nextIndex);
              try {
                const { data: { session } } = await supabase.auth.getSession();
                const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
                await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
                  { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
                    body: JSON.stringify({ userId: currentUser, action: "updateProgress", lessonIndex: nextIndex }) });
              } catch (error) { console.error("Error updating progress:", error); }
            } else { setActiveLessonIndex(null); handleStartFinalTest(); }
          }}
          isLastLesson={activeLessonIndex === lessons.length - 1}
        />
      )}

      {showFinalTest && finalTestExercises.length > 0 && (
        <FinalTest
          exercises={finalTestExercises}
          onClose={() => setShowFinalTest(false)}
          onComplete={() => { setShowFinalTest(false);
            toast({ title: "Complimenti! 🎉", description: "Hai completato il percorso e il test finale!" }); }}
        />
      )}
    </>
  );
}
