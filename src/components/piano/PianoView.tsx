import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanItem } from "./PlanItem";
import { PlanSuggestion } from "./PlanSuggestion";
import { AddEventSheet } from "./AddEventSheet";
import { EmptyState } from "@/components/shared/EmptyState";

interface PianoViewProps {
  hasFiles: boolean;
  onUploadClick: () => void;
}

// Demo data
const demoEvents = [
  {
    id: "1",
    subject: "Biologia",
    title: "Verifica sulla Fotosintesi",
    date: "28 Gen",
    type: "test" as const,
  },
  {
    id: "2",
    subject: "Biologia",
    title: "Studio: Capitolo 3",
    date: "25 Gen",
    time: "16:00",
    type: "study" as const,
  },
  {
    id: "3",
    subject: "Biologia",
    title: "Studio: Capitolo 4",
    date: "26 Gen",
    time: "16:00",
    type: "study" as const,
  },
  {
    id: "4",
    subject: "Matematica",
    title: "Esercizi sulle derivate",
    date: "27 Gen",
    type: "assignment" as const,
  },
];

export function PianoView({ hasFiles, onUploadClick }: PianoViewProps) {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(hasFiles);
  const [events, setEvents] = useState(demoEvents);

  if (!hasFiles) {
    return <EmptyState onUploadClick={onUploadClick} />;
  }

  const handleAddEvent = (event: {
    subject: string;
    title: string;
    date: string;
    type: "test" | "assignment";
  }) => {
    const newEvent = {
      id: String(events.length + 1),
      ...event,
    };
    setEvents([...events, newEvent]);
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* AI Suggestion */}
      {showSuggestion && (
        <PlanSuggestion
          explanation="Ti propongo questo piano perché hai una verifica di Biologia tra 3 giorni. Ho distribuito lo studio dei capitoli 3 e 4 nei prossimi due giorni, lasciando il giorno prima per il ripasso finale."
          onAccept={() => setShowSuggestion(false)}
          onDecline={() => setShowSuggestion(false)}
        />
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
      <div className="space-y-3">
        {events.map((event) => (
          <PlanItem key={event.id} item={event} />
        ))}
      </div>

      {/* Add Event Sheet */}
      <AddEventSheet
        open={showAddSheet}
        onOpenChange={setShowAddSheet}
        onAdd={handleAddEvent}
      />
    </div>
  );
}
