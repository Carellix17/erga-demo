import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUserSubjects } from "@/hooks/useUserSubjects";
import { useFileContextsQuery } from "@/hooks/useFileContexts";
import { PillToggle } from "@/components/ui/pill-toggle";
import { resolveSubjectColor } from "@/lib/subjectColors";
import type { Evaluation, EvaluationType } from "@/hooks/useEvaluations";
import { cn } from "@/lib/utils";

/**
 * 🎨 P46 — "Aggiungi evento" con TRE tab: Verifica, Compito, Altro.
 * Lo stato dei campi è unico e sopravvive al cambio tab (niente perdite).
 * "Altro" = impegno non scolastico che blocca lo studio: viene salvato come
 * evento di tipo "assignment" con materia "Altro" (compatibile con le
 * colonne study_events esistenti, nessuna migrazione richiesta).
 */

type Category = "verifica" | "compito" | "altro";
type VerificaMode = Exclude<EvaluationType, "compito">;

const VERIFICA_MODES: { value: VerificaMode; label: string }[] = [
  { value: "orale", label: "Orale" },
  { value: "scritta", label: "Scritta" },
  { value: "pratica", label: "Pratica" },
  { value: "interrogazione", label: "Presentazione" },
];

const NONE = "__none__";

export interface EvalFormInput {
  type: EvaluationType;
  title: string;
  description?: string;
  date: string;
  subject_id: string | null;
  topic_type: "linked" | "free";
  topic_id?: string | null;
  free_topic_title?: string | null;
  goal?: number | null;
  /** P46: "altro" = impegno extra-scolastico (salvato come study_event). */
  category?: Category;
  /** "HH:MM" di inizio e fine (la fine va in descrizione: il DB ha un solo orario). */
  startTime?: string | null;
  endTime?: string | null;
}

interface AddEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Evaluation | null;
  onSubmit: (input: EvalFormInput, editingId: string | null) => Promise<void> | void;
}

