import { useState, useEffect, useCallback } from "react";
import { MiniLesson } from "./MiniLesson";
import { LessonsList } from "./LessonsList";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Exercise } from "./exercises/ExerciseRenderer";

interface StudioViewProps {
  hasFiles: boolean;
  onUploadClick: () => void;
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
}

export function StudioView({ hasFiles, onUploadClick }: StudioViewProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [showList, setShowList] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const fetchLessons = useCallback(async () => {
    if (!currentUser || !hasFiles) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ userId: currentUser, action: "get" }),
        }
      );

      const data = await response.json();

      if (response.ok && data.lessons) {
        setLessons(data.lessons);
        setCurrentLessonIndex(data.currentIndex || 0);
      }
    } catch (error) {
      console.error("Error fetching lessons:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, hasFiles]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  const handleGenerateLessons = async () => {
    if (!currentUser) return;

    setIsGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ userId: currentUser }),
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
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            userId: currentUser, 
            action: "generateLesson",
            lessonIndex 
          }),
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
      if (!nextLesson.is_generated) {
        await generateLessonContent(newIndex);
      }
      
      setCurrentLessonIndex(newIndex);

      // Update progress in database
      try {
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
    
    // Generate if not yet generated
    if (!selectedLesson.is_generated) {
      await generateLessonContent(index);
    }
    
    setCurrentLessonIndex(index);
    setShowList(false);

    // Update progress
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lessons`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground">Caricamento lezioni...</p>
      </div>
    );
  }

  if (lessons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Nessuna lezione disponibile</h3>
        <p className="text-muted-foreground max-w-xs">
          L'AI analizzerà i tuoi materiali e creerà un percorso di mini-lezioni personalizzato.
        </p>
        <Button onClick={handleGenerateLessons} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analisi in corso...
            </>
          ) : (
            "Genera percorso"
          )}
        </Button>
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

  // Show loading if current lesson needs generation
  if (!currentLesson.is_generated || isGeneratingLesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-center">
          Generazione lezione in corso...
        </p>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          L'AI sta creando la lezione "{currentLesson.title}" con esercizi interattivi
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      {/* List toggle button */}
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowList(true)}
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
