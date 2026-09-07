import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, CalendarClock, Loader2, Save } from "lucide-react";
import {
  useUserRoutines, useAddUserRoutine, useUpdateUserRoutine, useDeleteUserRoutine,
  type RoutineKind, type UserRoutine,
} from "@/hooks/useUserRoutines";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CoreCard } from "./CoreCard";
import { RoutineSkeleton } from "./RoutineSkeleton";
import {
  ROUTINE_DAYS, ROUTINE_GRID_HEIGHT, ROUTINE_HOURS, ROUTINE_KINDS, ROUTINE_ROW_H,
  findRoutineConflict, fmtTime, layoutRoutineSegments, minToTime, routineDayLabel,
  routineKindLabel, routineLayoutByDay, routineSegmentsByDay, toMin,
} from "@/lib/routineLayout";

// 🎨 P9c: pastelli soft centralizzati nel kit (index.css .routine-*) — fuori i saturi blue/indigo/amber
const KIND_STYLES: Record<RoutineKind, { chip: string; dot: string }> = {
  school: { chip: "routine-school", dot: "routine-school-dot" },
  sleep: { chip: "routine-sleep", dot: "routine-sleep-dot" },
  meal: { chip: "routine-meal", dot: "routine-meal-dot" },
  other: { chip: "routine-other", dot: "routine-other-dot" },
};

