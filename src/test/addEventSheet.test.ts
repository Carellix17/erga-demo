import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * 🛡️ P47 — Guardia strutturale del foglio "Aggiungi evento" (Piano).
 * Verifica (leggendo il sorgente) che restino in piedi le decisioni di
 * layout/densità del P47: barra unica Titolo+Modalità con tendina a
 * DropdownMenu, Data+Materia affiancate a 2 colonne in Verifica e Compito,
 * ora di fine OBBLIGATORIA per la verifica nuova, e messaggi i18n presenti
 * in entrambe le lingue. Non rende i componenti (servono Radix/Dialog):
 * controlla la struttura come gli altri test di guardia della repo.
 */

const SHEET = readFileSync(join(__dirname, "..", "components", "piano", "AddEventSheet.tsx"), "utf8");
const IT = readFileSync(join(__dirname, "..", "..", "src", "i18n", "locales", "it.json"), "utf8");
const EN = readFileSync(join(__dirname, "..", "..", "src", "i18n", "locales", "en.json"), "utf8");

describe("AddEventSheet — densità P47", () => {
  it("fonde Titolo e Modalità in un'unica barra con DropdownMenu (niente riga 'Modalità' separata)", () => {
    // importa e usa il DropdownMenu (pill a destra nella stessa barra)
    expect(SHEET).toContain("DropdownMenu");
    expect(SHEET).toContain("DropdownMenuTrigger");
    expect(SHEET).toContain("DropdownMenuContent");
    expect(SHEET).toContain("VERIFICA_MODES.map");
    // la barra racchiude l'input del titolo E il selettore modalità in un flex
    expect(SHEET).toMatch(/aria-label=\{t\("piano\.sheet\.mode"\)\}/);
  });

  it("elenco modalità invariato: Orale, Scritta, Pratica, Presentazione", () => {
    expect(SHEET).toContain('"orale", "scritta", "pratica", "interrogazione"');
    expect(SHEET).toContain("piano.sheet.modeOrale");
    expect(SHEET).toContain("piano.sheet.modeScritta");
    expect(SHEET).toContain("piano.sheet.modePratica");
    expect(SHEET).toContain("piano.sheet.modePresentazione");
  });

  it("Data e Materia sono affiancate a 2 colonne sia in Verifica che in Compito", () => {
    const verificaBlock = SHEET.slice(
      SHEET.indexOf("{category === \"verifica\" && ("),
      SHEET.indexOf("{category === \"compito\" && (")
    );
    const compitoBlock = SHEET.slice(
      SHEET.indexOf("{category === \"compito\" && ("),
      SHEET.indexOf("{category === \"altro\" && (")
    );
    expect(verificaBlock).toContain("grid grid-cols-2 gap-3");
    expect(verificaBlock).toContain("{dateField}");
    expect(verificaBlock).toContain("{subjectSelect}");
    expect(compitoBlock).toContain("grid grid-cols-2 gap-3");
    expect(compitoBlock).toContain("{dateField}");
    expect(compitoBlock).toContain("{subjectSelect}");
  });

  it("per la verifica l'ora di fine è obbligatoria: timeRange(true), niente '(opzionale)'", () => {
    expect(SHEET).toContain("{timeRange(true)}");
    // il "(opzionale)" resta solo nel caso requireEnd=false (tab Altro)
    expect(SHEET).toMatch(/optional/);
    expect(SHEET).not.toMatch(/endTime"\)\} <span[^>]*>\(opzionale\)/);
  });

  it("valida: fine mancante alla creazione e fine <= inizio", () => {
    expect(SHEET).toContain("endTimeRequired");
    expect(SHEET).toContain("endTimeAfterStart");
    expect(SHEET).toContain("validateVerificaTimes");
    expect(SHEET).toContain('role="alert"');
  });

  it("le nuove etichette di errore esistono in italiano e inglese", () => {
    expect(IT).toContain('"endTimeRequired"');
    expect(IT).toContain('"endTimeAfterStart"');
    expect(EN).toContain('"endTimeRequired"');
    expect(EN).toContain('"endTimeAfterStart"');
  });
});
