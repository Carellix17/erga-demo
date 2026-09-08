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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
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

/** Ordine delle modalità di verifica mostrate nella tendina della barra Titolo. */
const VERIFICA_MODES: VerificaMode[] = ["orale", "scritta", "pratica", "interrogazione"];
/** Chiave i18n dell'etichetta per ogni modalità (pill e voci di tendina). */
const VERIFICA_MODE_LABEL: Record<VerificaMode, string> = {
  orale: "piano.sheet.modeOrale",
  scritta: "piano.sheet.modeScritta",
  pratica: "piano.sheet.modePratica",
  interrogazione: "piano.sheet.modePresentazione",
};

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
  /** P47 — eventuale errore sugli orari della verifica (mostrato sotto il campo Ora fine). */
  const [endError, setEndError] = useState<string | null>(null);

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
    setEndError(null);
  }, [open, initial]);

  /** Descrizione + eventuale "fino alle" (il DB ha un solo orario per evento). */
  const descriptionWithEnd = () => {
    const base = description.trim();
    if (!endTime || endTime === time || category === "compito") return base || undefined;
    return `${base ? `${base} · ` : ""}${t("piano.sheet.until")} ${endTime}`;
  };

  /**
   * P47 — Validazione orari della verifica. Ritorna il messaggio d'errore da
   * mostrare sotto "Ora fine", oppure null se va tutto bene.
   * L'ora di fine è OBBLIGATORIA quando si crea una verifica nuova; in
   * modifica i dati esistenti non conservano un'ora di fine separata, quindi
   * non blocchiamo chi non la tocca — ma se viene inserita deve seguire
   * l'ora di inizio.
   */
  const validateVerificaTimes = (): string | null => {
    if (!endTime && !editingId) return t("piano.sheet.endTimeRequired");
    if (time && endTime && endTime <= time) return t("piano.sheet.endTimeAfterStart");
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validazione per categoria: mai stringhe vuote verso il DB
    if (category === "compito") {
      if (!description.trim() || !date) return;
    } else if (!title.trim() || !date) {
      return;
    }
    // P47 — una verifica senza ora di fine (o con fine prima dell'inizio) non parte.
    if (category === "verifica") {
      const timeError = validateVerificaTimes();
      if (timeError) {
        setEndError(timeError);
        return;
      }
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
    <div className="min-w-0 space-y-2">
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
    <div className="min-w-0 space-y-2">
      <Label htmlFor="ev-date" className="label-large">{t("piano.sheet.date")}</Label>
      <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
    </div>
  );

  /**
   * Intervallo orario su una riga a 2 colonne. Per la verifica l'ora di fine
   * è obbligatoria (asterisco + niente "(opzionale)"); per "Altro" resta
   * facoltativa. Eventuali errori compaiono sotto il campo con role="alert".
   */
  const timeRange = (requireEnd: boolean) => (
    <div className="grid grid-cols-2 gap-3">
      <div className="min-w-0 space-y-2">
        <Label htmlFor="ev-start" className="label-large">{t("piano.sheet.startTime")}</Label>
        <Input
          id="ev-start"
          type="time"
          value={time}
          onChange={(e) => {
            setTime(e.target.value);
            setEndError(null);
          }}
        />
      </div>
      <div className="min-w-0 space-y-2">
        <Label htmlFor="ev-end" className="label-large">
          {t("piano.sheet.endTime")}
          {requireEnd && <span aria-hidden="true" className="ml-0.5 text-destructive">*</span>}
          {!requireEnd && (
            <span className="text-muted-foreground font-normal">
              {" "}({t("piano.sheet.optional").replace(/[()]/g, "")})
            </span>
          )}
        </Label>
        <Input
          id="ev-end"
          type="time"
          value={endTime}
          onChange={(e) => {
            setEndTime(e.target.value);
            setEndError(null);
          }}
          aria-invalid={requireEnd && !!endError}
          aria-describedby={requireEnd && endError ? "ev-end-error" : undefined}
        />
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
              {/* P47 — Barra unica Titolo + Modalità: un solo blocco visivo.
                  L'input del titolo si espande a sinistra; a destra il pill
                  compatto apre la tendina delle modalità. Nessuna riga "Modalità" separata. */}
              <div className="flex items-center rounded-2xl border border-border bg-card py-1.5 pl-4 pr-1.5 shadow-sm transition-[border-color,box-shadow] focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/20">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("piano.sheet.titlePlaceholder")}
                  aria-label={t("piano.sheet.title")}
                  className="h-9 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground md:text-sm"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={t("piano.sheet.mode")}
                      className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-secondary px-3 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      {t(VERIFICA_MODE_LABEL[mode])}
                      <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 opacity-70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[10rem]">
                    {VERIFICA_MODES.map((value) => (
                      <DropdownMenuItem key={value} onSelect={() => setMode(value)}>
                        {t(VERIFICA_MODE_LABEL[value])}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* P47 — Data + Materia affiancate (griglia fissa a 2 colonne anche su mobile) */}
              <div className="grid grid-cols-2 gap-3">
                {dateField}
                {subjectSelect}
              </div>

              {/* Riga 3 — Intervallo orario: per la verifica l'ora di fine è obbligatoria */}
              {timeRange(true)}
              {endError && (
                <p id="ev-end-error" role="alert" className="-mt-2 text-xs font-medium text-destructive">
                  {endError}
                </p>
              )}

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
              {/* P47 — Materia + Data affiancate (speculare al tab Verifica) */}
              <div className="grid grid-cols-2 gap-3">
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
              {timeRange(false)}
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
