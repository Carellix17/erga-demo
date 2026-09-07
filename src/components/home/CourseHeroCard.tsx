import { Play, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { CourseCardBackground } from "@/components/studio/CourseCardBackground";
import { useCourseImage } from "@/hooks/useCourseImage";
import { getSubjectAccent } from "@/lib/subjectColors";

/**
 * CourseHeroCard — card unificata del corso attivo in Home.
 *
 * Stato attivo: stessa pelle visiva della card corso di Studio (fondo
 * inverso, bordo sottile, copertina sfocata e accento materia) adattata
 * alla Home: anello di avanzamento SVG in alto a destra (nessun menù ⋯),
 * titolo della lezione corrente al centro con i metadati reali
 * ("X di Y lezioni"), un solo pulsante "Riprendi lezione" a piena
 * larghezza. Nessuna barra di avanzamento orizzontale.
 *
 * Stato vuoto (nessun corso / generazione in corso): card neutra con
 * invito a scegliere o caricare il primo percorso.
 *
 * Nota: il contenitore Home è marcato `no-ambient`, quindi questa card
 * non riceve l'alone ambientale animato: resta solo la sua ombra pulita.
 */

export interface CourseHeroCardProps {
  /** Titolo del corso attivo. Se manca, la card mostra lo stato vuoto. */
  courseTitle?: string | null;
  /** ID del percorso (serve a recuperare la copertina, come in Studio). */
  contextId?: string | null;
  /** Etichetta soprastante il titolo del corso, es. "Percorso attivo". */
  eyebrowText?: string | null;
  /** Titolo della lezione da riprendere. */
  lessonTitle?: string | null;
  /** Riga di metadati sotto la lezione, es. "7 di 28 lezioni". */
  lessonMetaText?: string | null;
  /** Avanzamento del percorso 0-100. Null → nessun anello. */
  progressPercent?: number | null;
  /** Etichetta accessibile dell'anello, es. "Avanzamento del percorso: 20%". */
  progressAriaLabel?: string | null;
  /** Etichetta della CTA primaria, es. "Riprendi lezione". */
  primaryCtaLabel?: string | null;
  onPrimaryCta?: () => void;
  /** Stato vuoto: titolo, descrizione, CTA e azione. */
  emptyTitle?: string | null;
  emptyDescription?: string | null;
  emptyCtaLabel?: string | null;
  onEmptyCta?: () => void;
}

function clampPercent(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Soglia oltre la quale il titolo del corso viene mostrato un gradino
 *  più piccolo, per non gonfiare la card su nomi lunghi. */
const LONG_COURSE_TITLE_THRESHOLD = 20;

/** Anello di avanzamento SVG: circonferenza 100 → dash = percentuale.
 *  Dimensione responsiva (56px sul telefono, 64 da sm in su) per non
 *  comprime né sovrapporre il titolo del corso sugli schermi piccoli. */
function ProgressRing({ percent, ariaLabel }: { percent: number; ariaLabel: string }) {
  const p = clampPercent(percent);
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className="relative inline-grid h-14 w-14 shrink-0 place-items-center text-contrast sm:h-16 sm:w-16"
    >
      <svg viewBox="0 0 36 36" aria-hidden="true" className="absolute inset-0 h-full w-full -rotate-90">
        {/* traccia neutra */}
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          strokeWidth="3.5"
          stroke="currentColor"
          strokeOpacity={0.25}
        />
        {/* avanzamento */}
        <circle
          cx="18"
          cy="18"
          r="15.9155"
          fill="none"
          strokeWidth="3.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={`${p} ${100 - p}`}
          strokeDashoffset="0"
        />
      </svg>
      <span className="relative text-[13px] font-semibold tabular-nums sm:text-sm">{p}%</span>
    </span>
  );
}

export function CourseHeroCard({
  courseTitle,
  contextId,
  eyebrowText,
  lessonTitle,
  lessonMetaText,
  progressPercent,
  progressAriaLabel,
  primaryCtaLabel,
  onPrimaryCta,
  emptyTitle,
  emptyDescription,
  emptyCtaLabel,
  onEmptyCta,
}: CourseHeroCardProps) {
  const isActive = Boolean(courseTitle && lessonTitle && primaryCtaLabel);
  const coverUrl = useCourseImage(isActive ? contextId : null, courseTitle ?? "");
  const accent = getSubjectAccent(courseTitle ?? "");

  if (!isActive) {
    return (
      <article
        className={cn(
          "flex flex-col items-center rounded-card border border-border glass-tactile p-5 text-center shadow-tactile sm:p-6",
        )}
      >
        <span className="grid h-12 w-12 place-items-center rounded-full bg-surface-container-high">
          <BookOpen className="h-6 w-6 text-foreground" aria-hidden="true" />
        </span>
        <h2 className="mt-3 text-lg font-semibold text-foreground">
          {emptyTitle ?? "Scegli o carica il tuo primo percorso"}
        </h2>
        {emptyDescription && (
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{emptyDescription}</p>
        )}
        {emptyCtaLabel && (
          <button
            type="button"
            onClick={onEmptyCta}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-button bg-primary text-[15px] font-semibold text-primary-foreground transition-transform duration-150 ease-m3-emphasized active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {emptyCtaLabel}
          </button>
        )}
      </article>
    );
  }

  // ── Pelle della card corso di Studio, adattata alla Home (P35) ─────────
  return (
    <article
      data-auto-contrast
      className="relative w-full overflow-hidden rounded-card border border-white/[0.12] bg-inverse-surface p-4 text-left shadow-hero sm:p-5"
    >
      <CourseCardBackground coverUrl={coverUrl} subjectColor={accent} variant="studio" />

      {/* Luce di spigolo (P35): filo interno chiaro SOPRA gli strati pittorici,
          simula la luce che colpisce il bordo superiore della card. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5] rounded-[inherit] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10)]"
      />

      <div className="relative z-10">
        {/* Header: corso a sinistra, anello di avanzamento a destra */}
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            {eyebrowText && (
              <p className="label-small tracking-[0.16em] text-contrast-secondary opacity-70">
                {eyebrowText}
              </p>
            )}
            <h2
              className={cn(
                "mt-1 break-words font-display font-extrabold leading-[1.05] text-contrast",
                (courseTitle ?? "").length > LONG_COURSE_TITLE_THRESHOLD
                  ? "text-2xl sm:text-3xl"
                  : "text-3xl sm:text-4xl",
              )}
            >
              {courseTitle}
            </h2>
          </div>
          <ProgressRing percent={progressPercent ?? 0} ariaLabel={progressAriaLabel ?? `${clampPercent(progressPercent)}%`} />
        </div>

        {/* Corpo: lezione corrente + metadati reali (nessuna barra orizzontale) */}
        <div className="mt-2 min-w-0">
          <p className="text-[17px] font-semibold leading-snug text-contrast line-clamp-2">{lessonTitle}</p>
          {lessonMetaText && (
            <p className="mt-1 truncate text-sm text-contrast-secondary">{lessonMetaText}</p>
          )}
        </div>

        {/* Unica CTA: STESSO vetro della card di Studio (PathHero):
            currentColor 8% sfondo + 20% bordo, capsula h-11, hover/pressione */}
        <button
          type="button"
          onClick={onPrimaryCta}
          className="text-contrast mt-4 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-opacity duration-200 hover:opacity-80 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{
            backgroundColor: "color-mix(in srgb, currentColor 8%, transparent)",
            borderColor: "color-mix(in srgb, currentColor 20%, transparent)",
          }}
        >
          <Play className="h-4 w-4 shrink-0 fill-current" strokeWidth={1.9} aria-hidden="true" />
          {primaryCtaLabel}
        </button>
      </div>
    </article>
  );
}
