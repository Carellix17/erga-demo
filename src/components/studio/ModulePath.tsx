import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Pencil,
  Play,
  RefreshCw,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moduleRange, type ModuleLessonLike } from "@/lib/lessonModules";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Exercise } from "./exercises/ExerciseRenderer";

interface LessonLike extends ModuleLessonLike {
  id: string;
  title: string;
}

interface ModulePathProps {
  moduleIndex: number;
  moduleTitle: string;
  lessons: LessonLike[];
  currentIndex: number;
  /** Una lezione (singola) sta venendo generata al momento. */
  isGeneratingLesson: boolean;
  /** Il modulo intero è in generazione (fabbrica): mostra la vista "in costruzione". */
  isModuleGenerating: boolean;
  genCount: number;
  genTotal: number;
  onBack: () => void;
  /** P38: la barra compatta del corso (BranchTopBar) sostituisce l'intestazione. */
  hideHeader?: boolean;
  onSelectLesson: (globalIndex: number) => void;
  /** Modulo completamente completato → bottone "torna ai moduli". */
  onModuleCompleted: () => void;
  onStartFinalTest?: () => void;
  isLoadingFinalTest?: boolean;
  showFinalTest?: boolean;
  onRegenerateLesson?: (lessonIndex: number) => Promise<void> | void;
  onDeleteLesson?: (lessonId: string) => Promise<void> | void;
  onRenameLesson?: (lessonId: string, newTitle: string) => Promise<void> | void;
}

// P24 — SCHERMATA 2: il PERCORSO SQUADRATO del modulo (mockup approvato).
// I nodi quadrati si alternano a sinistra/destra e sono collegati da una linea
// a gomiti (orizzontale → verticale → orizzontale) che segue l'accento materia sui
// passi completati. In fondo, il trofeo del test finale. Il modulo in
// generazione mostra banner + nodi tratteggiati che respirano.

const NODE = 54;
const STEP = 118;
const TROPHY = 62;
const L_COL = 18; // % centro colonna sinistra — 18% per evitare overflow su 375px (era 10%)
const R_COL = 82; // % centro colonna destra — 82% per simmetria mobile (era 90%)
const MID = 50;

type NodeState = "done" | "cur" | "av" | "lock" | "gen";

