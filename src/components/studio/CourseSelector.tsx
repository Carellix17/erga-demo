import { BookOpen, Globe, FileText, Pencil, Loader2, ChevronDown, Check, MoreHorizontal, RefreshCw, Trash2, FolderOpen } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Course {
  id: string;
  file_name: string;
  processing_status?: string | null;
  lesson_count?: number | null;
}

interface CourseSelectorProps {
  courses: Course[];
  activeContextId: string | null;
  onSelectCourse: (contextId: string) => void;
  onRenameCourse?: (contextId: string, newName: string) => Promise<void> | void;
  onRegenerateCourse?: (contextId: string) => Promise<void> | void;
  onDeleteCourse?: (contextId: string) => Promise<void> | void;
  onOpenMaterials?: (contextId: string) => void;
  isRegenerating?: boolean;
}

const getIcon = (name: string) => {
  if (name.startsWith("🌐") || name.toLowerCase().includes("web")) return Globe;
  if (name.endsWith(".pdf")) return FileText;
  return BookOpen;
};

const cleanName = (name: string) =>
  name.replace(/^🌐\s*/, "").replace(/\.pdf$/i, "");

// 🌿 P21b ERGA OPAL: la "pillola semaforo" è diventata una SCHEDA SOBRIA.
// Niente più un colore diverso per materia: carbone su nero, bianco su carta,
// icona sottile in un tondo neutro e il menu ⋯ sempre al posto giusto.
// La LOGICA è identica: stesso long-press per rinominare, stesso selettore,
// stesse azioni (rinomina / rigenera / materiale / elimina).

