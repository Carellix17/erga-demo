import { addDays, startOfWeek, format } from "date-fns";

/**
 * Logica di supporto per la vista "Settimana" del Piano.
 * Tutte funzioni pure (niente React): facili da testare.
 *
 * Filosofia: la griglia NON mostra tutta la routine dell'utente.
 * Mostra solo le FINESTRE LIBERE in cui si puo' studiare.
 * Gli impegni di routine (scuola, merenda, ...) compaiono solo se
 * cadono dentro la finestra visibile, per spiegare i "buchi".
 * Il sonno non viene mai disegnato: e' implicito ai bordi.
 */

/** I 7 giorni (lun-dom) della settimana che contiene `date`. */
export function getWeekDays(date: Date): Date[] {
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Chiave giorno locale "YYYY-MM-DD" per confrontare date tra loro. */
export function dayKey(d: Date | string): string {
  return typeof d === "string" ? d.slice(0, 10) : format(d, "yyyy-MM-dd");
}

/** "HH:MM" | "HH:MM:SS" -> minuti dall'inizio del giorno. */
export function timeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const parts = t.split(":");
  if (parts.length < 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/** Minuti dall'inizio del giorno per una data/tempo ISO (fuso locale). */
export function isoToDayMinutes(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
}

export interface TimeBlock {
  start: number; // minuti dall'inizio del giorno
  end: number;
}

/**
 * I segmenti di una routine che ricadono nel giorno della settimana `dayN`
 * (1 = lunedì ... 7 = domenica).
 * Gestisce i blocchi "a cavallo di mezzanotte" (es. sonno 23:00 -> 07:00):
 * "giorno X, 23:00 -> 07:00" significa X: 23:00->24:00 E X+1: 00:00->07:00.
 */
export function routineSegmentsForDay(
  daysOfWeek: number[],
  startTime: string,
  endTime: string,
  dayN: number,
): TimeBlock[] {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null || start === end) return [];

  if (end > start) {
    // Blocco normale: appartiene al suo stesso giorno
    return daysOfWeek.includes(dayN) ? [{ start, end }] : [];
  }

  // Blocco overnight: due segmenti su due giorni diversi
  const segments: TimeBlock[] = [];
  if (daysOfWeek.includes(dayN)) segments.push({ start, end: 24 * 60 });
  const prevDay = dayN === 1 ? 7 : dayN - 1;
  if (daysOfWeek.includes(prevDay)) segments.push({ start: 0, end });
  return segments;
}

// ---- Finestre libere (il cuore della nuova vista) ----

/** Limiti assoluti della griglia: mai prima delle 6:00, mai oltre le 24:00. */
export const WEEK_DAY_START_MIN = 6 * 60;
export const WEEK_DAY_END_MIN = 24 * 60;

/** Risveglio e bedtime di DEFAULT quando la routine non dichiara il sonno. */
export const DEFAULT_WAKE_MIN = 6 * 60 + 30;   // 06:30
export const DEFAULT_BEDTIME_MIN = 23 * 60;    // 23:00

/**
 * P46 — La finestra UTILE della giornata ricavata dalla routine:
 * parte dal RISVEGLIO (fine del sonno mattutino) e finisce all'ora di
 * dormire (inizio del sonno serale). Niente ore notturne inutili in griglia.
 * Gestisce il sonno a cavallo di mezzanotte (23:00→07:00: il segmento
 * mattutino 00:00→07:00 termina alle 7:00 → la giornata inizia alle 7:00).
 */
export function routineDayWindow(
  segments: (TimeBlock & { kind: string })[],
): { startMin: number; endMin: number } {
  const sleepEnds = segments
    .filter((s) => s.kind === "sleep" && s.end <= 12 * 60)
    .map((s) => s.end);
  const sleepStarts = segments
    .filter((s) => s.kind === "sleep" && s.start >= 17 * 60)
    .map((s) => s.start);
  const wake = sleepEnds.length > 0 ? Math.max(...sleepEnds) : DEFAULT_WAKE_MIN;
  const bedtime = sleepStarts.length > 0 ? Math.min(...sleepStarts) : DEFAULT_BEDTIME_MIN;
  return {
    startMin: Math.min(Math.max(wake, WEEK_DAY_START_MIN), 11 * 60),
    endMin: Math.max(Math.min(bedtime, WEEK_DAY_END_MIN), 20 * 60),
  };
}

/** Buchi liberi piu' corti di cosi' non vengono mostrati (troppo piccoli per studiare). */
export const MIN_FREE_SLOT_MIN = 20;

/** Unisce i blocchi che si sovrappongono o si toccano (es. due routine parzialmente sovrapposte). */
export function mergeBlocks(blocks: TimeBlock[]): TimeBlock[] {
  const sorted = blocks
    .filter((b) => b.end > b.start)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.start - b.start);
  const out: TimeBlock[] = [];
  for (const b of sorted) {
    const last = out[out.length - 1];
    if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
    else out.push(b);
  }
  return out;
}

