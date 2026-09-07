import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarX2 } from "lucide-react";
import { format, isSameDay, isToday } from "date-fns";
import { it, enUS } from "date-fns/locale";
import type { StudyEvent } from "@/hooks/useStudyEvents";
import type { Evaluation } from "@/hooks/useEvaluations";
import type { UserRoutine, RoutineKind } from "@/hooks/useUserRoutines";
import type { UserSubject } from "@/hooks/useUserSubjects";
import { resolveSubjectColor, type SubjectColor } from "@/lib/subjectColors";
import {
  getWeekDays, dayKey, timeToMinutes, isoToDayMinutes, routineSegmentsForDay,
  positionDayEvents, freeSlots, computeGridRange, visibleRoutineBlocks, routineDayWindow,
  blockTop, blockHeight, gridHeightPx, gridHours,
  WEEK_DAY_START_MIN, WEEK_DAY_END_MIN,
  type DayEventRow, type TimeBlock,
} from "@/lib/weekPlanner";
import { cn } from "@/lib/utils";
import { routineTint, subjectTint } from "@/lib/pianoPalette";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// 🎨 P46 — blocchi routine con la palette vivida "tinted-surface"
// (fondo al 18% del colore fisso, barra sinistra piena, testo chiaro AA).

interface WeekPlannerProps {
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  events: StudyEvent[];
  evaluations: Evaluation[];
  routines: UserRoutine[];
  subjects: UserSubject[];
  /** Tocco/click su un blocco sessione di studio (apre la modifica). */
  onOpenStudyEvent?: (id: string) => void;
  /** Tocco/click su un blocco verifica/compito (apre la modifica). */
  onOpenEvaluation?: (id: string) => void;
}

