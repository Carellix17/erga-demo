import { ChevronLeft, Check, ChevronRight, Lock, Loader2, RefreshCw, Pencil, Trash2, Target, X, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Exercise } from "./exercises/ExerciseRenderer";
import { useMemo, useRef as useReactRef, useState } from "react";
import { MODULE_SIZE, isInGatedModule, isGateLesson, moduleTitleFor } from "@/lib/lessonModules";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";

interface Lesson {
  id: string;
  title: string;
  is_generated: boolean;
  lesson_order: number;
  concept?: string;
  explanation?: string;
  example?: string;
  exercises?: Exercise[];
}

interface LessonsListProps {
  lessons: Lesson[];
  currentIndex: number;
  onSelectLesson: (index: number) => void;
  onBack: () => void;
  isGenerating: boolean;
  showBackButton?: boolean;
  /** P24 — nasconde la testata "X di Y completate + barra": ora vive nel banner (PathHero). */
  showProgressHeader?: boolean;
  showFinalTest?: boolean;
  onStartFinalTest?: () => void;
  isLoadingFinalTest?: boolean;
  // 🏭 P10c: modulo in fabbrica (cancello del vagone); null = nessun cantiere attivo
  gatedModuleIndex?: number | null;
  // 🏷️ P11d: titoli AI dei moduli dal cloud (0-based); senza → derivati dalla prima lezione
  moduleTitles?: (string | null)[] | null;
  onRegenerateLesson?: (lessonIndex: number) => Promise<void> | void;
  onDeleteLesson?: (lessonId: string) => Promise<void> | void;
  onRenameLesson?: (lessonId: string, newTitle: string) => Promise<void> | void;
}

// P21b ERGA OPAL: il "sentiero a zig-zag" è diventato una LISTA PULITA.
// Niente nodi colorati, curve SVG, coroncine e stelline: carte carbone su nero
// (bianche su carta), un solo segno forte — il tondo-firma sulla lezione che
// aspetta te — e un segno neutro per i completamenti. La LOGICA non è cambiata di
// una virgola: stessi cancelli del vagone, stesso long-press, stessi gesti.