/**
 * Le finestre LIBERE della giornata dentro [dayStartMin, dayEndMin]:
 * e' il complemento dei blocchi occupati (routine), filtrato per durata minima.
 * Esempio: routine scuola 8:00-14:00 e sonno 22:30-7:00
 *          -> slot 14:00-22:30 (la mattina non conta, prima delle 6:00 e' gia' sonno).
 */
export function freeSlots(
  blocks: TimeBlock[],
  dayStartMin: number = WEEK_DAY_START_MIN,
  dayEndMin: number = WEEK_DAY_END_MIN,
  minSlotMin: number = MIN_FREE_SLOT_MIN,
): TimeBlock[] {
  const merged = mergeBlocks(
    blocks
      .map((b) => ({ start: Math.max(b.start, dayStartMin), end: Math.min(b.end, dayEndMin) }))
      .filter((b) => b.end > b.start),
  );
  const slots: TimeBlock[] = [];
  let cur = dayStartMin;
  for (const b of merged) {
    if (b.start - cur >= minSlotMin) slots.push({ start: cur, end: b.start });
    cur = Math.max(cur, b.end);
  }
  if (dayEndMin - cur >= minSlotMin) slots.push({ start: cur, end: dayEndMin });
  return slots;
}

// ---- Altezze e posizioni ----

export const WEEK_ROW_H = 40; // px per ora

/** Altezza in pixel per una durata in minuti (almeno un'altezza minima leggibile). */
export function blockHeight(durationMin: number): number {
  const MIN_PX = 26;
  return Math.max(MIN_PX, (durationMin / 60) * WEEK_ROW_H);
}

/** Posizione in pixel dall'alto della griglia (la griglia parte da `gridStartMin`). */
export function blockTop(minutes: number, gridStartMin: number): number {
  const clamped = Math.max(gridStartMin, minutes);
  return ((clamped - gridStartMin) / 60) * WEEK_ROW_H;
}

/** Altezza totale della griglia in pixel. */
export function gridHeightPx(gridStartMin: number, gridEndMin: number): number {
  return ((gridEndMin - gridStartMin) / 60) * WEEK_ROW_H;
}

/** Le ore da etichettare nella colonna degli orari (una per ora, [gridStartMin, gridEndMin) ). */
export function gridHours(gridStartMin: number, gridEndMin: number): number[] {
  const hs: number[] = [];
  for (let m = gridStartMin; m < gridEndMin; m += 60) hs.push(m / 60);
  return hs;
}

/**
 * L'intervallo visibile della griglia, calcolato "in modo intelligente":
 * copre tutte le finestre libere e gli eventi (anche fuori finestra),
 * arrotondato all'ora intera e con una ampiezza minima leggibile.
 */
export function computeGridRange(
  daySlots: TimeBlock[][],
  dayEventMinutes: number[][],
  minSpanMin = 120,
): { startMin: number; endMin: number } {
  let lo = Infinity;
  let hi = -Infinity;
  for (const slots of daySlots) {
    for (const s of slots) {
      lo = Math.min(lo, s.start);
      hi = Math.max(hi, s.end);
    }
  }
  for (const mins of dayEventMinutes) {
    for (const m of mins) {
      lo = Math.min(lo, m);
      // un evento occupa almeno ~1h: il range deve coprire la sua fine
      hi = Math.max(hi, m + 60);
    }
  }
  if (!Number.isFinite(lo)) {
    // Nessuna finestra e nessun evento: pomeriggio standard come ripiego
    return { startMin: 8 * 60, endMin: 20 * 60 };
  }
  const startMin = Math.max(WEEK_DAY_START_MIN, Math.floor(lo / 60) * 60);
  let endMin = Math.min(WEEK_DAY_END_MIN, Math.ceil(hi / 60) * 60);
  if (endMin - startMin < minSpanMin) {
    endMin = Math.min(WEEK_DAY_END_MIN, startMin + minSpanMin);
  }
  if (endMin <= startMin) endMin = Math.min(WEEK_DAY_END_MIN, startMin + 60);
  return { startMin, endMin };
}

