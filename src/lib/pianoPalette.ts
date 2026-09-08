/**
 * P46 — Palette vivida per il Piano (calendario) e la Routine.
 *
 * Il prodotto chiede colori distintivi per materia e routine nella vista
 * "Piano"/"Core" (riconoscimento a colpo d'occhio), con pattern dark
 * "tinted-surface": fondo al ~18% del colore, barra sinistra piena e testo
 * chiaro ad alto contrasto (WCAG AA su sfondo scuro).
 * Solo per il Piano: il resto dell'app resta monocroma.
 */

export interface TintStyle {
  backgroundColor: string;
  borderLeft: string;
  color: string;
  /** Colore pieno per pallini/legenda. */
  dot: string;
}

const TEXT_LIGHT = "#F8FAFC";
/** Testo scuro ad alto contrasto sui fondi tinti al 18% in modalità chiara. */
const TEXT_DARK = "#0F172A";

/** Materie scolastiche italiane → colore (spec P46). */
const SUBJECT_HEX: { hex: string; keys: string[] }[] = [
  { hex: "#2563EB", keys: ["matematic", "math", "geometria", "algebra", "analisi"] }, // Blu
  { hex: "#DC2626", keys: ["italian", "letteratura", "latino", "greco"] }, // Rosso
  // NB: "Scienze Motorie" vaMatcher PRIMA di "scienze" (più specifica vince)
  { hex: "#EAB308", keys: ["motorie", "sport", "educazione fisica", "ginnastica"] }, // Giallo
  { hex: "#059669", keys: ["scienz", "biologi", "chimic", "natur"] }, // Smeraldo
  { hex: "#D97706", keys: ["storia", "storico"] }, // Ambra
  { hex: "#65A30D", keys: ["geografia", "territorio"] }, // Lime
  { hex: "#0891B2", keys: ["fisic", "astronomia"] }, // Ciano
  { hex: "#7C3AED", keys: ["filosof", "pedagogia"] }, // Viola
  { hex: "#EA580C", keys: ["inglese", "lingu", "francese", "spagnolo", "tedesco"] }, // Arancione
  { hex: "#C026D3", keys: ["arte", "disegno"] }, // Magenta
];

export const DEFAULT_SUBJECT_HEX = "#94A3B8"; // Slate

/** Converte un colore CSS (#hex o `hsl(h s% l%)`) in #RRGGBB, o null. */
export function cssColorToHex(color?: string | null): string | null {
  if (!color) return null;
  const v = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) {
    return `#${v.slice(1).split("").map((c) => c + c).join("").toUpperCase()}`;
  }
  const m = v.match(/^hsl\(\s*(-?\d+(?:\.\d+)?)\s*[ ,]\s*(\d+(?:\.\d+)?)%\s*[ ,]\s*(\d+(?:\.\d+)?)%\s*\)$/i);
  if (!m) return null;
  const h = ((Number(m[1]) % 360) + 360) % 360;
  const s = Math.min(100, Number(m[2])) / 100;
  const l = Math.min(100, Number(m[3])) / 100;
  const c = s * Math.min(l, 1 - l);
  const chan = (offset: number) => {
    const k = (offset + h / 30) % 12;
    const val = l - c * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(val * 255).toString(16).padStart(2, "0");
  };
  return `#${chan(0)}${chan(8)}${chan(4)}`.toUpperCase();
}

/**
 * Colore vivido di una materia (per nome, case-insensitive, senza accenti).
 * `customColor` = colore scelto a mano dall'utente (vince sull'automatico).
 */
export function subjectHex(subjectName?: string | null, customColor?: string | null): string {
  const custom = cssColorToHex(customColor);
  if (custom) return custom;
  if (!subjectName) return DEFAULT_SUBJECT_HEX;
  const n = subjectName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const { hex, keys } of SUBJECT_HEX) {
    if (keys.some((k) => n.includes(k))) return hex;
  }
  return DEFAULT_SUBJECT_HEX;
}


/** Colori FISSI dei blocchi routine (spec P46). */
export const ROUTINE_HEX: Record<string, string> = {
  sleep: "#4F46E5", // Indaco / blu notte
  school: "#64748B", // Slate / grigio piombo
  meal: "#EF4444", // Corallo
  other: "#0D9488", // Verde acqua
};

/** Stile "tinted-surface" per i blocchi del planner (inline, 60fps). */
export function tintStyle(hex: string, opts?: { alpha?: number; borderless?: boolean; dark?: boolean }): TintStyle {
  const alpha = opts?.alpha ?? 0.18;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const bg = `rgba(${r} ${g} ${b} / ${alpha})`;
  return {
    backgroundColor: bg,
    borderLeft: opts?.borderless ? "1px solid rgba(248 250 252 / 0.14)" : `4px solid ${hex}`,
    // Su fondo chiaro il testo chiaro sparisce: usiamo testo scuro AA.
    color: opts?.dark ? TEXT_LIGHT : TEXT_DARK,
    dot: hex,
  };
}

/** Tinta di una materia per nome (o slate di default). */
export function subjectTint(subjectName?: string | null, dark?: boolean): TintStyle {
  return tintStyle(subjectHex(subjectName), { dark });
}

/** Tinta di un blocco routine (kind: school | sleep | meal | other). */
export function routineTint(kind: string, dark?: boolean): TintStyle {
  return tintStyle(ROUTINE_HEX[kind] ?? ROUTINE_HEX.other, { dark });
}
