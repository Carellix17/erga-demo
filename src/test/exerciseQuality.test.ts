import { describe, expect, it } from "vitest";
import {
  MAX_OPTION_SPREAD,
  MAX_QUESTION_CHARS,
  isLengthBalanced,
  multipleChoiceContract,
  normalizeExercise,
  normalizeExercises,
  optionSpread,
  type ExerciseLike,
} from "@/lib/exerciseQuality";

// 🧠 P44 — qualità cognitiva degli esercizi: contratto stretto, mescolamento
// che PRESERVA la correttezza e fallback pulito sui dati malformati.

const balancedMc: ExerciseLike = {
  type: "multiple_choice",
  question: "In quale anno cadde Costantinopoli?",
  options: ["1444", "1453", "1461", "1429"],
  correctAnswer: "1453",
  explanation: "Costantinopoli cadde nel 1453 per mano di Maometto II.",
};

describe("optionSpread / isLengthBalanced", () => {
  it("opzioni di pari lunghezza hanno scarto zero", () => {
    expect(optionSpread(["1444", "1453", "1461", "1429"])).toBe(0);
    expect(isLengthBalanced(["1444", "1453", "1461", "1429"])).toBe(true);
  });

  it("la risposta-lunga smaschera il bias: scarto oltre la tolleranza", () => {
    // la risposta corretta è la più lunga e spiegata: il classico trucco
    const skewed = [
      "Laphotosintesi",
      "La respirazione cellulare nelle piante",
      "La mitosi",
      "La meiosi",
    ];
    expect(optionSpread(skewed)).toBeGreaterThan(MAX_OPTION_SPREAD);
    expect(isLengthBalanced(skewed)).toBe(false);
  });

  it("distrattori numericamente vicini rientrano nella tolleranza", () => {
    expect(isLengthBalanced(["12%", "14%", "16%", "18%"])).toBe(true);
  });
});

describe("multipleChoiceContract", () => {
  it("accetta una scelta multipla valida e la ripulisce (trim)", () => {
    const parsed = multipleChoiceContract.parse({
      ...balancedMc,
      question: `  ${balancedMc.question}  `,
    });
    expect(parsed.question).toBe(balancedMc.question);
  });

  it("rifiuta: opzioni ≠ 4, correctAnswer assente, domanda oltre i limiti", () => {
    expect(
      multipleChoiceContract.safeParse({ ...balancedMc, options: ["1444", "1453", "1461"] }).success,
    ).toBe(false);
    expect(
      multipleChoiceContract.safeParse({ ...balancedMc, correctAnswer: "1492" }).success,
    ).toBe(false);
    expect(
      multipleChoiceContract.safeParse({ ...balancedMc, explanation: "   " }).success,
    ).toBe(false);
    expect(
      multipleChoiceContract.safeParse({
        ...balancedMc,
        question: "Q".repeat(MAX_QUESTION_CHARS + 1),
      }).success,
    ).toBe(false);
  });
});

describe("normalizeExercise — mescolamento senza rompere la correttezza", () => {
  it("preserva sempre testo e posizione casuale della risposta (600 esecuzioni)", () => {
    const positions = new Set<number>();
    for (let i = 0; i < 600; i++) {
      const norm = normalizeExercise({ ...balancedMc, options: [...balancedMc.options] });
      // il confronto del frontend: userAnswer === correctAnswer → deve restare corretto
      expect(norm.options).toContain(norm.correctAnswer);
      expect(norm.options).toHaveLength(4);
      // stesso identico insieme di opzioni (solo ordine diverso)
      expect([...norm.options].sort()).toEqual([...balancedMc.options].sort());
      positions.add(norm.options.indexOf(String(norm.correctAnswer)));
    }
    // nessun bias posizionale: la corretta visita tutti e quattro gli indici
    expect(positions.size).toBe(4);
  });

  it("gli altri tipi di esercizio restano IMMUTATI (stesso riferimento)", () => {
    const trueFalse: ExerciseLike = {
      type: "true_false",
      question: "La cellula è l'unità base della vita",
      options: ["Vero", "Falso"],
      correctAnswer: "Vero",
      explanation: "Definizione classica.",
    };
    const ordering: ExerciseLike = {
      type: "ordering",
      question: "Metti in ordine",
      items: ["C", "A", "B"],
      correctAnswer: ["A", "B", "C"],
      explanation: "Ordine alfabetico.",
    };
    expect(normalizeExercise(trueFalse)).toBe(trueFalse);
    expect(normalizeExercise(ordering)).toBe(ordering);
  });

  it("scelte multiple malformate tornano immutate (fallback pulito)", () => {
    const three = { ...balancedMc, options: ["1444", "1453", "1461"] };
    const missing = { ...balancedMc, correctAnswer: "1492" };
    expect(normalizeExercise(three)).toBe(three);
    expect(normalizeExercise(missing)).toBe(missing);
  });

  it("normalizeExercises processa liste miste senza perdite", () => {
    const ordering: ExerciseLike = {
      type: "ordering",
      question: "Metti in ordine",
      items: ["C", "A", "B"],
      correctAnswer: ["A", "B", "C"],
      explanation: "Ordine alfabetico.",
    };
    const out = normalizeExercises([balancedMc, ordering, { ...balancedMc, options: ["1", "2"] }]);
    expect(out).toHaveLength(3);
    expect(out[1]).toBe(ordering); // intoccato
    expect(out[2].options).toEqual(["1", "2"]); // malformato intoccato
    expect(out[0].options).toContain("1453"); // valido → mescolato ma completo
  });
});