/**
 * I blocchi di routine DA DISEGNARE: solo quelli che cadono dentro la finestra
 * visibile (clippati ai bordi) e che non sono il sonno.
 * Spiegano i "buchi" tra una finestra libera e l'altra (es. la merenda).
 */
export function visibleRoutineBlocks<T extends TimeBlock & { kind: string }>(
  segments: T[],
  gridStartMin: number,
  gridEndMin: number,
): T[] {
  return segments
    .filter((s) => s.kind !== "sleep")
    .map((s) => ({
      ...s,
      start: Math.max(s.start, gridStartMin),
      end: Math.min(s.end, gridEndMin),
    }))
    .filter((s) => s.end - s.start >= 5); // spiccioli da pochi minuti non si disegnano
}

// ---- Posizionamento eventi con anti-sovrapposizione ----

export interface PositionedEvent {
  id: string;
  title: string;
  subjectName?: string;
  top: number;
  height: number;
  kind: "study" | "test" | "assignment" | "evaluation";
  /** Colonna in cui e' stato piazzato dentro il suo gruppo di sovrapposti (0..lanes-1). */
  lane: number;
  /** Quante colonne affiancate servono nel suo gruppo (1 = nessuna sovrapposizione). */
  lanes: number;
}

export interface DayEventRow {
  id: string;
  title: string;
  subjectName?: string;
  minutes: number | null;
  kind: PositionedEvent["kind"];
}

/**
 * Posiziona gli eventi di UN giorno dentro la griglia.
 * Eventi che si sovrappongono in orario vengono affiancati in colonne
 * (come Google Calendar): lane = quale colonnina, lanes = quante sono.
 * Chi stabilisce il colore e' il chiamante (le materie hanno colori loro).
 * Gli eventi senza orario NON vengono restituiti qui: finiscono nella
 * striscia "senza orario" in cima alla colonna.
 */
export function positionDayEvents(
  rows: DayEventRow[],
  gridStartMin: number,
  defaultDurationMin = 50,
): { timed: PositionedEvent[]; untimed: Omit<PositionedEvent, "top" | "height" | "lane" | "lanes">[] } {
  const untimed: Omit<PositionedEvent, "top" | "height" | "lane" | "lanes">[] = [];
  const prepared: PositionedEvent[] = [];
  for (const r of rows) {
    if (r.minutes === null) {
      untimed.push({ id: r.id, title: r.title, subjectName: r.subjectName, kind: r.kind });
    } else {
      prepared.push({
        id: r.id,
        title: r.title,
        subjectName: r.subjectName,
        kind: r.kind,
        top: blockTop(r.minutes, gridStartMin),
        height: blockHeight(defaultDurationMin),
        lane: 0,
        lanes: 1,
      });
    }
  }
  prepared.sort((a, b) => a.top - b.top || b.height - a.height);

  // Raggruppo gli eventi che si toccano a catena e assegno le colonnine
  const timed: PositionedEvent[] = [];
  let cluster: PositionedEvent[] = [];
  let laneEnds: number[] = []; // "fondo" (top+height) occupato di ogni colonnina
  let clusterEnd = -Infinity;

  const flush = () => {
    for (const e of cluster) e.lanes = laneEnds.length;
    timed.push(...cluster);
    cluster = [];
    laneEnds = [];
    clusterEnd = -Infinity;
  };

  for (const e of prepared) {
    if (e.top >= clusterEnd && cluster.length > 0) flush();
    let lane = laneEnds.findIndex((end) => end <= e.top);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    const bottom = e.top + e.height;
    laneEnds[lane] = bottom;
    clusterEnd = Math.max(clusterEnd, bottom);
    e.lane = lane;
    cluster.push(e);
  }
  flush();

  timed.sort((a, b) => a.top - b.top);
  return { timed, untimed };
}