export function CourseSelector({
  courses,
  activeContextId,
  onSelectCourse,
  onRenameCourse,
  onRegenerateCourse,
  onDeleteCourse,
  onOpenMaterials,
  isRegenerating,
}: CourseSelectorProps) {
  // N.B.: gli hook devono essere chiamati PRIMA di qualunque return anticipato
  // (regole di React). L'uscita "nessun corso" e' piu' sotto, dopo gli hook.
  const [open, setOpen] = useState(false);
  const [renameCourse, setRenameCourse] = useState<Course | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Position the floating menu right below the "more" button.
  useLayoutEffect(() => {
    if (!menuOpen) return;
    const update = () => {
      const el = moreBtnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Uscita anticipata: da qui in poi tutto assume almeno un corso.
  if (courses.length === 0) return null;

  const active = courses.find((c) => c.id === activeContextId) ?? courses[0];
  const ActiveIcon = getIcon(active.file_name);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = (course: Course) => {
    if (!onRenameCourse) return;
    longPressTriggered.current = false;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      try { navigator.vibrate?.(20); } catch { /* alcune piattaforme non supportano la vibrazione: si ignora */ }
      setRenameValue(cleanName(course.file_name));
      setRenameCourse(course);
    }, 500);
  };

  const handleSelect = (course: Course) => {
    onSelectCourse(course.id);
    setOpen(false);
  };

  const handleSaveRename = async () => {
    if (!renameCourse || !onRenameCourse) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === cleanName(renameCourse.file_name)) {
      setRenameCourse(null);
      return;
    }
    setIsSaving(true);
    try {
      await onRenameCourse(renameCourse.id, trimmed);
      setRenameCourse(null);
    } finally {
      setIsSaving(false);
    }
  };

  const multi = courses.length > 1;

  const openRename = () => {
    setRenameValue(cleanName(active.file_name));
    setRenameCourse(active);
  };
  const handleRegenerate = async () => {
    if (!onRegenerateCourse) return;
    await onRegenerateCourse(active.id);
  };
  const handleOpenMaterials = () => onOpenMaterials?.(active.id);
  const handleDelete = async () => {
    if (!onDeleteCourse) return;
    setIsDeleting(true);
    try {
      await onDeleteCourse(active.id);
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const actions = [
    { key: "rename", label: "Rinomina", icon: Pencil, onClick: openRename, show: !!onRenameCourse },
    { key: "regen", label: "Rigenera", icon: RefreshCw, onClick: handleRegenerate, show: !!onRegenerateCourse, loading: isRegenerating },
    { key: "material", label: "Materiale", icon: FolderOpen, onClick: handleOpenMaterials, show: !!onOpenMaterials },
    { key: "delete", label: "Elimina", icon: Trash2, onClick: () => setConfirmDelete(true), show: !!onDeleteCourse, danger: true },
  ].filter((a) => a.show);

  const activeMeta =
    typeof active.lesson_count === "number" && active.lesson_count > 0
      ? `${active.lesson_count} lezioni`
      : "Percorso attivo";

  return (
    <>
      {/* ── Scheda del percorso attivo ── */}
      <div className="px-4 pt-5 animate-fade-up">
        <div className="flex items-stretch gap-2">
          <button
            type="button"
            onClick={() => {
              if (longPressTriggered.current) {
                longPressTriggered.current = false;
                return;
              }
              if (multi) setOpen(true);
            }}
            onPointerDown={() => startLongPress(active)}
            onPointerUp={clearLongPress}
            onPointerLeave={clearLongPress}
            onPointerCancel={clearLongPress}
            onContextMenu={(e) => e.preventDefault()}
            className={cn(
              "flex-1 min-w-0 flex items-center gap-3.5 bg-card rounded-[20px] px-4 py-3.5 text-left select-none touch-none",
              "transition-colors duration-200",
              multi && "hover:bg-surface-container-high active:bg-surface-container-highest",
            )}
          >
            <span className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              <ActiveIcon className="w-5 h-5 text-foreground" strokeWidth={1.75} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block truncate font-display font-bold text-[17px] text-foreground">
                {cleanName(active.file_name)}
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {activeMeta}
              </span>
            </span>
            {multi && (
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-300",
                  open && "rotate-180",
                )}
              />
            )}
          </button>

          {actions.length > 0 && (
            <button
              ref={moreBtnRef}
              type="button"
              aria-label="Azioni corso"
              onClick={() => setMenuOpen((v) => !v)}
              className="w-[52px] rounded-[20px] bg-card hover:bg-surface-container-high active:bg-surface-container-highest transition-colors duration-200 flex items-center justify-center flex-shrink-0"
            >
              <MoreHorizontal className="w-5 h-5 text-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Floating context menu */}
      {menuOpen && menuPos && createPortal(
        <>
          <div className="fixed inset-0 z-[85]" onClick={() => setMenuOpen(false)} />
          <div
            role="menu"
            style={{ top: menuPos.top, right: menuPos.right }}
            className={cn(
              "fixed z-[86] min-w-[200px] rounded-[18px] bg-popover shadow-level-3 border border-outline-variant/60 p-1.5",
              "animate-in fade-in-0 zoom-in-95 duration-200 ease-m3-emphasized-decel origin-top-right",
            )}
          >
            {actions.map((a) => {
              const Icon = a.icon;
              const danger = a.danger;
              return (
                <button
                  key={a.key}
                  role="menuitem"
                  disabled={a.loading}
                  onClick={() => {
                    setMenuOpen(false);
                    a.onClick();
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-150",
                    danger
                      ? "text-destructive hover:bg-error-container/40"
                      : "text-foreground hover:bg-secondary",
                  )}
                >
                  {a.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className={cn("w-4 h-4", danger ? "text-destructive" : "text-foreground/80")} strokeWidth={1.75} />
                  )}
                  <span className="text-sm font-medium">{a.label}</span>
                </button>
              );
            })}
          </div>
        </>,
        document.body,
      )}

      <AlertDialog open={confirmDelete} onOpenChange={(o) => !isDeleting && setConfirmDelete(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare "{cleanName(active.file_name)}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Verranno rimosse anche tutte le lezioni e gli esercizi collegati a questo corso. L'azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Selettore dei percorsi ── */}
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-scrim/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Seleziona un percorso"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-full max-w-sm bg-popover rounded-[24px] shadow-level-3 p-5",
              "animate-in fade-in-0 zoom-in-95 duration-300 ease-m3-emphasized-decel",
            )}
          >
            <div className="mb-4 px-1">
              <h3 className="font-display text-xl font-bold text-foreground">I tuoi percorsi</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Scegli su quale vuoi lavorare
              </p>
            </div>
            <div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto">
              {courses.map((course) => {
                const Icon = getIcon(course.file_name);
                const isActive = course.id === active.id;
                const meta =
                  typeof course.lesson_count === "number" && course.lesson_count > 0
                    ? `${course.lesson_count} lezioni`
                    : null;
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => handleSelect(course)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-2xl w-full text-left transition-colors duration-150",
                      isActive ? "bg-accent" : "hover:bg-secondary active:bg-secondary",
                    )}
                  >
                    <span
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                        isActive ? "bg-tertiary/20 text-tertiary" : "bg-secondary text-foreground",
                      )}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "block truncate text-[15px] font-semibold",
                          isActive ? "text-accent-foreground" : "text-foreground",
                        )}
                      >
                        {cleanName(course.file_name)}
                      </span>
                      {meta && (
                        <span className="block text-xs text-muted-foreground mt-0.5">{meta}</span>
                      )}
                    </span>
                    {isActive && <Check className="w-4 h-4 text-tertiary flex-shrink-0" strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Drawer open={!!renameCourse} onOpenChange={(o) => !o && setRenameCourse(null)}>
        <DrawerContent className="rounded-t-[32px]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2 font-display text-2xl">
              <Pencil className="w-5 h-5 text-foreground" strokeWidth={1.75} />
              Rinomina corso
            </DrawerTitle>
            <DrawerDescription>
              Dai un nuovo nome al tuo corso. Il cambiamento verrà salvato nel cloud.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2">
            <Input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveRename();
              }}
              placeholder="Nome del corso"
              className="rounded-2xl"
            />
          </div>
          <DrawerFooter className="flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-full"
              onClick={() => setRenameCourse(null)}
              disabled={isSaving}
            >
              Annulla
            </Button>
            <Button
              className="flex-1 h-12 rounded-full"
              onClick={handleSaveRename}
              disabled={isSaving || !renameValue.trim()}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salva"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