export function WeeklyRoutineEditor() {
  const { toast } = useToast();

  const routines = useUserRoutines();
  const addRoutine = useAddUserRoutine();
  const updateRoutine = useUpdateUserRoutine();
  const delRoutine = useDeleteUserRoutine();

  // Modal state (creazione + modifica)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rKind, setRKind] = useState<RoutineKind>("school");
  const [rLabel, setRLabel] = useState("");
  const [rStart, setRStart] = useState("08:00");
  const [rEnd, setREnd] = useState("13:00");
  const [rDays, setRDays] = useState<number[]>([1, 2, 3, 4, 5]);

  // Vista mobile: giorno attivo nella colonna agenda
  const [mobileDay, setMobileDay] = useState<number>(() => {
    const js = new Date().getDay(); // 0=Dom..6=Sab
    return js === 0 ? 7 : js;
  });

  const openCreate = (prefill?: { day?: number; hour?: number }) => {
    setEditingId(null);
    setRKind("school");
    setRLabel("");
    const startHour = prefill?.hour ?? 8;
    setRStart(`${String(startHour).padStart(2, "0")}:00`);
    setREnd(`${String(Math.min(startHour + 1, 23)).padStart(2, "0")}:00`);
    setRDays(prefill?.day ? [prefill.day] : [1, 2, 3, 4, 5]);
    setModalOpen(true);
  };

  const openEdit = (r: UserRoutine) => {
    setEditingId(r.id);
    setRKind(r.kind);
    setRLabel(r.label ?? "");
    setRStart(fmtTime(r.start_time));
    setREnd(fmtTime(r.end_time));
    setRDays([...(r.days_of_week ?? [])].sort());
    setModalOpen(true);
  };

  const toggleDay = (n: number) =>
    setRDays((prev) => (prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n].sort()));

  const handleSaveRoutine = async () => {
    if (rDays.length === 0) {
      toast({ title: "Seleziona almeno un giorno", variant: "destructive" });
      return;
    }
    if (!rStart || !rEnd) {
      toast({ title: "Orario non valido", description: "Inserisci un orario di inizio e fine.", variant: "destructive" });
      return;
    }
    if (toMin(rStart) === toMin(rEnd)) {
      toast({ title: "Orario non valido", description: "Inizio e fine coincidono.", variant: "destructive" });
      return;
    }

    // Controllo sovrapposizioni (gestisce anche i blocchi che attraversano la mezzanotte)
    const conflict = findRoutineConflict(
      { startTime: rStart, endTime: rEnd, days: rDays },
      routines.data ?? [],
      editingId,
    );
    if (conflict) {
      const routineName =
        conflict.existing.routine?.label ??
        routineKindLabel(conflict.existing.routine?.kind ?? "other");
      toast({
        title: "Routine sovrapposta",
        description: `${routineDayLabel(conflict.candidate.day)}, ${minToTime(conflict.candidate.startMin)}–${minToTime(conflict.candidate.endMin)} si sovrappone a ${routineName} (${minToTime(conflict.existing.startMin)}–${minToTime(conflict.existing.endMin)}).`,
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        kind: rKind,
        label: rLabel.trim() || null,
        start_time: rStart,
        end_time: rEnd,
        days_of_week: rDays,
      };
      if (editingId) {
        await updateRoutine.mutateAsync({ id: editingId, ...payload });
      } else {
        await addRoutine.mutateAsync(payload);
      }
      setModalOpen(false);
    } catch (e) {
      toast({ title: "Errore", description: (e as Error)?.message ?? "Impossibile salvare", variant: "destructive" });
    }
  };

  const handleDeleteRoutine = async () => {
    if (!editingId) return;
    try {
      await delRoutine.mutateAsync(editingId);
      setModalOpen(false);
    } catch (e) {
      toast({ title: "Errore", description: (e as Error)?.message ?? "Impossibile eliminare", variant: "destructive" });
    }
  };

  const laidOutByDay = useMemo(() => routineLayoutByDay(routines.data ?? []), [routines.data]);
  const segmentsByDay = useMemo(() => routineSegmentsByDay(routines.data ?? []), [routines.data]);
  const isEmpty = !routines.isLoading && (routines.data?.length ?? 0) === 0;

  const showRoutineSkeleton = useDelayedLoading(routines.isLoading, 100);
  if (showRoutineSkeleton) {
    return <RoutineSkeleton />;
  }
  if (routines.isLoading) {
    return null;
  }

  return (
    <div className="space-y-4">
      <CoreCard
        id="routine"
        icon={CalendarClock}
        title="Settimana"
        description="I tuoi impegni fissi fuori dallo studio (scuola, sonno, pasti, sport). Il piano di studio li eviterà."
        action={
          <Button onClick={() => openCreate()} size="sm" className="h-11 rounded-pill px-4">
            <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
            Aggiungi blocco
          </Button>
        }
      >
        {isEmpty ? (
          <div className="py-8 text-center space-y-2">
            <CalendarClock className="w-8 h-8 mx-auto text-muted-foreground" aria-hidden="true" />
            <p className="body-medium text-muted-foreground">
              Nessuna attività programmata.
            </p>
            <p className="body-small text-muted-foreground">
              Aggiungi i tuoi orari di sport o pasti per ottimizzare lo studio.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-container-low border border-outline-variant/60 overflow-hidden">
            {/* Mobile: pillole di selezione giorno */}
            <div className="md:hidden flex items-center justify-between gap-1 px-3 pt-3 pb-2 border-b border-muted">
              {ROUTINE_DAYS.map((d) => {
                const active = mobileDay === d.n;
                const hasBlocks = (segmentsByDay[d.n]?.length ?? 0) > 0;
                return (
                  <button
                    key={d.n}
                    onClick={() => setMobileDay(d.n)}
                    aria-label={d.label}
                    aria-pressed={active}
                    className={cn(
                      "relative flex-1 h-11 rounded-full text-xs font-semibold transition-all duration-300",
                      active
                        ? "bg-foreground text-background scale-[1.04] shadow-sm"
                        : "text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    {d.short}
                    {hasBlocks && !active && (
                      <span
                        className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-pill bg-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Desktop/Tablet: griglia 7 colonne */}
            <div className="hidden md:block overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="grid" style={{ gridTemplateColumns: "44px repeat(7, minmax(0, 1fr))" }}>
                  <div className="border-b border-muted" />
                  {ROUTINE_DAYS.map((d) => (
                    <div
                      key={d.n}
                      className="text-center py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-muted"
                    >
                      {d.short}
                    </div>
                  ))}
                </div>

                <div
                  className="grid relative"
                  style={{ gridTemplateColumns: "44px repeat(7, minmax(0, 1fr))" }}
                >
                  {/* Colonna ore */}
                  <div className="relative" style={{ height: ROUTINE_GRID_HEIGHT }}>
                    {ROUTINE_HOURS.map((h, i) =>
                      i === 0 ? null : (
                        <div
                          key={h}
                          className="absolute left-0 right-0 text-[10px] text-muted-foreground tabular-nums pr-1 text-right"
                          style={{ top: i * ROUTINE_ROW_H - 6 }}
                        >
                          {String(h).padStart(2, "0")}:00
                        </div>
                      ),
                    )}
                  </div>

                  {/* Colonne giorni */}
                  {ROUTINE_DAYS.map((d) => (
                    <div
                      key={d.n}
                      className="relative border-l border-muted"
                      style={{ height: ROUTINE_GRID_HEIGHT }}
                    >
                      {/* Righe orarie cliccabili */}
                      {ROUTINE_HOURS.map((h, i) => (
                        <button
                          key={h}
                          onClick={() => openCreate({ day: d.n, hour: h })}
                          className="absolute left-0 right-0 border-b border-muted hover:bg-muted/60 transition-colors"
                          style={{ top: i * ROUTINE_ROW_H, height: ROUTINE_ROW_H }}
                          aria-label={`Aggiungi blocco ${d.label} ${h}:00`}
                        />
                      ))}

                      {/* Blocchi routine */}
                      {laidOutByDay[d.n].map((seg, idx) => (
                        <RoutineBlockButton
                          key={`${seg.routine.id}-${d.n}-${idx}`}
                          seg={seg}
                          onEdit={() => openEdit(seg.routine)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile: agenda del giorno attivo */}
            <div className="md:hidden">
              <div className="grid relative" style={{ gridTemplateColumns: "44px minmax(0, 1fr)" }}>
                <div className="relative" style={{ height: ROUTINE_GRID_HEIGHT }}>
                  {ROUTINE_HOURS.map((h, i) =>
                    i === 0 ? null : (
                      <div
                        key={h}
                        className="absolute left-0 right-0 text-[10px] text-muted-foreground tabular-nums pr-1 text-right"
                        style={{ top: i * ROUTINE_ROW_H - 6 }}
                      >
                        {String(h).padStart(2, "0")}:00
                      </div>
                    ),
                  )}
                </div>

                <div className="relative border-l border-muted" style={{ height: ROUTINE_GRID_HEIGHT }}>
                  {ROUTINE_HOURS.map((h, i) => (
                    <button
                      key={h}
                      onClick={() => openCreate({ day: mobileDay, hour: h })}
                      className="absolute left-0 right-0 border-b border-muted active:bg-muted/60"
                      style={{ top: i * ROUTINE_ROW_H, height: ROUTINE_ROW_H }}
                      aria-label={`Aggiungi blocco ${routineDayLabel(mobileDay)} ${h}:00`}
                    />
                  ))}

                  {(laidOutByDay[mobileDay] ?? []).map((seg, idx) => (
                    <RoutineBlockButton
                      key={`m-${seg.routine.id}-${mobileDay}-${idx}`}
                      seg={seg}
                      onEdit={() => openEdit(seg.routine)}
                      mobile
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </CoreCard>

      {/* Modale creazione / modifica routine */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="title-medium font-display">
              {editingId ? "Modifica blocco" : "Nuovo blocco"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label className="label-medium text-muted-foreground">Tipo</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {ROUTINE_KINDS.map((k) => {
                  const active = rKind === k.value;
                  const st = KIND_STYLES[k.value];
                  return (
                    <button
                      key={k.value}
                      onClick={() => setRKind(k.value)}
                      aria-pressed={active}
                      className={cn(
                        "px-3 min-h-[40px] rounded-full text-sm border transition-all duration-300",
                        active ? `${st.chip} shadow-sm scale-105` : "bg-card text-foreground border-border hover:bg-muted/50",
                      )}
                    >
                      <span className={cn("inline-block w-2 h-2 rounded-full mr-1.5 align-middle", st.dot)} aria-hidden="true" />
                      {k.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Sport, hobby e altri impegni fissi → “Altro”.
              </p>
            </div>

            <div>
              <Label htmlFor="routine-label" className="label-medium text-muted-foreground">
                Nome attività (opzionale)
              </Label>
              <Input
                id="routine-label"
                value={rLabel}
                onChange={(e) => setRLabel(e.target.value)}
                placeholder="Es. Palestra, Nuoto, Scuola mattina"
                className="rounded-button h-11 mt-1.5 bg-card border border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="routine-start" className="label-medium text-muted-foreground">Inizio</Label>
                <Input
                  id="routine-start"
                  type="time"
                  value={rStart}
                  onChange={(e) => setRStart(e.target.value)}
                  className="rounded-button h-11 mt-1.5 bg-card border border-border"
                />
              </div>
              <div>
                <Label htmlFor="routine-end" className="label-medium text-muted-foreground">Fine</Label>
                <Input
                  id="routine-end"
                  type="time"
                  value={rEnd}
                  onChange={(e) => setREnd(e.target.value)}
                  className="rounded-button h-11 mt-1.5 bg-card border border-border"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2">
              Se la fine è prima dell'inizio (es. 22:00 → 06:00), il blocco attraversa la mezzanotte.
            </p>

            <div>
              <Label className="label-medium text-muted-foreground">Ripeti nei giorni</Label>
              <div className="flex gap-1.5 mt-1.5">
                {ROUTINE_DAYS.map((d) => {
                  const active = rDays.includes(d.n);
                  return (
                    <button
                      key={d.n}
                      onClick={() => toggleDay(d.n)}
                      aria-pressed={active}
                      aria-label={d.label}
                      className={cn(
                        "flex-1 h-11 rounded-button text-sm font-semibold border transition-all duration-300",
                        active
                          ? "bg-foreground text-background border-foreground scale-[1.03]"
                          : "bg-card text-muted-foreground border-border hover:bg-muted/50",
                      )}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {editingId && (
              <Button
                variant="outline"
                onClick={handleDeleteRoutine}
                disabled={delRoutine.isPending}
                className="w-full h-11 rounded-button bg-card border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {delRoutine.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" aria-hidden="true" />
                )}
                Elimina blocco
              </Button>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="flex-1 h-11 rounded-button"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSaveRoutine}
                disabled={addRoutine.isPending || updateRoutine.isPending}
                className="flex-1 h-11 rounded-button"
              >
                {addRoutine.isPending || updateRoutine.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
                ) : (
                  <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                )}
                {editingId ? "Aggiorna" : "Salva"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface BlockProps {
  seg: ReturnType<typeof layoutRoutineSegments>[number];
  onEdit: () => void;
  mobile?: boolean;
}

/** Blocco routine sulla griglia (bottone: apre la modifica). */
function RoutineBlockButton({ seg, onEdit, mobile }: BlockProps) {
  const r = seg.routine;
  const st = KIND_STYLES[r.kind];
  const laneWidth = 100 / seg.laneCount;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onEdit();
      }}
      className={cn(
        "absolute rounded-xl border overflow-hidden shadow-sm text-left animate-scale-in",
        "hover:shadow-level-1 active:scale-[0.98]",
        mobile ? "px-2.5 py-1.5 text-xs" : "px-1.5 py-1 text-[10px] leading-tight",
        st.chip,
      )}
      style={{
        top: seg.renderTopPx,
        height: seg.renderHeightPx,
        left: `calc(${seg.lane * laneWidth}% + ${mobile ? 6 : 4}px)`,
        width: `calc(${laneWidth}% - ${mobile ? 12 : 8}px)`,
        boxSizing: "border-box",
        transition:
          "transform 350ms cubic-bezier(0.2, 0, 0, 1), box-shadow 200ms, height 300ms ease, top 300ms ease",
      }}
      aria-label={`${r.label || routineKindLabel(r.kind)}, ${routineDayLabel(seg.day)} ${minToTime(seg.startMin)}–${minToTime(seg.endMin)}. Tocca per modificare.`}
    >
      <div className="font-semibold truncate">{r.label || routineKindLabel(r.kind)}</div>
      {seg.renderHeightPx >= 40 && (
        <div className="opacity-70 tabular-nums text-[11px]">
          {minToTime(seg.startMin)}–{minToTime(seg.endMin)}
        </div>
      )}
    </button>
  );
}

