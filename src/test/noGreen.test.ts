import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, sep } from "path";

/**
 * 🛡️ P24 × CACCIATORE DI VERDI — test anti-regressione del monocromo.
 * Ogni commit che introduce una tonalità verde (classi Tailwind green/
 * emerald/teal/lime/sage, hue HSL 60-180 con saturazione, hex della vecchia
 * palette bosco, theme-color verdi) FARÀ FALLIRE la suite.
 * È il motivo per cui "il verde non torna più".
 *
 * 🚦 ECCEZIONE FEEDBACK QUIZ (bug-fix UX): le componenti che validano le
 * risposte possono usare emerald (corretto) e rose (sbagliato). Il feedback
 * verde/rosso esplicito è un requisito di accessibilità (WCAG): senza colori,
 * chi risponde non distingue a colpo d'occhio esito giusto/sbagliato.
 * Ovunque ALTROVE il monocromo resta legge.
 */

const SRC = join(__dirname, "..", "..", "src");
const ROOT = join(__dirname, "..", "..");

// Componenti autorizzate al verde SOLO per lo stato "risposta corretta"
const QUIZ_FEEDBACK_ALLOWLIST = [
  "src/components/studio/exercises/MultipleChoice.tsx",
  "src/components/studio/exercises/TrueFalse.tsx",
  "src/components/studio/exercises/FillBlank.tsx",
  "src/components/studio/StudyTutorView.tsx",
  "src/components/pratica/EserciziView.tsx",
  "src/components/pratica/InterrogazioneView.tsx",
].map((p) => p.replace(/\//g, sep));

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(tsx|ts|css|html)$/.test(name)) out.push(p);
  }
  return out;
}

// Classi Tailwind verdi (parola intera, evita falsi positivi come "message")
const GREEN_CLASS_RE =
  /\b(?:bg|text|border|ring|from|to|via|fill|stroke|shadow|outline)-(?:green|emerald|teal|lime|sage)(?:-\d+|\/\d+)?\b/i;

// Hue HSL 60-180 con saturazione significativa (>5%): spettro del verde
const GREEN_HSL_RE = /hsl\(\s*(?:var\([^)]*\)\s*)?(1[0-7][0-9]|7[0-9]|8[0-9]|9[0-9]|1[0-4][0-9])\s+[1-9][0-9]?%?\s/;

// Hex della vecchia palette bosco / verde salvia
const GREEN_HEX = [
  "0f2014", "19321f", "1d3a26", "12231a", "23402c", "0c1f12", "14301d",
  "17301f", "4f845a", "9dbfa4", "f3f7f4", "e5ede7", "d5e2d8", "2e7d46",
  "3c6946", "315439", "72a17b", "a9c4b1", "5a655d", "2f3f34", "b3f05c",
];
const HEX_RE = new RegExp(`#(${GREEN_HEX.join("|")})`, "i");

describe("Cacciatore di verdi (monocromo)", () => {
  const files = walk(SRC);
  const problems: string[] = [];

  for (const file of files) {
    if (file.endsWith("noGreen.test.ts")) continue; // il test stesso contiene la lista hex
    const content = readFileSync(file, "utf-8");
    const isQuizFeedbackFile = QUIZ_FEEDBACK_ALLOWLIST.some((p) => file.endsWith(p));

    if (GREEN_CLASS_RE.test(content) && !isQuizFeedbackFile) {
      problems.push(`${file}: classe Tailwind verde`);
    }
    if (HEX_RE.test(content)) {
      problems.push(`${file}: hex della vecchia palette bosco`);
    }
    // nei CSS controlla anche gli hue verdi nei token (escluso subject-accent HEX)
    if (file.endsWith(".css")) {
      // escludi le righe dei PASTELLI MATERIA (--pastel-*): sono i colori
      // distintivi delle materie, voluti dal Capo (Orari e materie / corsi)
      const lines = content.split("\n");
      for (const line of lines) {
        if (/--pastel-[a-z-]+\s*:/.test(line)) continue;
        if (GREEN_HSL_RE.test(line)) {
          problems.push(`${file}: hue HSL verde (riga: ${line.trim().slice(0, 60)})`);
          break;
        }
      }
    }
  }

  // theme-color / manifest
  for (const f of ["index.html", "vite.config.ts"]) {
    const c = readFileSync(join(ROOT, f), "utf-8");
    if (/#0f2014|#19321f|#4f845a/i.test(c)) problems.push(`${f}: theme-color/colore bosco`);
  }

  it("nessun verde in tutta la codebase", () => {
    expect(problems).toEqual([]);
  });
});