export function AddEventSheet({ open, onOpenChange, initial, onSubmit }: AddEventSheetProps) {
  const { t } = useTranslation();
  const editingId = initial?.id ?? null;

  const [category, setCategory] = useState<Category>("verifica");
  const [mode, setMode] = useState<VerificaMode>("scritta");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [subjectId, setSubjectId] = useState<string>(NONE);
  const [topicMode, setTopicMode] = useState<"linked" | "free">("free");
  const [courseId, setCourseId] = useState<string>("");
  const [freeTopic, setFreeTopic] = useState("");
  const [goal, setGoal] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: subjects = [] } = useUserSubjects();
  const { data: courses = [] } = useFileContextsQuery();

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const isCompito = initial.type === "compito";
      setCategory(isCompito ? "compito" : "verifica");
      setMode(isCompito ? "scritta" : (initial.type as VerificaMode));
      setTitle(initial.title);
      setDescription(initial.description ?? "");
      setDate(initial.date ? initial.date.slice(0, 10) : "");
      if (initial.date) {
        const d = new Date(initial.date);
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        setTime(hh === "12" && mm === "00" ? "" : `${hh}:${mm}`);
      } else {
        setTime("");
      }
      setEndTime("");
      setSubjectId(initial.subject_id ?? NONE);
      setTopicMode(initial.topic_type);
      setCourseId(initial.topic_type === "linked" ? (initial.topic_id ?? "") : "");
      setFreeTopic(initial.free_topic_title ?? "");
      setGoal(initial.goal ?? null);
      setShowNotes(!!initial.description || initial.goal != null);
    } else {
      setCategory("verifica"); setMode("scritta"); setTitle(""); setDescription("");
      setDate(""); setTime(""); setEndTime(""); setSubjectId(NONE);
      setTopicMode("free"); setCourseId(""); setFreeTopic("");
      setGoal(null); setShowNotes(false);
    }
  }, [open, initial]);

  /** Descrizione + eventuale "fino alle" (il DB ha un solo orario per evento). */
  const descriptionWithEnd = () => {
    const base = description.trim();
    if (!endTime || endTime === time || category === "compito") return base || undefined;
    return `${base ? `${base} · ` : ""}${t("piano.sheet.until")} ${endTime}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validazione per categoria: mai stringhe vuote verso il DB
    if (category === "compito") {
      if (!description.trim() || !date) return;
    } else if (!title.trim() || !date) {
      return;
    }
    setSubmitting(true);
    try {
      if (category === "altro") {
        await onSubmit({
          type: "compito", // mai usato: il campo category="altro" instrada su study_events
          category: "altro",
          title: title.trim(),
          description: descriptionWithEnd(),
          date: new Date(`${date}T${time ? `${time}:00` : "12:00:00"}`).toISOString(),
          subject_id: null,
          topic_type: "free",
          startTime: time || null,
          endTime: endTime || null,
        }, editingId);
      } else if (category === "compito") {
        // Titolo DERIVATO dalla descrizione (il DB richiede title NOT NULL)
        const text = description.trim();
        const derivedTitle = text.length > 48 ? `${text.slice(0, 48).trimEnd()}…` : text;
        await onSubmit({
          type: "compito",
          title: derivedTitle,
          description: text,
          date: new Date(`${date}T12:00:00`).toISOString(),
          subject_id: subjectId === NONE ? null : subjectId,
          topic_type: "free",
        }, editingId);
      } else {
        await onSubmit({
          type: mode,
          title: title.trim(),
          description: descriptionWithEnd(),
          date: new Date(`${date}T${time ? `${time}:00` : "12:00:00"}`).toISOString(),
          subject_id: subjectId === NONE ? null : subjectId,
          topic_type: topicMode,
          topic_id: topicMode === "linked" ? (courseId || null) : null,
          free_topic_title: topicMode === "free" ? (freeTopic.trim() || null) : null,
          goal,
          startTime: time || null,
          endTime: endTime || null,
        }, editingId);
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    category === "compito" ? !!description.trim() && !!date : !!title.trim() && !!date;

  const subjectSelect = (
    <div className="space-y-2">
      <Label className="label-large">{t("piano.sheet.subject")}</Label>
      <Select value={subjectId} onValueChange={setSubjectId}>
        <SelectTrigger className="w-full h-11 rounded-2xl bg-secondary/70 border border-transparent px-3 body-medium transition-colors">
          <SelectValue placeholder={t("piano.sheet.none")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{t("piano.sheet.none")}</SelectItem>
          {subjects.map((s) => {
            const col = resolveSubjectColor(s.name, s.color);
            return (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", col.solid)} />
                  {s.name}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );

  const dateField = (
    <div className="space-y-2">
      <Label htmlFor="ev-date" className="label-large">{t("piano.sheet.date")}</Label>
      <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
    </div>
  );

  const timeRange = (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label htmlFor="ev-start" className="label-large">{t("piano.sheet.startTime")}</Label>
        <Input id="ev-start" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ev-end" className="label-large">
          {t("piano.sheet.endTime")} <span className="text-muted-foreground font-normal">({t("piano.sheet.optional").replace(/[()]/g, "")})</span>
        </Label>
        <Input id="ev-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
      </div>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="pb-safe max-h-[92vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="title-large font-display">
            {editingId ? t("piano.sheet.editTitle") : t("piano.sheet.addTitle")}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 🎛️ P46 — TRE tab primari, iniziale maiuscola */}
          <PillToggle<Category>
            aria-label={t("piano.sheet.type")}
            options={[
              { value: "verifica", label: "Verifica" },
              { value: "compito", label: "Compito" },
              { value: "altro", label: "Altro" },
            ]}
            value={category}
            onChange={setCategory}
            variant="track"
          />

          {category === "verifica" && (
            <>
              {/* Riga 1 — Titolo + Modalità (a tendina, compatta a destra) */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="ev-title" className="label-large">{t("piano.sheet.title")}</Label>
                  <Input id="ev-title" placeholder={t("piano.sheet.titlePlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="w-full space-y-2 sm:w-[150px] shrink-0">
                  <Label className="label-large">{t("piano.sheet.mode")}</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as VerificaMode)}>
                    <SelectTrigger className="w-full h-10 rounded-2xl bg-secondary/70 border border-transparent px-3 body-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VERIFICA_MODES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Riga 2 — Data + Materia (in colonna su schermi stretti) */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {dateField}
                {subjectSelect}
              </div>

              {/* Riga 3 — Intervallo orario */}
              {timeRange}

              {/* Riga 4 — Argomento: Da corso | Libero */}
              <div className="space-y-2">
                <Label className="label-large">{t("piano.sheet.topic")}</Label>
                <PillToggle<"linked" | "free">
                  aria-label={t("piano.sheet.topic")}
                  options={[
                    { value: "linked", label: t("piano.sheet.topicLinked") },
                    { value: "free", label: t("piano.sheet.topicFree") },
                  ]}
                  value={topicMode}
                  onChange={setTopicMode}
                  size="sm"
                  grow
                />
                {topicMode === "linked" ? (
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger className="w-full h-11 rounded-2xl bg-secondary/70 border border-transparent px-3 body-medium transition-colors">
                      <SelectValue placeholder={t("piano.sheet.coursePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.file_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder={t("piano.sheet.topicPlaceholder")}
                    value={freeTopic}
                    onChange={(e) => setFreeTopic(e.target.value)}
                  />
                )}
              </div>

              {/* Riga 5 — Note & Obiettivo voto (richimabili a richiesta) */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setShowNotes(!showNotes)}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {showNotes ? t("piano.sheet.hideNotes") : t("piano.sheet.addNotes")}
                </button>
                {showNotes && (
                  <>
                    <Textarea id="ev-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("piano.sheet.notesPlaceholder")} />
                    <div className="space-y-2 rounded-2xl border border-outline-variant/60 p-4">
                      <div className="flex items-center justify-between">
                        <Label className="label-large">{t("piano.sheet.goalLabel")}</Label>
                        {/* Indicatore visivo del voto scelto (null finché non toccato) */}
                        <span className="label-large font-bold text-primary">
                          {goal != null ? goal.toFixed(goal % 1 ? 1 : 0) : "—"}
                        </span>
                      </div>
                      {/* Il DB salva goal come smallint: step intero 6-10 */}
                      <Slider
                        value={[goal ?? 6]}
                        min={6}
                        max={10}
                        step={1}
                        onValueChange={(v) => setGoal(v[0])}
                        aria-label={t("piano.sheet.goalLabel")}
                      />
                      {goal != null && (
                        <button type="button" onClick={() => setGoal(null)} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                          {t("piano.sheet.goalClear")}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {category === "compito" && (
            <>
              {/* Riga 1 — Materia + Data */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {subjectSelect}
                {dateField}
              </div>
              {/* Riga 2 — Descrizione ampia (il titolo si ricava da qui) */}
              <div className="space-y-2">
                <Label htmlFor="ev-compito" className="label-large">{t("piano.sheet.compitoLabel")}</Label>
                <Textarea
                  id="ev-compito"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("piano.sheet.compitoPlaceholder")}
                />
              </div>
            </>
          )}

          {category === "altro" && (
            <>
              <p className="body-small text-muted-foreground leading-relaxed">
                {t("piano.sheet.altroHint")}
              </p>
              <div className="space-y-2">
                <Label htmlFor="ev-altro-title" className="label-large">{t("piano.sheet.title")}</Label>
                <Input id="ev-altro-title" placeholder={t("piano.sheet.altroPlaceholder")} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-altro-notes" className="label-large">
                  {t("piano.sheet.notes")} <span className="text-muted-foreground font-normal">({t("piano.sheet.optional").replace(/[()]/g, "")})</span>
                </Label>
                <Textarea id="ev-altro-notes" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("piano.sheet.notesPlaceholder")} />
              </div>
              {dateField}
              {timeRange}
            </>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={submitting || !canSubmit}>
            {submitting
              ? t("piano.sheet.saving")
              : category === "compito"
                ? t("piano.sheet.saveCompito")
                : editingId
                  ? t("piano.sheet.saveChanges")
                  : t("piano.sheet.saveEvent")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
