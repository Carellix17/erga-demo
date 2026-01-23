import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanItem } from "./PlanItem";
import { PlanSuggestion } from "./PlanSuggestion";
import { AddEventSheet } from "./AddEventSheet";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface PianoViewProps {
  hasFiles: boolean;
  onUploadClick: () => void;
}

interface StudyEvent {
  id: string;
  subject: string;
  title: string;
  event_date: string;
  event_time?: string;
  event_type: "test" | "assignment" | "study";
}

interface PlanSuggestionData {
  explanation: string;
  studySessions: {
    subject: string;
    title: string;
    date: string;
    time?: string;
  }[];
}

export function PianoView({ hasFiles, onUploadClick }: PianoViewProps) {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [events, setEvents] = useState<StudyEvent[]>([]);
  const [suggestion, setSuggestion] = useState<PlanSuggestionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const fetchEvents = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-event`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ userId: currentUser, action: "list" }),
        }
      );

      const data = await response.json();

      if (response.ok && data.events) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (hasFiles) {
      fetchEvents();
    }
  }, [hasFiles, fetchEvents]);

  const generatePlan = async () => {
    if (!currentUser) return;

    setIsGeneratingPlan(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-plan`,
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
        throw new Error(data.error || "Errore nella generazione del piano");
      }

      setSuggestion(data.plan);
    } catch (error) {
      console.error("Error generating plan:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore nella generazione",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleAcceptPlan = async () => {
    if (!suggestion || !currentUser) return;

    try {
      const studyEvents = suggestion.studySessions.map(session => ({
        subject: session.subject,
        title: session.title,
        date: session.date,
        time: session.time,
        type: "study" as const,
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-event`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            userId: currentUser,
            action: "add",
            events: studyEvents,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Errore nel salvataggio del piano");
      }

      toast({
        title: "Piano accettato!",
        description: "Le sessioni di studio sono state aggiunte al tuo calendario.",
      });

      setSuggestion(null);
      await fetchEvents();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore nel salvataggio",
        variant: "destructive",
      });
    }
  };

  const handleAddEvent = async (event: {
    subject: string;
    title: string;
    date: string;
    type: "test" | "assignment";
  }) => {
    if (!currentUser) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-event`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            userId: currentUser,
            action: "add",
            events: [event],
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Errore nel salvataggio dell'evento");
      }

      toast({
        title: "Evento aggiunto",
        description: `${event.title} è stato aggiunto al calendario.`,
      });

      await fetchEvents();
    } catch (error) {
      console.error("Error adding event:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore nel salvataggio",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  };

  if (!hasFiles) {
    return <EmptyState onUploadClick={onUploadClick} />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground">Caricamento eventi...</p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* AI Suggestion */}
      {suggestion && (
        <PlanSuggestion
          explanation={suggestion.explanation}
          onAccept={handleAcceptPlan}
          onDecline={() => setSuggestion(null)}
        />
      )}

      {/* Generate Plan Button */}
      {!suggestion && (
        <Button
          variant="tonal"
          onClick={generatePlan}
          disabled={isGeneratingPlan}
          className="w-full"
        >
          {isGeneratingPlan ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generazione piano...
            </>
          ) : (
            "🪄 Genera piano di studio AI"
          )}
        </Button>
      )}

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Prossimi eventi</h2>
        <Button
          variant="tonal"
          size="sm"
          onClick={() => setShowAddSheet(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Aggiungi
        </Button>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Nessun evento in programma.</p>
          <p className="text-sm">Aggiungi verifiche e compiti per generare un piano di studio.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <PlanItem
              key={event.id}
              item={{
                id: event.id,
                subject: event.subject,
                title: event.title,
                date: formatDate(event.event_date),
                time: event.event_time,
                type: event.event_type,
              }}
            />
          ))}
        </div>
      )}

      {/* Add Event Sheet */}
      <AddEventSheet
        open={showAddSheet}
        onOpenChange={setShowAddSheet}
        onAdd={handleAddEvent}
      />
    </div>
  );
}
