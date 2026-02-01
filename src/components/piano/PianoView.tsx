import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { PlanItem } from "./PlanItem";
import { PlanSuggestion } from "./PlanSuggestion";
import { AddEventSheet } from "./AddEventSheet";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [eventToDelete, setEventToDelete] = useState<StudyEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDeleteEvent = async () => {
    if (!eventToDelete || !currentUser) return;

    setIsDeleting(true);
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
            action: "delete",
            events: [eventToDelete.id],
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Errore nell'eliminazione dell'evento");
      }

      toast({
        title: "Evento eliminato",
        description: `${eventToDelete.title} è stato rimosso dal calendario.`,
      });

      setEventToDelete(null);
      await fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore nell'eliminazione",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "d MMM", { locale: it });
  };

  // Get events for selected date
  const selectedDateEvents = selectedDate
    ? events.filter(event => isSameDay(new Date(event.event_date), selectedDate))
    : [];

  // Get dates that have events (for calendar highlighting)
  const eventDates = events.map(e => new Date(e.event_date));

  // Custom day render for calendar
  const modifiers = {
    hasEvent: eventDates,
    hasTest: events.filter(e => e.event_type === "test").map(e => new Date(e.event_date)),
    hasAssignment: events.filter(e => e.event_type === "assignment").map(e => new Date(e.event_date)),
    hasStudy: events.filter(e => e.event_type === "study").map(e => new Date(e.event_date)),
  };

  const modifiersStyles = {
    hasTest: { 
      backgroundColor: "hsl(var(--accent) / 0.15)",
      borderRadius: "50%",
    },
    hasAssignment: { 
      backgroundColor: "hsl(var(--tertiary) / 0.15)",
      borderRadius: "50%",
    },
    hasStudy: { 
      backgroundColor: "hsl(var(--primary) / 0.15)",
      borderRadius: "50%",
    },
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
          variant="outline"
          onClick={generatePlan}
          disabled={isGeneratingPlan}
          className="w-full glass-subtle border-primary/20 hover:bg-primary/5"
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

      {/* Calendar */}
      <div className="glass-subtle rounded-2xl p-4 shadow-glass">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          locale={it}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          className="rounded-xl pointer-events-auto w-full"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4 w-full",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-sm font-heading font-semibold",
            nav: "space-x-1 flex items-center",
            nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-xl hover:bg-muted transition-colors",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex w-full",
            head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-10 w-full text-center text-sm p-0 relative",
            day: "h-10 w-10 p-0 font-normal mx-auto rounded-xl hover:bg-muted transition-colors",
            day_range_end: "day-range-end",
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent/20 text-accent-foreground font-semibold",
            day_outside: "opacity-30",
            day_disabled: "opacity-30",
            day_hidden: "invisible",
          }}
        />
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border/50 justify-center">
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-full bg-primary/30" />
            <span className="text-muted-foreground">Studio</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-full bg-accent/30" />
            <span className="text-muted-foreground">Verifica</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-full bg-tertiary/30" />
            <span className="text-muted-foreground">Compito</span>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold">
          {selectedDate 
            ? format(selectedDate, "d MMMM yyyy", { locale: it })
            : "Prossimi eventi"
          }
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddSheet(true)}
          className="rounded-xl"
        >
          <Plus className="w-4 h-4 mr-1" />
          Aggiungi
        </Button>
      </div>

      {/* Events List for Selected Date */}
      {selectedDate && selectedDateEvents.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground glass-subtle rounded-2xl">
          <p>Nessun evento per questa data.</p>
          <Button 
            variant="link" 
            onClick={() => setShowAddSheet(true)}
            className="mt-2 text-primary"
          >
            Aggiungi un evento
          </Button>
        </div>
      ) : selectedDate && selectedDateEvents.length > 0 ? (
        <div className="space-y-3">
          {selectedDateEvents.map((event) => (
            <div key={event.id} className="relative group">
              <PlanItem
                item={{
                  id: event.id,
                  subject: event.subject,
                  title: event.title,
                  date: formatDate(event.event_date),
                  time: event.event_time,
                  type: event.event_type,
                }}
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -right-2 -top-2 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-glass-md"
                onClick={(e) => {
                  e.stopPropagation();
                  setEventToDelete(event);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        /* All upcoming events when no date selected */
        events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground glass-subtle rounded-2xl">
            <p>Nessun evento in programma.</p>
            <p className="text-sm mt-1">Aggiungi verifiche e compiti per generare un piano di studio.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.slice(0, 5).map((event) => (
              <div key={event.id} className="relative group">
                <PlanItem
                  item={{
                    id: event.id,
                    subject: event.subject,
                    title: event.title,
                    date: formatDate(event.event_date),
                    time: event.event_time,
                    type: event.event_type,
                  }}
                  onClick={() => setSelectedDate(new Date(event.event_date))}
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -right-2 -top-2 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-glass-md"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEventToDelete(event);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Add Event Sheet */}
      <AddEventSheet
        open={showAddSheet}
        onOpenChange={setShowAddSheet}
        onAdd={handleAddEvent}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
        <AlertDialogContent className="glass-strong border-0 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">Elimina evento</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare "{eventToDelete?.title}"? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isDeleting}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteEvent} 
              className="bg-destructive text-destructive-foreground rounded-xl"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Elimina"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
