import { AudioLines, ChevronLeft, PencilLine, X } from "lucide-react";
import { useEffect, useRef, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CourseCardBackground } from "./CourseCardBackground";

/**
 * StudioPractice — accessi rapidi alla pratica dalla Home Studio.
 *
 * PracticeLaunchers (P39): DUE card affiancate a tutta larghezza (griglia
 * 2 colonne) per Esercizi e Interrogazione, con le STESSE icone della Home
 * (PencilLine / AudioLines) e l'accento cromatico del corso attivo
 * (variabile CSS --subject-accent, già collegata da useSubjectAccent).
 * Niente barra "Chiedi qualcosa a Erga" nella Home Studio: la chat con
 * l'AI vive dentro la singola lezione (e nella scheda Pratica).
 *
 * SheetDrawer (P42): fondo mobile (bottom sheet) con backdrop sfocato e
 * due scatti (scelta ~88% → sessione schermo intero) usato da Esercizi e
 * Interrogazione. La X in alto a destra chiude l'intero flusso.
 *
 * ModuleHeaderCard (P42): card compatta sticky del ramo moduli.
 *
 * SubViewHeader: intestazione con "Torna a Studio" per le sottoviste.
 */

export interface PracticeLaunchersProps {
  onOpenEsercizi: () => void;
  onOpenInterrogazione: () => void;
  className?: string;
}

function LauncherCard({
  label,
  subtitle,
  icon: Icon,
  onClick,
}: {
  label: string;
  subtitle: string;
  icon: typeof PencilLine;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Apri ${label}`}
      className="interactive-card flex min-h-[92px] flex-col items-start gap-2 rounded-2xl border border-subject-accent/25 bg-card p-3.5 text-left shadow-tactile transition-all duration-200 ease-m3-standard hover:border-subject-accent/50 hover:shadow-[0_0_28px_-10px_var(--subject-accent)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-subject-accent text-subject-accent-foreground shadow-[0_0_16px_-4px_var(--subject-accent)]">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold leading-tight text-foreground">{label}</span>
        <span className="mt-0.5 block truncate text-xs font-medium text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

export function PracticeLaunchers({ onOpenEsercizi, onOpenInterrogazione, className }: PracticeLaunchersProps) {
  return (
    <div className={cn("grid w-full grid-cols-2 gap-3 px-4 pt-3 animate-fade-up", className)}>
      <LauncherCard label="Esercizi" subtitle="Quiz e flashcard" icon={PencilLine} onClick={onOpenEsercizi} />
      <LauncherCard label="Interrogazione" subtitle="Simulazione orale" icon={AudioLines} onClick={onOpenInterrogazione} />
    </div>
  );
}

export interface SubViewHeaderProps {
  title: string;
  onBack: () => void;
  courseTitle?: string | null;
  backLabel?: string;
}

export function SubViewHeader({ title, onBack, courseTitle, backLabel = "Torna a Studio" }: SubViewHeaderProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 border-b border-border/40",
        "px-4 py-2",
      )}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-container-high hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        {backLabel}
      </button>
      <div className="min-w-0 text-right">
        <p className="truncate text-sm font-bold text-foreground">{title}</p>
        {courseTitle && (
          <p className="truncate text-xs text-muted-foreground">{courseTitle}</p>
        )}
      </div>
    </div>
  );
}

export interface ModuleHeaderCardProps {
  courseTitle: string | null;
  moduleIndex: number;
  moduleTitle: string;
  /** P43: colore materia del corso ATTIVO (stesso getSubjectAccent della hero):
   *  la card compatta eredita identica base cromatica, orbs e bagliori. */
  subjectColor: string;
  /** P43: layoutId condiviso con la hero → Framer Motion la MORFA (stesso
   * trucco già usato dal selettore corsi), niente dissolvenze brusche. */
  layoutId?: string;
  onClose: () => void;
}

/**
 * P43 — Livello 2 (percorso a ramo): la HERO del corso si comprime in questa
 * card compatta mantenendo l'IDENTITÀ CROMATICA DELLA MATERIA (stesso
 * CourseCardBackground "studio", stessi orbs, stesso inchiostro a contrasto
 * automatico data-auto-contrast). Titolo del modulo grande e per intero (va
 * a capo, mai troncato), nome del percorso piccolo sotto, X 44px in alto a
 * destra per tornare alla lista dei moduli.
 */
export function ModuleHeaderCard({ courseTitle, moduleIndex, moduleTitle, subjectColor, layoutId, onClose }: ModuleHeaderCardProps) {
  return (
    <motion.div
      layout
      layoutId={layoutId}
      transition={{ layout: { type: "spring", stiffness: 300, damping: 25 } }}
      data-auto-contrast
      style={{ "--ambient-block-ink": subjectColor } as CSSProperties}
      className="relative overflow-hidden rounded-card border border-inverse-on-surface/15 shadow-level-2"
    >
      {/* Stessi orbs di scena della hero: luci libere sul colore materia */}
      <div className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-current opacity-[0.07]" aria-hidden />
      <div className="absolute -right-2 -bottom-20 w-36 h-36 rounded-full bg-current opacity-[0.05]" aria-hidden />
      <CourseCardBackground coverUrl={null} subjectColor={subjectColor} variant="studio" />
      <div className="relative p-4">
        <div className="pr-14">
          <p className="label-small uppercase tracking-[0.16em] text-contrast-secondary">
            Modulo {moduleIndex + 1}
          </p>
          <h2 className="mt-0.5 break-words font-display text-lg font-extrabold leading-snug text-contrast">
            {moduleTitle}
          </h2>
          {courseTitle && (
            <p className="mt-1 break-words text-xs text-contrast-secondary">{courseTitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi modulo"
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 hover:opacity-80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          style={{ backgroundColor: "color-mix(in srgb, currentColor 15%, transparent)" }}
        >
          <X className="h-5 w-5 text-current" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </motion.div>
  );
}

export interface SheetDrawerProps {
  title: string;
  /** "select" = foglio a ~88% del viewport; "active" = schermo intero. */
  step: "select" | "active";
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * P43 — Bottom sheet per Esercizi e Interrogazione: SCIVOLA davvero dal bordo
 * inferiore (300ms ease-out) sopra un backdrop semitrasparente e SFOCATO che
 * lascia intravedere lo Studio sottostante (mai nero pieno). Due scatti: il
 * foglio è alto 100dvh e in "select" resta traslato del 12% (vede ~88%), in
 * "active" scivola a schermo intero. La X in alto a destra (44px) resta fissa
 * al suo posto e chiude TUTTO il flusso. Solo transform/opacity → 60fps.
 */
export function SheetDrawer({ title, step, onClose, children }: SheetDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50">
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        data-step={step}
        className="absolute inset-x-0 bottom-0 flex h-[100dvh] flex-col rounded-t-dialog border border-border bg-popover text-foreground shadow-level-4"
        initial={{ y: "100%" }}
        animate={{ y: step === "active" ? "0%" : "12%" }}
        exit={{ y: "100%" }}
        transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      >
        {/* Fascia fissa: maniglia + X sempre nello stesso punto in alto a destra */}
        <div className="relative flex h-14 shrink-0 items-center justify-center">
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/35" aria-hidden="true" />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-all duration-200 hover:bg-surface-container-high hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </motion.div>
    </div>
  );
}
