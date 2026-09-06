import { z } from "zod";

/**
 * P44 — Qualità cognitiva degli esercizi di rinforzo.
 *
 * Il prompt VERO (parità di lunghezza, distrattori plausibili, domande
 * dirette) vive nella Edge Function `generate-exercises`: qui stiamo lato
 * client, dove facciamo due cose che non toccano il database né lo storico:
 *
 * 1. CONTRATTO: la forma desiderata di una scelta multipla generata dall'AI
 *    (domanda diretta ≤180 caratteri, ESATTAMENTE 4 opzioni bilate,
 *    correctAnswer presente tra le opzioni, spiegazione presente).
 * 2. NORMALIZZAZIONE: alla bisogno (nuovo job, polling, storico) le opzioni
 *    vengono MESCOLATE rimappando la risposta per VALORE — il confronto del
 *    frontend (`userAnswer === correctAnswer`) non cambia — così la posizione
 *    della risposta corretta è casuale anche per gli esercizi già salvati,
 *    azzerando il bias posizionale. Esercizi malformati o di altro tipo
 *    tornano immutati (fallback pulito, zero perdite di dati).
 *
 * Estensibilità futura (risposte aperte): aggiungere qui un contratto
 * `openAnswerContract` con testo, criteri di rubrica e lunghezza massima,
 * senza toccare quelli esistenti.
 */

export const MAX_QUESTION_CHARS = 180;
/** Tolleranza di parità: scarto relativo massimo tra opzione più corta e più lunga. */
export const MAX_OPTION_SPREAD = 0.15;

/** Forma strutturale di un esercizio (compatibile con EserciziView). */
export interface ExerciseLike {
  type: string;
  question: string;
  options?: string[];
  pairs?: { left: string; right: string }[];
  items?: string[];
  correctAnswer: string | string[];
  explanation: string;
}

/** Contratto Zod della scelta multipla generata (output AI desiderato). */
export const multipleChoiceContract = z
  .object({
    type: z.literal("multiple_choice"),
    question: z.string().trim().min(1).max(MAX_QUESTION_CHARS),
    options: z.array(z.string().trim().min(1)).length(4),
    correctAnswer: z.string().trim().min(1),
    explanation: z.string().trim().min(1),
  })
  .refine((ex) => ex.options.includes(ex.correctAnswer), {
    message: "correctAnswer deve essere una delle 4 opzioni",
  });

/**
 * Scarto relativo di lunghezza tra l'opzione più corta e la più lunga
 * (0 = perfettamente bilate). Il "bias della risposta più lunga" si misura
 * qui: sopra MAX_OPTION_SPREAD l'esercizio è troppo facile da sgamare.
 */
export function optionSpread(options: string[]): number {
  if (options.length < 2) return 0;
  const lens = options.map((o) => o.trim().length);
  const max = Math.max(...lens);
  const min = Math.min(...lens);
  if (max === 0) return 0;
  return (max - min) / max;
}

export function isLengthBalanced(options: string[], tolerance = MAX_OPTION_SPREAD): boolean {
  return optionSpread(options) <= tolerance;
}

/** Fisher–Yates: mescola una copia dell'array (l'originale resta intatto). */
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Normalizza UN esercizio:
 * - scelte multiple valide → opzioni mescolate (correctAnswer invariato:
 *   il confronto è per valore, quindi la correttezza è preservata);
 * - qualsiasi altro caso (altri tipi, opzioni ≠ 4, correctAnswer assente)
 *   → restituito IMMUTATO: mai peggiorare o buttare dati dello storico.
 */
export function normalizeExercise<T extends ExerciseLike>(exercise: T): T {
  if (exercise.type !== "multiple_choice" || !Array.isArray(exercise.options)) return exercise;
  const options = exercise.options.map((o) => (typeof o === "string" ? o.trim() : o));
  const correct = typeof exercise.correctAnswer === "string" ? exercise.correctAnswer.trim() : "";
  if (options.length !== 4 || !correct || !options.includes(correct)) return exercise;
  return { ...exercise, options: shuffle(options), correctAnswer: correct };
}

/** Normalizza una lista di esercizi (job appena completato o storico). */
export function normalizeExercises<T extends ExerciseLike>(exercises: T[]): T[] {
  return exercises.map(normalizeExercise);
}