export function ModulePath({
  moduleIndex,
  moduleTitle,
  lessons,
  currentIndex,
  isGeneratingLesson,
  isModuleGenerating,
  genCount,
  genTotal,
  onBack,
  hideHeader = false,
  onSelectLesson,
  onModuleCompleted,
  onStartFinalTest,
  isLoadingFinalTest,
  showFinalTest,
  onRegenerateLesson,
  onDeleteLesson,
  onRenameLesson,
}: ModulePathProps) {
  // ── Long-press menu (stessa logica della vecchia lista) ──
  const [menuLesson, setMenuLesson] = useState<{ lesson: LessonLike; index: number } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [actionLoading, setActionLoading] = useState<"regen" | "delete" | "rename" | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);
  const DOUBLE_TAP_MS = 350;

  const detectDoubleTap = (lesson: LessonLike, index: number): boolean => {
    if (isGeneratingLesson) return false;
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.id === lesson.id && now - last.time < DOUBLE_TAP_MS) {
      lastTapRef.current = null;
      longPressTriggeredRef.current = true;
      try { navigator.vibrate?.(15); } catch { /* non supportato */ }
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

  const startPress = (lesson: LessonLike, index: number) => {
    if (isGeneratingLesson) return;
    longPressTriggeredRef.current = false;
    clearPressTimer();
    pressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      try { navigator.vibrate?.(15); } catch { /* non supportato */ }
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

  // ── Lezioni del modulo con il loro indice globale ──
  const range = moduleRange(moduleIndex);
  const modLessons = useMemo(
    () =>
      lessons
        .map((lesson, pos) => ({ lesson, globalIndex: pos }))
        .filter(({ lesson, globalIndex }) => {
          const order = lesson.lesson_order ?? globalIndex;
          return order >= range.start && order <= range.end;
        }),
    [lessons, range.start, range.end],
  );

  const stateOf = (globalIndex: number, lesson: LessonLike): NodeState => {
    const isCompleted = globalIndex < currentIndex;
    const isCurrent = globalIndex === currentIndex;
    const isLocked = !lesson.is_generated && globalIndex > currentIndex;
    if (isGeneratingLesson && isCurrent) return "gen";
    if (isCompleted) return "done";
    if (isCurrent) return "cur";
    if (isLocked) return "lock";
    return "av";
  };

  const allDone = modLessons.length > 0 && modLessons.every(({ globalIndex }) => globalIndex < currentIndex);
  const doneCount = modLessons.filter(({ globalIndex }) => globalIndex < currentIndex).length;
  const pct = modLessons.length > 0 ? Math.round((doneCount / modLessons.length) * 100) : 0;

  const n = Math.max(modLessons.length, 1);
  const height = n * STEP + TROPHY + 70;

  // ── Linee squadrate ──
  const segs = useMemo(() => {
    const parts: string[] = [];
    const states = modLessons.map(({ lesson, globalIndex }) => stateOf(globalIndex, lesson));
    modLessons.forEach((item, i) => {
      if (i > 0) {
        const px = (i - 1) % 2 === 0 ? L_COL : R_COL;
        const py = (i - 1) * STEP + NODE / 2;
        const x = i % 2 === 0 ? L_COL : R_COL;
        const y = i * STEP + NODE / 2;
        const mx = (x + px) / 2;
        const lit =
          states[i - 1] !== "lock" && states[i - 1] !== "gen" &&
          states[i] !== "lock" && states[i] !== "gen";
        parts.push(
          `<path d="M ${px} ${py} L ${mx} ${py} L ${mx} ${y} L ${x} ${y}" class="${lit ? "seg-on" : "seg-base"}"/>`,
        );
      }
    });
    // tratto verso il trofeo
    const lx = (n - 1) % 2 === 0 ? L_COL : R_COL;
    const ly = (n - 1) * STEP + NODE / 2;
    const ty = n * STEP + 20;
    const mx2 = (lx + MID) / 2;
    parts.push(
      `<path d="M ${lx} ${ly} L ${mx2} ${ly} L ${mx2} ${ty} L ${MID} ${ty}" class="${allDone ? "seg-on" : "seg-base"}"/>`,
    );
    return parts.join("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modLessons, n, allDone]);

  return (
    <div className="pb-32 animate-fade-in">
      {/* ── Intestazione: torna ai moduli + titolo modulo INTERO ── */}
      <div className="px-4 pt-4">
        {!hideHeader && (
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onBack}
              aria-label="Torna ai moduli"
              className="rounded-full shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <p className="label-small text-muted-foreground">Modulo {moduleIndex + 1}</p>
              <h2 className="font-display font-extrabold text-lg leading-snug text-foreground break-words">
                {moduleTitle}
              </h2>
            </div>
          </div>
        )}

        {!isModuleGenerating && (
          <>
            <div className="flex items-baseline justify-between gap-3 px-1 mt-3">
              <p className="text-xs text-muted-foreground font-medium">
                {doneCount} di {modLessons.length} lezioni completate
              </p>
              <p className="text-sm font-bold text-subject-accent tabular-nums">{pct}%</p>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full rounded-full bg-subject-accent transition-all duration-700 ease-m3-emphasized"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Banner "in generazione" ── */}
      {isModuleGenerating && (
        <div className="mx-4 mt-4 rounded-[20px] bg-card border border-border p-4 flex items-center gap-3.5 animate-fade-up">
          <span className="w-10 h-10 rounded-[14px] bg-surface-container-high flex items-center justify-center flex-shrink-0">
            <Loader2 className="w-5 h-5 text-tertiary animate-spin" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">Sto generando le lezioni…</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Le nuove lezioni entreranno qui appena pronte
            </p>
          </div>
          <span className="text-lg font-extrabold tabular-nums text-tertiary flex-shrink-0">
            {genTotal > 0 ? Math.min(100, Math.round((genCount / genTotal) * 100)) : 8}%
          </span>
        </div>
      )}
      {isModuleGenerating && genTotal > 0 && (
        <div className="mx-4 mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-subject-accent transition-all duration-500"
            style={{ width: `${Math.max(4, Math.min(100, (genCount / genTotal) * 100))}%` }}
          />
        </div>
      )}

      {/* ── Il percorso squadrato — stagger entrance */}
      <motion.div className="relative mx-2 mt-5" style={{ height } as any} initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}>
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <g
            className="segs"
            dangerouslySetInnerHTML={{ __html: segs }}
            style={{ strokeWidth: 8, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" }}
          />
        </svg>

        {/* Nodi */}
        {modLessons.map(({ lesson, globalIndex }, i) => {
          const side = i % 2 === 0 ? "l" : "r";
          const x = side === "l" ? L_COL : R_COL;
          const y = i * STEP + NODE / 2;
          const state: NodeState = isModuleGenerating ? "gen" : stateOf(globalIndex, lesson);
          const clickable = !isModuleGenerating && (state === "av" || state === "cur" || state === "done");

          return (
            <motion.div
              key={lesson.id}
              variants={{
                hidden: { opacity: 0, scale: 0.85, y: 12 },
                visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 28, bounce: 0.15, duration: 0.4 } },
              }}
              className={cn(
                "absolute flex items-center justify-center rounded-[16px] font-display font-extrabold text-base select-none",
                "transition-all duration-200",
                state === "done" && "bg-subject-accent text-subject-accent-foreground shadow-level-2",
                state === "cur" && "bg-card border-[3px] border-subject-accent text-foreground shadow-level-3 animate-breathe-ring",
                state === "av" && "bg-card border-2 border-border text-tertiary",
                state === "lock" && "bg-surface-container-high border-2 border-border text-muted-foreground",
                state === "gen" && "bg-card border-[2.5px] border-dashed border-tertiary text-tertiary",
                clickable && "cursor-pointer hover:bg-surface-container-high active:scale-[0.96]",
              )}
              style={{
                left: `${x}%`,
                top: y - NODE / 2,
                width: NODE,
                height: NODE,
                transform: "translateX(-50%)",
                touchAction: "manipulation",
                WebkitUserSelect: "none",
                userSelect: "none",
              }}
              onClick={() => {
                if (longPressTriggeredRef.current) {
                  longPressTriggeredRef.current = false;
                  return;
                }
                if (clickable) onSelectLesson(globalIndex);
              }}
              onPointerDown={() => startPress(lesson, globalIndex)}
              onPointerUp={() => { clearPressTimer(); detectDoubleTap(lesson, globalIndex); }}
              onPointerLeave={clearPressTimer}
              onPointerCancel={clearPressTimer}
              onContextMenu={(e) => e.preventDefault()}
              onDoubleClick={() => {
                if (isGeneratingLesson) return;
                setMenuLesson({ lesson, index: globalIndex });
                setIsRenaming(false);
                setRenameValue(lesson.title);
              }}
            >
              {state === "done" ? (
                <Check className="w-5 h-5" strokeWidth={2.5} />
              ) : state === "lock" ? (
                <Lock className="w-4 h-4" strokeWidth={1.9} />
              ) : state === "gen" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                globalIndex + 1
              )}

              {/* Etichetta corrente */}
              {state === "cur" && !isGeneratingLesson && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
                  <span className="inline-flex items-center gap-1 bg-subject-accent text-subject-accent-foreground text-[10.5px] font-extrabold px-2.5 py-1 rounded-full shadow-level-1">
                    <Play className="w-2.5 h-2.5" fill="currentColor" strokeWidth={0} />
                    Riprendi
                  </span>
                </span>
              )}

              {/* P24 — riquadro del titolo: STESSO MATERIALE del tasto Riprendi
                  (velo bianco traslucido), ancorato al LATO INTERNO del nodo e
                  limitato in larghezza (max 36vw) per NON oltrepassare la linea
                  verticale centrale del percorso: mai sopra il sentiero.
                  Forma allungata: poco padding verticale, testo compatto. */}
              <div
                className={cn(
                  "absolute top-[calc(100%+14px)] z-10",
                  side === "l" ? "left-0" : "right-0",
                )}
                style={{ width: "min(36vw, 150px)" }}
              >
                <div className="rounded-xl bg-foreground/10 backdrop-blur-sm border border-foreground/20 shadow-level-1 px-3 py-1.5">
                  <span className="block text-[11.5px] font-semibold leading-snug text-foreground line-clamp-2">
                    {lesson.title}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Trofeo test finale */}
        <div
          className={cn(
            "absolute flex items-center justify-center rounded-[20px] font-display select-none transition-all duration-200",
            allDone && "bg-subject-accent text-subject-accent-foreground shadow-level-2 cursor-pointer hover:opacity-90 active:scale-[0.96]",
            !allDone && "bg-surface-container-high border-2 border-border text-muted-foreground",
          )}
          style={{
            left: `${MID}%`,
            top: n * STEP + 20 - TROPHY / 2,
            width: TROPHY,
            height: TROPHY,
            transform: "translateX(-50%)",
          }}
          role={allDone && showFinalTest && onStartFinalTest ? "button" : undefined}
          onClick={() => {
            if (allDone && showFinalTest && onStartFinalTest && !isLoadingFinalTest) {
              onStartFinalTest();
            }
          }}
        >
          {isLoadingFinalTest ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Trophy className="w-6 h-6" strokeWidth={1.8} />
          )}
          <div className="absolute top-[calc(100%+14px)] left-1/2 -translate-x-1/2 z-10 whitespace-nowrap">
            <div className="rounded-xl bg-foreground/10 backdrop-blur-sm border border-foreground/20 shadow-level-1 px-3 py-1 text-center">
              <span className="text-[11px] font-bold text-foreground">Test finale</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottone modulo completato */}
      {allDone && (
        <div className="px-4 mt-14">
          <button
            type="button"
            onClick={onModuleCompleted}
            className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold text-sm transition-all duration-200 hover:bg-primary/90 active:scale-[0.97]"
          >
            ✓ Modulo completato — Torna ai moduli
          </button>
        </div>
      )}

      {/* ── Long-press action drawer ── */}
      <Drawer open={!!menuLesson} onOpenChange={(open) => { if (!open) closeMenu(); }}>
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
                    <Button size="icon" onClick={handleRename} disabled={actionLoading === "rename" || !renameValue.trim()} className="h-11 w-11 rounded-full flex-shrink-0" aria-label="Conferma">
                      {actionLoading === "rename" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="outline" onClick={() => setIsRenaming(false)} className="h-11 w-11 rounded-full flex-shrink-0" aria-label="Annulla">
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