export function LessonsList({
  lessons,
  currentIndex,
  onSelectLesson,
  onBack,
  isGenerating,
  showBackButton = true,
  showProgressHeader = true,
  showFinalTest,
  onStartFinalTest,
  isLoadingFinalTest,
  gatedModuleIndex,
  moduleTitles,
  onRegenerateLesson,
  onDeleteLesson,
  onRenameLesson,
}: LessonsListProps) {
  // Conta le lezioni effettivamente completate dall'utente (non quelle generate).
  // currentIndex = indice della lezione "corrente"; le precedenti sono completate.
  // Clampato in [0, lessons.length] così se l'utente torna indietro il valore non scende.
  const completedCount = Math.max(0, Math.min(currentIndex, lessons.length));
  const progress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;

  // ── Long-press menu state ──
  const [menuLesson, setMenuLesson] = useState<{ lesson: Lesson; index: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [actionLoading, setActionLoading] = useState<"regen" | "delete" | "rename" | null>(null);
  const pressTimerRef = useReactRef<number | null>(null);
  const longPressTriggeredRef = useReactRef(false);
  // Manual double-tap detection (onDoubleClick is unreliable on touch devices)
  const lastTapRef = useReactRef<{ id: string; time: number } | null>(null);
  const DOUBLE_TAP_MS = 350;

  const detectDoubleTap = (lesson: Lesson, index: number): boolean => {
    if (isGenerating) return false;
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.id === lesson.id && now - last.time < DOUBLE_TAP_MS) {
      lastTapRef.current = null;
      longPressTriggeredRef.current = true; // suppress upcoming click
      try { navigator.vibrate?.(15); } catch { /* vibrazione non supportata: si ignora */ }
      setMenuLesson({ lesson, index });
      setIsRenaming(false);
      setRenameValue(lesson.title);
      return true;
    }
    lastTapRef.current = { id: lesson.id, time: now };
    return false;
  };

  const clearPressTimer = () => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const startPress = (lesson: Lesson, index: number) => {
    if (isGenerating) return;
    longPressTriggeredRef.current = false;
    clearPressTimer();
    pressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      // Haptic feedback if supported
      try { navigator.vibrate?.(15); } catch { /* vibrazione non supportata: si ignora */ }
      setMenuLesson({ lesson, index });
      setIsRenaming(false);
      setRenameValue(lesson.title);
    }, 450);
  };

  const closeMenu = () => {
    setMenuLesson(null);
    setIsRenaming(false);
    setActionLoading(null);
  };

  const handleRegenerate = async () => {
    if (!menuLesson || !onRegenerateLesson) return;
    setActionLoading("regen");
    try {
      await onRegenerateLesson(menuLesson.index);
      closeMenu();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!menuLesson || !onDeleteLesson) return;
    setActionLoading("delete");
    try {
      await onDeleteLesson(menuLesson.lesson.id);
      closeMenu();
    } finally {
      setActionLoading(null);
    }
  };

  const handleRename = async () => {
    if (!menuLesson || !onRenameLesson) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === menuLesson.lesson.title) {
      setIsRenaming(false);
      return;
    }
    setActionLoading("rename");
    try {
      await onRenameLesson(menuLesson.lesson.id, trimmed);
      closeMenu();
    } finally {
      setActionLoading(null);
    }
  };

  // Group lessons into modules
  const modules = useMemo(() => {
    // 🏷️ P11d: il cartello del vagone prende il titolo AI (dal cloud) se c'è,
    // altrimenti quello della prima lezione (percorsi nati prima dei titoli AI).
    const result: { title: string; lessons: { lesson: Lesson; globalIndex: number }[] }[] = [];
    for (let i = 0; i < lessons.length; i += MODULE_SIZE) {
      const chunk = lessons.slice(i, i + MODULE_SIZE);
      result.push({
        title: moduleTitleFor(result.length, moduleTitles, chunk[0]?.title),
        lessons: chunk.map((l, j) => ({ lesson: l, globalIndex: i + j })),
      });
    }
    return result;
  }, [lessons, moduleTitles]);

  return (
    <div className="pb-32 animate-fade-in">
      {/* ── Testata di percorso: statica, sobria, scorre con la pagina.
          P24: in Studio è nascosta (il progresso vive nel banner); resta
          disponibile per altri usi della lista. ── */}
      {showProgressHeader && (
      <div className="px-4 pt-6">
        {showBackButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label="Torna indietro"
            className="rounded-full -ml-2 mb-3 text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Indietro
          </Button>
        )}
        <div className="flex items-baseline justify-between gap-3 mb-2.5 px-1">
          <p className="text-sm text-muted-foreground">
            {completedCount} di {lessons.length} lezioni completate
          </p>
          <p className="text-sm font-bold text-subject-accent">{progress}%</p>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-subject-accent transition-all duration-700 ease-m3-emphasized"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      )}

      {/* ── Moduli: una sezione pulita per vagone ── */}
      <div className="px-4 pt-7 flex flex-col gap-8">
        {modules.map((mod, modIndex) => {
          const doneInModule = mod.lessons.filter((l) => l.globalIndex < currentIndex).length;

          return (
            <section key={modIndex}>
              {/* Module header */}
              <header className="flex items-baseline justify-between gap-3 px-1 mb-3">
                <h3 className="font-display font-bold text-lg text-foreground truncate">
                  {mod.title}
                </h3>
                <span className="text-xs font-medium text-muted-foreground flex-shrink-0">
                  {doneInModule}/{mod.lessons.length}
                </span>
              </header>

              {/* Righe-lezione */}
              <div className="flex flex-col gap-2">
                {mod.lessons.map((item) => {
                  const { lesson, globalIndex } = item;
                  const isCompleted = globalIndex < currentIndex;
                  const isCurrent = globalIndex === currentIndex;
                  // 🏭 P10c CANCELLO DEL VAGONE: nel modulo in fabbrica SOLO la porta resta
                  // apribile (conduce alla sala d'attesa); le altre restano chiuse anche se già tornite.
                  const lessonOrder = lesson.lesson_order ?? globalIndex;
                  const inGatedModule = isInGatedModule(lessonOrder, gatedModuleIndex);
                  const isGatePorta = isGateLesson(lessonOrder, gatedModuleIndex);
                  const isLocked = (!lesson.is_generated && globalIndex > currentIndex) || (inGatedModule && !isGatePorta);
                  const disabled = isGenerating || (isLocked && !inGatedModule);
                  // P24 — MACCHINA DI STATI ESPLICITA della lezione: ogni stato
                  // ha superficie, affordance e feedback propri. La logica di
                  // abilitazione è INVIOLATA (stesse condizioni di sempre).
                  type LessonState =
                    | "generating" | "gated" | "gate-door"
                    | "completed" | "current" | "locked" | "available";
                  const state: LessonState =
                    isGenerating && isCurrent ? "generating"
                    : inGatedModule && !isGatePorta ? "gated"
                    : isGatePorta ? "gate-door"
                    : isCompleted ? "completed"
                    : isCurrent ? "current"
                    : isLocked ? "locked"
                    : "available";
                  const subtitle =
                    state === "gated" || state === "gate-door" ? "In preparazione…"
                    : state === "completed" ? "Completata"
                    : state === "current" ? (lesson.is_generated ? "Pronta per te" : "Da preparare")
                    : state === "generating" ? "La fabbrica sta lavorando su questa…"
                    : state === "locked" ? "Da sbloccare"
                    : lesson.is_generated ? "Pronta"
                    : "Da sbloccare";

                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => {
                        if (longPressTriggeredRef.current) {
                          longPressTriggeredRef.current = false;
                          return;
                        }
                        if (!isGenerating) onSelectLesson(globalIndex);
                      }}
                      onPointerDown={() => startPress(lesson, globalIndex)}
                      onPointerUp={() => { clearPressTimer(); detectDoubleTap(lesson, globalIndex); }}
                      onPointerLeave={clearPressTimer}
                      onPointerCancel={clearPressTimer}
                      onContextMenu={(e) => { e.preventDefault(); }}
                      onDoubleClick={() => {
                        if (isGenerating) return;
                        setMenuLesson({ lesson, index: globalIndex });
                        setIsRenaming(false);
                        setRenameValue(lesson.title);
                      }}
                      disabled={disabled}
                      className={cn(
                        "w-full flex items-center gap-3.5 rounded-[18px] px-3.5 py-3 text-left select-none relative overflow-hidden",
                        "transition-[background-color,transform,border-color,box-shadow] duration-200",
                        // P24 — la lezione CORRENTE è l'unico oggetto in rilievo
                        // (Piano 2): superficie, filo di bordo e ombra di contatto.
                        state === "current" || state === "generating"
                          ? "bg-surface-container-high border border-subject-accent shadow-level-1"
                          : "bg-card border border-transparent",
                        !disabled && "hover:bg-surface-container-highest active:scale-[0.985]",
                        (state === "locked" || state === "gated") && "opacity-55",
                        state === "generating" && "border-subject-accent",
                      )}
                      style={{
                        touchAction: "manipulation",
                        WebkitUserSelect: "none",
                        userSelect: "none",
                      }}
                    >
                      {/* Marker "sei qui": la barretta segue l'accento materia. */}
                      {(state === "current" || state === "generating") && (
                        <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-subject-accent" aria-hidden />
                      )}

                      {/* Tondo di stato: il FIRM è solo sulla lezione corrente */}
                      <span
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200",
                          state === "current" || state === "generating" ? "bg-subject-accent text-subject-accent-foreground" : "bg-secondary",
                          state === "gate-door" && "ring-2 ring-tertiary/60 animate-pulse-soft",
                        )}
                      >
                        {state === "generating" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : state === "gated" ? (
                          <Lock className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
                        ) : state === "gate-door" ? (
                          <Factory className="w-4 h-4 text-tertiary" strokeWidth={1.75} />
                        ) : state === "completed" ? (
                          <Check className="w-5 h-5 text-tertiary" strokeWidth={2.5} />
                        ) : state === "locked" ? (
                          <Lock className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
                        ) : (
                          <span
                            className={cn(
                              "text-sm font-bold",
                              state === "current" ? "text-subject-accent-foreground" : "text-foreground/80",
                            )}
                          >
                            {globalIndex + 1}
                          </span>
                        )}
                      </span>

                      {/* Titolo + stato */}
                      <span className="flex-1 min-w-0">
                        <span
                          className={cn(
                            "block truncate text-[15px] font-semibold leading-snug",
                            isLocked && !inGatedModule ? "text-muted-foreground" : "text-foreground",
                          )}
                        >
                          {lesson.title}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {subtitle}
                        </span>
                      </span>

                      {/* Invito a destra: la pill "Riprendi" è in FIRMA piena */}
                      {state === "current" && !isGenerating ? (
                        <span className="flex-shrink-0 text-xs font-bold bg-primary text-primary-foreground rounded-full px-3 py-1.5 shadow-level-1">
                          Riprendi
                        </span>
                      ) : state === "available" || state === "gate-door" ? (
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* ── Test Finale: chiusura neutra del percorso ── */}
        {showFinalTest && onStartFinalTest && (
          <section className="px-0">
            <button
              type="button"
              onClick={onStartFinalTest}
              disabled={isLoadingFinalTest}
              className="w-full flex items-center gap-4 rounded-[20px] bg-card px-4 py-4 text-left transition-colors duration-200 hover:bg-surface-container-high active:bg-surface-container-highest"
            >
              <span className="w-11 h-11 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                {isLoadingFinalTest ? (
                  <Loader2 className="w-5 h-5 text-accent-foreground animate-spin" />
                ) : (
                  <Target className="w-5 h-5 text-accent-foreground" strokeWidth={1.75} />
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-display font-bold text-base text-foreground">
                  Test finale
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {isLoadingFinalTest ? "Preparazione delle domande…" : "Mettiti alla prova su tutto il percorso"}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
            </button>
          </section>
        )}
      </div>

      {/* ── Long-press action drawer ── */}
      <Drawer
        open={!!menuLesson}
        onOpenChange={(open) => { if (!open) closeMenu(); }}
      >
        <DrawerContent className="pb-6">
          {menuLesson && (
            <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-2 animate-fade-in">
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                  <span className="text-foreground font-display font-bold">{menuLesson.index + 1}</span>
                </div>
                {!isRenaming ? (
                  <>
                    <h3 className="font-display font-bold text-base text-foreground line-clamp-2 max-w-xs">
                      {menuLesson.lesson.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">Cosa vuoi fare con questa lezione?</p>
                  </>
                ) : (
                  <div className="w-full max-w-sm mx-auto flex items-center gap-2">
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleRename(); }
                        if (e.key === "Escape") { setIsRenaming(false); }
                      }}
                      placeholder="Nuovo titolo"
                      className="h-11 rounded-2xl"
                      maxLength={120}
                    />
                    <Button
                      size="icon"
                      onClick={handleRename}
                      disabled={actionLoading === "rename" || !renameValue.trim()}
                      className="h-11 w-11 rounded-full flex-shrink-0"
                      aria-label="Conferma"
                    >
                      {actionLoading === "rename" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setIsRenaming(false)}
                      className="h-11 w-11 rounded-full flex-shrink-0"
                      aria-label="Annulla"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {!isRenaming && (
                <div className="grid grid-cols-3 gap-3 animate-scale-in">
                  <button
                    onClick={handleRegenerate}
                    disabled={actionLoading !== null || !onRegenerateLesson}
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-[18px] bg-card hover:bg-surface-container-high transition-colors duration-200 disabled:opacity-50"
                  >
                    <span className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      {actionLoading === "regen" ? (
                        <Loader2 className="w-5 h-5 text-foreground animate-spin" />
                      ) : (
                        <RefreshCw className="w-5 h-5 text-foreground" strokeWidth={1.75} />
                      )}
                    </span>
                    <span className="text-xs font-semibold text-foreground">Rigenera</span>
                  </button>

                  <button
                    onClick={() => { setRenameValue(menuLesson.lesson.title); setIsRenaming(true); }}
                    disabled={actionLoading !== null || !onRenameLesson}
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-[18px] bg-card hover:bg-surface-container-high transition-colors duration-200 disabled:opacity-50"
                  >
                    <span className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <Pencil className="w-5 h-5 text-foreground" strokeWidth={1.75} />
                    </span>
                    <span className="text-xs font-semibold text-foreground">Rinomina</span>
                  </button>

                  <button
                    onClick={handleDelete}
                    disabled={actionLoading !== null || !onDeleteLesson}
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-[18px] bg-card hover:bg-error-container/40 transition-colors duration-200 disabled:opacity-50"
                  >
                    <span className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center">
                      {actionLoading === "delete" ? (
                        <Loader2 className="w-5 h-5 text-destructive animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5 text-destructive" strokeWidth={1.75} />
                      )}
                    </span>
                    <span className="text-xs font-semibold text-foreground">Elimina</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
