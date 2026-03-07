import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { PlanItem } from "./PlanItem";
import { PlanSuggestion } from "./PlanSuggestion";
import { AddEventSheet } from "./AddEventSheet";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface PianoViewProps { hasFiles: boolean; onUploadClick: () => void; }
interface StudyEvent { id: string; subject: string; title: string; event_date: string; event_time?: string; event_type: "test" | "assignment" | "study"; }
interface PlanSuggestionData { explanation: string; studySessions: { subject: string; title: string; date: string; time?: string; }[]; }

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
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-event`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, action: "list" }) });
      const data = await response.json();
      if (response.ok && data.events) setEvents(data.events);
    } catch (error) { console.error("Error fetching events:", error); }
    finally { setIsLoading(false); }
  }, [currentUser]);

  useEffect(() => { if (hasFiles) fetchEvents(); }, [hasFiles, fetchEvents]);

  const generatePlan = async () => {
    if (!currentUser) return;
    setIsGeneratingPlan(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-plan`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore nella generazione del piano");
      setSuggestion(data.plan);
    } catch (error) { console.error("Error generating plan:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella generazione", variant: "destructive" });
    } finally { setIsGeneratingPlan(false); }
  };

  const handleAcceptPlan = async () => {
    if (!suggestion || !currentUser) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const studyEvents = suggestion.studySessions.map(s => ({ subject: s.subject, title: s.title, date: s.date, time: s.time, type: "study" as const }));
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-event`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, action: "add", events: studyEvents }) });
      if (!response.ok) throw new Error("Errore nel salvataggio del piano");
      toast({ title: "Piano accettato!", description: "Le sessioni di studio sono state aggiunte al tuo calendario." });
      setSuggestion(null); await fetchEvents();
    } catch (error) { console.error("Error saving plan:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nel salvataggio", variant: "destructive" }); }
  };

  const handleAddEvent = async (event: { subject: string; title: string; date: string; type: "test" | "assignment"; }) => {
    if (!currentUser) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-event`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, action: "add", events: [event] }) });
      if (!response.ok) throw new Error("Errore nel salvataggio dell'evento");
      toast({ title: "Evento aggiunto", description: `${event.title} è stato aggiunto al calendario.` });
      await fetchEvents();
    } catch (error) { console.error("Error adding event:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nel salvataggio", variant: "destructive" }); }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete || !currentUser) return;
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-event`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, action: "delete", events: [eventToDelete.id] }) });
      if (!response.ok) throw new Error("Errore nell'eliminazione dell'evento");
      toast({ title: "Evento eliminato", description: `${eventToDelete.title} è stato rimosso dal calendario.` });
      setEventToDelete(null); await fetchEvents();
    } catch (error) { console.error("Error deleting event:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nell'eliminazione", variant: "destructive" });
    } finally { setIsDeleting(false); }
  };

  const formatDate = (dateString: string) => format(new Date(dateString), "d MMM", { locale: it });

  const selectedDateEvents = selectedDate ? events.filter(event => isSameDay(new Date(event.event_date), selectedDate)) : [];
  const eventDates = events.map(e => new Date(e.event_date));

  const modifiers = {
    hasEvent: eventDates,
    hasTest: events.filter(e => e.event_type === "test").map(e => new Date(e.event_date)),
    hasAssignment: events.filter(e => e.event_type === "assignment").map(e => new Date(e.event_date)),
    hasStudy: events.filter(e => e.event_type === "study").map(e => new Date(e.event_date)),
  };

  const modifiersStyles = {
    hasTest: { backgroundColor: "hsl(var(--secondary-container))", borderRadius: "50%" },
    hasAssignment: { backgroundColor: "hsl(var(--tertiary-container))", borderRadius: "50%" },
    hasStudy: { backgroundColor: "hsl(var(--primary-container))", borderRadius: "50%" },
  };

  if (!hasFiles) return <EmptyState onUploadClick={onUploadClick} />;

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center shadow-level-3 animate-pulse-soft">
        <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
      </div>
      <p className="text-muted-foreground font-display font-medium">Caricamento eventi...</p>
    </div>
  );

  return (
    <div className="p-4 pb-28 space-y-4 animate-fade-up">
      {suggestion && (
        <PlanSuggestion explanation={suggestion.explanation} onAccept={handleAcceptPlan} onDecline={() => setSuggestion(null)} />
      )}

      {!suggestion && (
        <Button variant="outline" onClick={generatePlan} disabled={isGeneratingPlan} className="w-full h-12 border-primary/30 hover:bg-primary-container hover:shadow-level-1 transition-all duration-300">
          {isGeneratingPlan ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generazione piano...</> : "🪄 Genera piano di studio AI"}
        </Button>
      )}

      {/* Calendar */}
      <div className="m3-card-elevated rounded-xl p-4">
        <Calendar
          mode="single" selected={selectedDate} onSelect={setSelectedDate} locale={it}
          modifiers={modifiers} modifiersStyles={modifiersStyles}
          className="rounded-xl pointer-events-auto w-full"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4 w-full",
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-sm font-display font-semibold",
            nav: "space-x-1 flex items-center",
            nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-xl hover:bg-surface-container-highest transition-all",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex w-full",
            head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
            row: "flex w-full mt-2",
            cell: "h-10 w-full text-center text-sm p-0 relative",
            day: "h-10 w-10 p-0 font-normal mx-auto rounded-xl hover:bg-surface-container-highest transition-all duration-200",
            day_selected: "bg-primary text-primary-foreground hover:text-primary-foreground focus:text-primary-foreground shadow-level-1",
            day_today: "bg-secondary-container text-foreground font-semibold",
            day_outside: "opacity-30",
            day_disabled: "opacity-30",
            day_hidden: "invisible",
          }}
        />
        
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-outline-variant justify-center">
          {[
            { label: "Studio", cls: "bg-primary-container" },
            { label: "Verifica", cls: "bg-secondary-container" },
            { label: "Compito", cls: "bg-tertiary-container" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5 label-small px-2.5 py-1 rounded-full bg-surface-container">
              <div className={`w-2.5 h-2.5 rounded-full ${item.cls}`} />
              <span className="text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="title-medium font-display font-semibold">
          {selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: it }) : "Prossimi eventi"}
        </h2>
        <Button variant="outline" size="sm" onClick={() => setShowAddSheet(true)}>
          <Plus className="w-4 h-4 mr-1" />Aggiungi
        </Button>
      </div>

      {/* Events */}
      {selectedDate && selectedDateEvents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground m3-card-elevated rounded-xl">
          <p className="body-large font-medium">Nessun evento per questa data.</p>
          <Button variant="link" onClick={() => setShowAddSheet(true)} className="mt-2 text-primary">Aggiungi un evento</Button>
        </div>
      ) : selectedDate && selectedDateEvents.length > 0 ? (
        <div className="space-y-3">
          {selectedDateEvents.map((event, i) => (
            <div key={event.id} className={`relative group animate-fade-up animate-stagger-${Math.min(i + 1, 5)}`}>
              <PlanItem item={{ id: event.id, subject: event.subject, title: event.title, date: formatDate(event.event_date), time: event.event_time, type: event.event_type }} />
              <Button variant="destructive" size="icon"
                className="absolute -right-2 -top-2 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-level-2 scale-0 group-hover:scale-100"
                onClick={(e) => { e.stopPropagation(); setEventToDelete(event); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        events.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground m3-card-elevated rounded-xl">
            <p className="body-large font-medium">Nessun evento in programma.</p>
            <p className="body-small mt-1">Aggiungi verifiche e compiti per generare un piano di studio.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.slice(0, 5).map((event, i) => (
              <div key={event.id} className={`relative group animate-fade-up animate-stagger-${Math.min(i + 1, 5)}`}>
                <PlanItem item={{ id: event.id, subject: event.subject, title: event.title, date: formatDate(event.event_date), time: event.event_time, type: event.event_type }}
                  onClick={() => setSelectedDate(new Date(event.event_date))} />
                <Button variant="destructive" size="icon"
                  className="absolute -right-2 -top-2 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-level-2 scale-0 group-hover:scale-100"
                  onClick={(e) => { e.stopPropagation(); setEventToDelete(event); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )
      )}

      <AddEventSheet open={showAddSheet} onOpenChange={setShowAddSheet} onAdd={handleAddEvent} />

      <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina evento</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare "{eventToDelete?.title}"? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent} className="bg-destructive hover:bg-destructive/90" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
