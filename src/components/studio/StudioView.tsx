import { useState, useEffect, useCallback } from "react";
import { MiniLesson } from "./MiniLesson";
import { LessonsList } from "./LessonsList";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, List, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Exercise } from "./exercises/ExerciseRenderer";
import { supabase } from "@/integrations/supabase/client";

interface StudioViewProps {
  hasFiles: boolean;
  onUploadClick: () => void;
  selectedContextId?: string | null;
  onClearContext?: () => void;
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
  const [showList, setShowList] = useState(false);
  const [contextFileName, setContextFileName] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [contextStatus, setContextStatus] = useState<string | null>(null);

  const fetchLessons = useCallback(async () => {
    if (!currentUser || !hasFiles) return;

    setIsLoading(true);
    try {
      // Get OAuth session token if available
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // If a specific context is selected, fetch only its lessons
      const body: Record<string, unknown> = { userId: currentUser, action: "get" };
      if (selectedContextId) {
        body.contextId = selectedContextId;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (response.ok && data.lessons) {
        setLessons(data.lessons);
        setCurrentLessonIndex(data.currentIndex || 0);
      }

      // Always check context status and name
      const contextsResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ userId: currentUser, action: "listContexts" }),
        }
      );
      const contextsData = await contextsResponse.json();
      if (contextsData.contexts && contextsData.contexts.length > 0) {
        // Find context - either selected or the first one
        const ctx = selectedContextId 
          ? contextsData.contexts.find((c: { id: string }) => c.id === selectedContextId)
          : contextsData.contexts[0];
        
        if (ctx) {
          setContextFileName(ctx.file_name || null);
          setContextStatus(ctx.processing_status || null);
        }
      } else {
        setContextFileName(null);
        setContextStatus(null);
      }
    } catch (error) {
      console.error("Error fetching lessons:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, hasFiles, selectedContextId]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  // Keep index always within bounds (prevents undefined currentLesson during refresh/regenerate)
  useEffect(() => {
    if (lessons.length === 0) return;
    setCurrentLessonIndex((idx) => {
      if (idx < 0) return 0;
      if (idx > lessons.length - 1) return lessons.length - 1;
      return idx;
    });
  }, [lessons.length]);

  // Auto-generate current lesson content if it exists but hasn't been generated yet
  useEffect(() => {
    if (lessons.length === 0) return;
    const lesson = lessons[currentLessonIndex];
    if (!lesson) return;
    if (lesson.is_generated) return;
    if (isGeneratingLesson) return; // Already generating
    if (isGenerating) return; // Generating the whole plan

    generateLessonContent(currentLessonIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLessonIndex, lessons, isGeneratingLesson, isGenerating]);

  const handleGenerateLessons = async () => {
    if (!currentUser) return;

    setIsGenerating(true);
    try {
      // Get OAuth session token if available
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ 
            userId: currentUser,
            ...(selectedContextId ? { contextId: selectedContextId } : {}),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nella generazione");
      }

      toast({
        title: "Percorso creato!",
        description: `Creato un percorso con ${data.lessonsCount} mini-lezioni.`,
      });

      await fetchLessons();
    } catch (error) {
      console.error("Error generating lessons:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore nella generazione",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateLessonContent = async (lessonIndex: number) => {
    if (!currentUser) return null;

    setIsGeneratingLesson(true);
    try {
      // Get OAuth session token if available
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const body: Record<string, unknown> = { 
        userId: currentUser, 
        action: "generateLesson",
        lessonIndex 
      };
      if (selectedContextId) {
        body.contextId = selectedContextId;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nella generazione");
      }

      // Update local state with the new lesson
      if (data.lesson) {
        setLessons(prev => prev.map(l => 
          l.lesson_order === lessonIndex ? data.lesson : l
        ));
      }

      return data.lesson;
    } catch (error) {
      console.error("Error generating lesson:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore nella generazione",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGeneratingLesson(false);
    }
  };

  const handleNext = async () => {
    if (currentLessonIndex < lessons.length - 1) {
      const newIndex = currentLessonIndex + 1;

      // Check if next lesson needs generation
      const nextLesson = lessons[newIndex];
      if (!nextLesson) return;
      if (!nextLesson.is_generated) {
        await generateLessonContent(newIndex);
      }

      setCurrentLessonIndex(newIndex);

      // Update progress in database
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              userId: currentUser,
              action: "updateProgress",
              lessonIndex: newIndex,
            }),
          }
        );
      } catch (error) {
        console.error("Error updating progress:", error);
      }
    } else {
      // Course completed
      toast({
        title: "Complimenti! 🎉",
        description: "Hai completato tutte le lezioni del corso!",
      });
    }
  };

  const handleSelectLesson = async (index: number) => {
    const selectedLesson = lessons[index];
    if (!selectedLesson) return;

    // Generate if not yet generated
    if (!selectedLesson.is_generated) {
      await generateLessonContent(index);
    }
    
    setCurrentLessonIndex(index);
    setShowList(false);

    // Update progress
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            userId: currentUser,
            action: "updateProgress",
            lessonIndex: index,
          }),
        }
      );
    } catch (error) {
      console.error("Error updating progress:", error);
    }
  };

  if (!hasFiles) {
    return <EmptyState onUploadClick={onUploadClick} />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-4">
        <div className="w-20 h-20 rounded-[1.75rem] gradient-primary flex items-center justify-center animate-pulse-soft shadow-glass-lg">
          <Loader2 className="w-9 h-9 text-white animate-spin" />
        </div>
        <p className="text-muted-foreground font-medium font-heading">Caricamento lezioni...</p>
        <div className="w-32 h-1.5 bg-muted/30 rounded-full overflow-hidden backdrop-blur-sm">
          <div className="h-full progress-animated rounded-full w-2/3" />
        </div>
      </div>
    );
  }

  if (lessons.length === 0) {
    // Check if PDF is still processing
    const isPdfProcessing = contextStatus === "pending" || contextStatus === "processing";
    const isPdfFailed = contextStatus === "failed";

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-6 text-center">
        <div className={`w-20 h-20 rounded-[1.75rem] flex items-center justify-center shadow-glass-lg ${
          isPdfProcessing ? "gradient-primary animate-pulse-soft" : 
          isPdfFailed ? "glass-accent" : "glass-tertiary"
        }`}>
          {isPdfProcessing ? (
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          ) : (
            <RefreshCw className={`w-10 h-10 ${isPdfFailed ? "text-destructive" : "text-tertiary"}`} />
          )}
        </div>
        <div>
          <h3 className="font-heading text-xl font-bold mb-2">
            {isPdfProcessing ? "Elaborazione PDF in corso..." : 
             isPdfFailed ? "Errore nell'elaborazione" :
             "Nessuna lezione disponibile"}
          </h3>
          <p className="text-muted-foreground max-w-xs">
            {isPdfProcessing ? "Attendi qualche secondo mentre analizziamo il tuo documento." :
             isPdfFailed ? "Si è verificato un errore. Prova a ricaricare il file." :
             "L'AI analizzerà i tuoi materiali e creerà un percorso di mini-lezioni personalizzato."}
          </p>
          {contextFileName && (
            <p className="text-sm text-primary font-medium mt-2 glass-primary inline-block px-3 py-1 rounded-full">{contextFileName}</p>
          )}
        </div>
        
        {isPdfProcessing ? (
          <Button 
            onClick={fetchLessons}
            variant="outline"
            className="h-12 px-6 font-semibold rounded-2xl glass-subtle border-border/30 hover:shadow-glass transition-all"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna stato
          </Button>
        ) : (
          <Button 
            onClick={handleGenerateLessons} 
            disabled={isGenerating}
            className="h-12 px-6 font-semibold gradient-primary text-white border-0 shadow-glass-lg rounded-2xl hover:shadow-glass-xl hover:scale-105 transition-all duration-300 glow-ring"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analisi in corso...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Genera percorso
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  if (showList) {
    return (
      <LessonsList
        lessons={lessons}
        currentIndex={currentLessonIndex}
        onSelectLesson={handleSelectLesson}
        onBack={() => setShowList(false)}
        isGenerating={isGeneratingLesson}
      />
    );
  }

  const currentLesson = lessons[currentLessonIndex];
  const progress = ((currentLessonIndex + 1) / lessons.length) * 100;

  // If lessons changed during a refresh, we may briefly have an out-of-bounds index.
  // The clamping useEffect above will fix it on the next tick.
  if (!currentLesson) return null;

  // Show loading if current lesson needs generation
  if (!currentLesson.is_generated || isGeneratingLesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-6">
        <div className="w-20 h-20 rounded-[1.75rem] gradient-primary flex items-center justify-center shadow-glass-xl animate-pulse-soft glow-ring">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <p className="font-heading font-semibold text-lg mb-2">
            Generazione lezione in corso...
          </p>
          <p className="text-sm text-muted-foreground max-w-xs">
            L'AI sta creando "<span className="text-primary font-medium">{currentLesson.title}</span>" con esercizi interattivi
          </p>
        </div>
        <div className="w-full max-w-xs h-2.5 bg-muted/30 rounded-full overflow-hidden backdrop-blur-sm">
          <div className="h-full progress-animated rounded-full w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-28">
      {/* List toggle button */}
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowList(true)}
          className="rounded-xl glass-subtle border-border/30 shadow-glass hover:shadow-glass-md transition-all duration-300"
        >
          <List className="w-4 h-4 mr-2" />
          Tutte le lezioni ({lessons.length})
        </Button>
      </div>

      <MiniLesson
        lesson={{
          ...currentLesson,
          duration: 5,
        }}
        progress={progress}
        totalLessons={lessons.length}
        currentIndex={currentLessonIndex}
        onNext={handleNext}
        isLastLesson={currentLessonIndex === lessons.length - 1}
      />
      
      {/* Regenerate button */}
      <div className="mt-6 flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateLessons}
          disabled={isGenerating}
          className="glass-subtle rounded-xl border-border/30 hover:shadow-glass transition-all duration-300"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Rigenera percorso
        </Button>
      </div>
    </div>
  );
}