export function WeekPlanner({
  selectedDate, onSelectDate, events, evaluations, routines, subjects,
  onOpenStudyEvent, onOpenEvaluation,
}: WeekPlannerProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith("en") ? enUS : it;

  // Su mobile si vede un giorno alla volta (scelto con i pallini in alto)
  const dayIdxOf = (d: Date) => (d.getDay() === 0 ? 6 : d.getDay() - 1);
  const [mobileDayIdx, setMobileDayIdx] = useState<number>(() => dayIdxOf(selectedDate));

  // Se il giorno selezionato cambia da fuori (es. cliccando un evento), segui il cambio
  useEffect(() => {
    setMobileDayIdx(dayIdxOf(selectedDate));
  }, [selectedDate]);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  // Lettera stretta del giorno presa da date-fns (L/M/M... in italiano, M/T/W... in inglese)
  const dayLetters = useMemo(
    () => weekDays.map((d) => format(d, "EEEEE", { locale: dateLocale }).toUpperCase()),
    [weekDays, dateLocale],
  );

  // Mappa nome materia (minuscolo) -> scelta colore utente
  const colorByName = useMemo(() => {
    const m = new Map<string, UserSubject>();
    for (const s of subjects) m.set(s.name.toLowerCase(), s);
    return m;
  }, [subjects]);

  const colorForSubject = (name?: string): SubjectColor | undefined => {
    if (!name) return undefined;
    const custom = colorByName.get(name.toLowerCase());
    return resolveSubjectColor(name, custom?.color);
  };

  const subjectNameById = useMemo(() => {
    const m = new Map(subjects.map((s) => [s.id, s.name] as const));
    return m;
  }, [subjects]);

  /** Le righe (eventi + scadenze) di un certo giorno, pronte per il posizionamento. */
  const rowsForDay = (day: Date): DayEventRow[] => {
    const key = dayKey(day);
    const rows: DayEventRow[] = [];
    for (const ev of events) {
      if (dayKey(ev.event_date) === key) {
        rows.push({
          id: ev.id, title: ev.title, subjectName: ev.subject,
          minutes: timeToMinutes(ev.event_time ?? null), kind: ev.event_type,
        });
      }
    }
    for (const ev of evaluations) {
      if (dayKey(new Date(ev.date)) === key) {
        rows.push({
          id: ev.id, title: ev.title,
          subjectName: ev.subject_id ? subjectNameById.get(ev.subject_id) : undefined,
          minutes: isoToDayMinutes(ev.date), kind: "evaluation",
        });
      }
    }
    return rows;
  };

  interface RoutineSegment extends TimeBlock { kind: RoutineKind; label: string; key: string }

  /** Dati grezzi di ogni giorno: segmenti routine, finestre libere, orari eventi. */
  const daysData = useMemo(() => weekDays.map((day, i) => {
    const dayN = i + 1;
    const segments: RoutineSegment[] = routines.flatMap((r) =>
      routineSegmentsForDay(r.days_of_week, r.start_time, r.end_time, dayN).map((seg, j) => ({
        ...seg,
        kind: r.kind,
        label: r.label || t(`piano.routine_${r.kind}`),
        key: `${r.id}-${dayN}-${j}`,
      })),
    );
    // P46: la griglia parte dal RISVEGLIO e chiude all'ora di dormire
    // (ricavati dal sonno della routine; default 06:30 → 23:00).
    const window = routineDayWindow(segments);
    const slots = freeSlots(
      segments.map(({ start, end }) => ({ start, end })),
      window.startMin,
      window.endMin,
    );
    const rows = rowsForDay(day);
    const eventMins = rows.filter((r) => r.minutes !== null).map((r) => r.minutes as number);
    return { day, dayN, segments, slots, rows, eventMins };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [weekDays, routines, events, evaluations, subjectNameById, t, i18n.language]);

  // Desktop: un intervallo unico per tutta la settimana (colonne allineate).
  // Mobile: intervallo ricalcolato sul solo giorno mostrato.
  const weekRange = useMemo(
    () => computeGridRange(daysData.map((d) => d.slots), daysData.map((d) => d.eventMins)),
    [daysData],
  );
  const mobileDayData = daysData[mobileDayIdx] ?? daysData[0];
  const mobileRange = useMemo(
    () => mobileDayData ? computeGridRange([mobileDayData.slots], [mobileDayData.eventMins]) : weekRange,
    [mobileDayData, weekRange],
  );

  /** Tocco su un blocco: seleziona il giorno E apre la relativa scheda di modifica. */
  const openItem = (kind: string, id: string, day: Date) => {
    onSelectDate(day);
    if (kind === "evaluation") onOpenEvaluation?.(id);
    else onOpenStudyEvent?.(id);
  };

  const renderDayColumn = (data: (typeof daysData)[number], gridStart: number, gridEnd: number) => {
    const { day, dayN, segments, slots, rows } = data;
    const { timed, untimed } = positionDayEvents(rows, gridStart);
    const routineVisible = visibleRoutineBlocks(segments, gridStart, gridEnd);
    const height = gridHeightPx(gridStart, gridEnd);

    return (
      <div key={dayKey(day)} className="relative flex-1 min-w-[92px] border-l border-outline-variant first:border-l-0">
        {/* Striscia "senza orario" */}
        {untimed.length > 0 && (
          <div className="border-b border-outline-variant bg-secondary/50 px-1 py-1 space-y-1">
            {untimed.map((u) => {
              const col = u.kind === "evaluation" ? undefined : colorForSubject(u.subjectName);
              return (
                <Tooltip key={u.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => openItem(u.kind, u.id, day)}
                      className="block w-full text-left text-[10px] leading-tight px-1.5 py-0.5 rounded-md truncate cursor-pointer active:scale-[0.98] transition-transform"
                      style={{ ...subjectTint(u.subjectName), borderLeft: `3px solid ${subjectTint(u.subjectName).dot}` }}
                    >
                      {u.title}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px]">{u.title}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}

        {/* Griglia oraria della colonna */}
        <div className="relative" style={{ height }}>
          {/* Giornata senza spazi liberi e senza eventi: uno stato vuoto amichevole */}
          {slots.length === 0 && rows.length === 0 && (
            <div className="absolute inset-x-0 top-1/3 flex flex-col items-center gap-1 pointer-events-none">
              <CalendarX2 className="w-5 h-5 text-muted-foreground/50" />
              <p className="text-[10px] text-muted-foreground">{t("piano.fullDay")}</p>
            </div>
          )}

          {/* Finestre libere: gli spazi dove si puo' pianificare lo studio */}
          {slots.map((s) => (
            <div
              key={`slot-${s.start}`}
              className="absolute left-0.5 right-0.5 rounded-md bg-tertiary-container/70"
              style={{
                top: blockTop(Math.max(s.start, gridStart), gridStart) + 1,
                height: blockHeight(Math.min(s.end, gridEnd) - Math.max(s.start, gridStart)) - 2,
              }}
            />
          ))}

          {/* linee orarie (sopra le finestre, sotto i contenuti) */}
          {gridHours(gridStart, gridEnd).map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-t border-outline-variant"
              style={{ top: blockTop(h * 60, gridStart) }}
            />
          ))}

          {/* blocchi routine visibili: spiegano i buchi (es. la merenda) */}
          {routineVisible.map((b) => {
            const h = blockHeight(b.end - b.start) - 2;
            return (
              <Tooltip key={b.key}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute left-0.5 right-0.5 rounded-md text-[9px] px-1.5 overflow-hidden"
                    style={{ top: blockTop(b.start, gridStart) + 1, height: h, ...routineTint(b.kind) }}
                  >
                    {h >= 16 && <span className="font-medium opacity-70 leading-none">{b.label}</span>}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">{b.label}</TooltipContent>
              </Tooltip>
            );
          })}

          {/* eventi con orario (affiancati se si sovrappongono) */}
          {timed.map((row) => {
            const col = row.kind === "evaluation" ? undefined : colorForSubject(row.subjectName);
            const widthPct = 100 / row.lanes;
            return (
              <Tooltip key={row.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => openItem(row.kind, row.id, day)}
                    className="absolute text-left rounded-lg px-1.5 py-1 overflow-hidden shadow-sm z-10 cursor-pointer active:scale-[0.98] transition-transform"
                    style={{
                      ...subjectTint(row.subjectName),
                      borderLeft: `4px solid ${subjectTint(row.subjectName).dot}`,
                      top: row.top + 1,
                      height: row.height - 2,
                      left: `calc(${(row.lane * 100) / row.lanes}% + 3px)`,
                      width: `calc(${widthPct}% - 5px)`,
                    }}
                  >
                    <p className="text-[10px] font-semibold leading-tight line-clamp-2">{row.title}</p>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  {row.subjectName ? `${row.subjectName}: ${row.title}` : row.title}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    );
  };

  const hourAxis = (gridStart: number, gridEnd: number) => (
    <div className="w-10 shrink-0 relative" style={{ height: gridHeightPx(gridStart, gridEnd) }}>
      {gridHours(gridStart, gridEnd).map((h) => (
        <div
          key={h}
          className="absolute left-0 right-0 pr-1 text-right text-[10px] text-muted-foreground tabular-nums"
          style={{ top: blockTop(h * 60, gridStart) - 5 }}
        >
          {String(h).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {/* Intestazioni giorni (click = daily planning di quel giorno) */}
      <div className="hidden md:flex">
        <div className="w-10 shrink-0" />
        {weekDays.map((day, i) => (
          <DayHeader
            key={dayKey(day)}
            day={day}
            letter={dayLetters[i]}
            selected={isSameDay(day, selectedDate)}
            onClick={() => onSelectDate(day)}
          />
        ))}
      </div>

      {/* Mobile: pallini dei giorni */}
      <div className="md:hidden flex items-center justify-between gap-1 pb-2">
        {weekDays.map((day, i) => {
          const active = i === mobileDayIdx;
          return (
            <button
              key={dayKey(day)}
              onClick={() => { setMobileDayIdx(i); onSelectDate(day); }}
              aria-pressed={active}
              className={cn(
                "flex-1 h-10 rounded-full text-xs font-semibold transition-all flex flex-col items-center justify-center",
                active ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-secondary",
                isToday(day) && !active && "text-primary",
              )}
            >
              <span>{dayLetters[i]}</span>
              <span className="text-[10px] opacity-80">{format(day, "d")}</span>
            </button>
          );
        })}
      </div>

      {/* Desktop: 7 colonne | Mobile: solo il giorno scelto */}
      <div className="overflow-y-auto max-h-[56vh] rounded-xl border border-outline-variant bg-card">
        <div className="hidden md:flex">
          {hourAxis(weekRange.startMin, weekRange.endMin)}
          {daysData.map((d) => renderDayColumn(d, weekRange.startMin, weekRange.endMin))}
        </div>
        <div className="md:hidden flex">
          {hourAxis(mobileRange.startMin, mobileRange.endMin)}
          {mobileDayData && renderDayColumn(mobileDayData, mobileRange.startMin, mobileRange.endMin)}
        </div>
      </div>
    </div>
  );
}

function DayHeader({ day, letter, selected, onClick }: { day: Date; letter: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className="flex-1 min-w-[92px] py-2 flex flex-col items-center gap-0.5 rounded-t-xl transition-colors hover:bg-secondary"
    >
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{letter}</span>
      <span
        className={cn(
          "w-7 h-7 flex items-center justify-center rounded-full text-sm",
          selected && "bg-foreground text-background shadow-sm",
          !selected && isToday(day) && "text-primary font-bold",
        )}
      >
        {format(day, "d", { locale: it })}
      </span>
    </button>
  );
}
