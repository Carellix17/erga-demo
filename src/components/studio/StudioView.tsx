import { useState, useEffect, useCallback } from "react";
import { MiniLesson } from "./MiniLesson";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StudioViewProps {
  hasFiles: boolean;
  onUploadClick: () => void;
}

interface Lesson {
  id: string;
  title: string;
  concept: string;
  explanation: string;
  question: string;
}

export function StudioView({ hasFiles, onUploadClick }: StudioViewProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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
        title: "Lezioni generate!",
        description: `Create ${data.lessonsCount} nuove mini-lezioni.`,
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

  const handleNext = async () => {
    if (currentLessonIndex < lessons.length - 1) {
      const newIndex = currentLessonIndex + 1;
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
          Genera le mini-lezioni basate sui tuoi materiali di studio caricati.
        </p>
        <Button onClick={handleGenerateLessons} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generazione in corso...
            </>
          ) : (
            "Genera lezioni"
          )}
        </Button>
      </div>
    );
  }

  const currentLesson = lessons[currentLessonIndex];
  const progress = ((currentLessonIndex + 1) / lessons.length) * 100;

  return (
    <div className="p-4 pb-24">
      <MiniLesson
        lesson={{
          ...currentLesson,
          duration: 5,
        }}
        progress={progress}
        totalLessons={lessons.length}
        currentIndex={currentLessonIndex}
        onNext={handleNext}
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
          Rigenera lezioni
        </Button>
      </div>
    </div>
  );
}
