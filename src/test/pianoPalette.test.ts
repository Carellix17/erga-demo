import { describe, expect, it } from "vitest";
import {
  DEFAULT_SUBJECT_HEX,
  ROUTINE_HEX,
  routineTint,
  subjectHex,
  subjectTint,
  tintStyle,
} from "@/lib/pianoPalette";
import {
  DEFAULT_BEDTIME_MIN,
  DEFAULT_WAKE_MIN,
  routineDayWindow,
  type TimeBlock,
} from "@/lib/weekPlanner";

// 🎨 P46 — palette vivida del Piano e finestra giornata ricavata dal sonno.

describe("pianoPalette — colori materia (spec)", () => {
  it("mappa le materie italiane sui colori richiesti", () => {
    expect(subjectHex("Matematica")).toBe("#2563EB");
    expect(subjectHex("Italiano")).toBe("#DC2626");
    expect(subjectHex("Biologia")).toBe("#059669");
    expect(subjectHex("Chimica organica")).toBe("#059669");
    expect(subjectHex("Storia")).toBe("#D97706");
    expect(subjectHex("Geografia")).toBe("#65A30D");
    expect(subjectHex("Fisica")).toBe("#0891B2");
    expect(subjectHex("Filosofia")).toBe("#7C3AED");
    expect(subjectHex("Inglese")).toBe("#EA580C");
    expect(subjectHex("Arte e Disegno")).toBe("#C026D3");
    expect(subjectHex("Scienze Motorie")).toBe("#EAB308");
  });

  it("materia sconosciuta o assente → slate di default", () => {
    expect(subjectHex("Economia domestica")).toBe(DEFAULT_SUBJECT_HEX);
    expect(subjectHex(null)).toBe(DEFAULT_SUBJECT_HEX);
    expect(subjectHex("")).toBe(DEFAULT_SUBJECT_HEX);
  });

  it("ignora maiuscole e accenti (perchè É Fisica → ciano)", () => {
    expect(subjectHex("FÍSICA")).toBe("#0891B2");
    expect(subjectHex("  storia  ")).toBe("#D97706");
  });

  it("tinted-surface: fondo ~18% del colore, barra sinistra piena, testo chiaro", () => {
    const t = subjectTint("Storia");
    expect(t.dot).toBe("#D97706");
    expect(t.backgroundColor).toMatch(/rgba\(217 119 6 \/ 0\.18\)/);
    expect(t.borderLeft).toBe("4px solid #D97706");
    expect(t.color).toBe("#F8FAFC"); // testo chiaro WCAG AA su fondo scuro
  });

  it("colori routine fissi (sonno/scuola/pasti/altro)", () => {
    expect(ROUTINE_HEX.sleep).toBe("#4F46E5");
    expect(ROUTINE_HEX.school).toBe("#64748B");
    expect(ROUTINE_HEX.meal).toBe("#EF4444");
    expect(ROUTINE_HEX.other).toBe("#0D9488");
    expect(routineTint("school").dot).toBe("#64748B");
    expect(tintStyle("#4F46E5", { borderless: true }).borderLeft).not.toContain("4px");
  });
});

describe("routineDayWindow — la griglia parte dal risveglio", () => {
  const seg = (kind: string, start: number, end: number): TimeBlock & { kind: string } => ({ kind, start, end });

  it("sonno overnight 23:00→07:00: giornata 07:00 → 23:00", () => {
    // segmento mattutino del sonno a cavallo di mezzanotte: 00:00→07:00
    const w = routineDayWindow([seg("sleep", 23 * 60, 24 * 60), seg("sleep", 0, 7 * 60)]);
    expect(w.startMin).toBe(7 * 60);
    expect(w.endMin).toBe(23 * 60);
  });

  it("senza routine dichiarata: default 06:30 → 23:00", () => {
    const w = routineDayWindow([]);
    expect(w.startMin).toBe(DEFAULT_WAKE_MIN);
    expect(w.endMin).toBe(DEFAULT_BEDTIME_MIN);
  });

  it("sonno 22:30→06:30 e scuola di giorno: griglia 06:30 → 22:30", () => {
    const w = routineDayWindow([seg("sleep", 22 * 60 + 30, 24 * 60), seg("sleep", 0, 6 * 60 + 30)]);
    expect(w.startMin).toBe(6 * 60 + 30);
    expect(w.endMin).toBe(22 * 60 + 30);
  });

  it("altri blocchi (scuola/pasti) non spostano la finestra", () => {
    const w = routineDayWindow([seg("school", 8 * 60, 14 * 60), seg("meal", 19 * 60, 20 * 60)]);
    expect(w.startMin).toBe(DEFAULT_WAKE_MIN);
    expect(w.endMin).toBe(DEFAULT_BEDTIME_MIN);
  });
});
