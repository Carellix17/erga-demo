# Analisi della repo Erga — 8 settembre 2026

Documento scritto in linguaggio semplice, senza gergo tecnico.
Aggiorna l'analisi del 6 settembre (`analisi-repo-2026-09-06.md`) allo stato attuale
del ramo `main`. Nessuna modifica funzionale al codice: solo una nuova "visita medica".

---

## 1. In una frase

Erga resta una app web di qualità, in salute: **si compila senza errori**, i **controlli
di tipo passano tutti** e dei **386 test automatici ne passano 381**. C'è una novità
rispetto alla settimana scorsa: **5 test sono rimasti indietro dopo un "annulla"**
fatto sulla Home — non rompono l'app, ma vanno sistemati per avere di nuovo tutto verde.

---

## 2. Cosa ho fatto

1. Ho letto le istruzioni di lavoro (`AGENTS.md`, `PRODUCT.md`) e il catalogo delle
   skill (`.agents/skills/`), come previsto dalle regole della repo.
2. Ho scaricato l'ultima versione del codice (ramo `main`, **315 commit**, ultimo
   aggiornamento ieri sera 7 settembre).
3. Ho eseguito i controlli di collaudo previsti dalle regole:
   - test automatici → **381 su 386 passati**;
   - controllo dei tipi (TypeScript) → **0 errori**;
   - build di produzione → **riuscita** (l'app si compila e sarebbe pubblicabile).

---

## 3. Cosa è cambiato dal 6 settembre (ultimi lavori)

| Data | Lavoro | In parole povere |
|---|---|---|
| 5–6 set | P43–P45: fogli animati, card "muta" in Studio, qualità esercizi, barra chat mobile in alto | Migliorie di movimento e usabilità su telefono |
| 6 set | Analisi completa della repo (`docs/analisi-repo-2026-09-06.md`) | La "visita medica" precedente |
| 7 set | Fix quiz (verde/rosso), niente "bianco su bianco" in modalità scura, barra chat sempre visibile | Piccole riparazioni di usabilità |
| 7 set | **Studio**: rimossa la barra "Chiedi qualcosa a Erga" dalla schermata iniziale | Schermata più pulita |
| 7 set | **Home**: annullato il nuovo stile "scuro/lussuoso" della card della lezione, tornando a quello a colori | Un dietrofront di design (qui nascono i 5 test falliti, vedi sotto) |

---

## 4. Lo stato di salute — controlli eseguiti oggi

| Controllo | Esito | Cosa significa |
|---|---|---|
| Test automatici | ⚠️ **381 su 386** (47 file) | Funzionano quasi tutti; 5 test stilistici sulla Home sono rimasti indietro |
| Controllo tipi (TypeScript) | ✅ **0 errori** | Nessuna incongruenza logica nel codice |
| Build di produzione | ✅ **riuscita** | La app si compila senza problemi |
| Dimensione | ~39.000 righe nell'app, ~11.000 nel cloud | Progetto di media-grande dimensione |
| Edge Function | 26 | Le "funzioni invisibili" sul cloud Lovable |
| Migrazioni database | 59 | Le modifiche successive alla struttura dati |

---

## 5. Il punto da sistemare: 5 test "di guardia" rimasti indietro

Domenica sera è stato **annullato** (revert, commit `c1e949d`) il nuovo stile
"avorio scuro + font Radja" della card della lezione in sospeso nella Home, per
tornare allo stile a colori precedente. Ma i **test di guardia stilistica** — scritti
proprio per proteggere quello stile nuovo — **non sono stati aggiornati insieme**.

Risultato: 5 controlli si aspettano ancora la card "scura/lussuosa" che non c'è più.

**Perché non è un'emergenza:** nessun test tocca il funzionamento dell'app: verificano
solo che non compaiano certe classi di stile in un file. L'app funziona e si compila.

**Due strade possibili (da decidere insieme):**
1. **Aggiornare i 5 test** alla nuova scelta di design (Home a colori) → tutto torna
   verde, si accetta il dietrofront di stile.
2. **Ripristinare davvero lo stile "scuro/lussuoso"** nella Home → i test tornano a
   passare da soli, ma si cambia di nuovo l'aspetto (va fatto con le skill di design).

Consiglio: la strada **1** è la più rapida e rispetta la decisione di design già presa.
Dimmi tu quale preferisci.

---

## 6. Punti di attenzione ancora validi (dall'analisi del 6 settembre)

Riporto i punti già segnalati, ancora attuali:

- 🟡 **Peso al primo caricamento del telefono.** Due pacchetti grandi: uno da ~1 MB e
  uno da ~794 KB (compressi ~290 + ~239 KB). Su 4G lento si sente. Soluzione possibile:
  spezzare il caricamento per stanza.
- 🟡 **File molto lunghi** (`EserciziView.tsx`, `StudioView.tsx`,
  `generate-lessons/index.ts`): sono i punti dove è più facile rompere qualcosa
  modificando altro.
- 🟡 **Avvisi di stile (lint):** qualche decina di segnalazioni, nessuna rompe nulla;
  molte sono nelle funzioni cloud.
- 🟡 **`.env` pubblicato nella repo:** contiene solo chiavi pubbliche (verificato), ma è
  un'abitudine da tenere d'occhio.

---

## 7. Regole di lavoro che seguirò (confermate)

1. Leggo la skill giusta per il tipo di lavoro richiesto (design → `impeccable` /
   `frontend-design`, animazioni → skill Emil Kowalski, ecc.).
2. Modifico il codice.
3. Eseguo test + controllo tipi + build.
4. Faccio il push su GitHub in autonomia.
5. Ti spiego ogni modifica in parole semplici.
6. Se serve il database o una funzione cloud → **ti preparo il prompt da incollare
   in Lovable**.
7. Ti ricordo di premere **Update** su Lovable per vedere le modifiche.

---

*Analisi eseguita su commit `4387d7c` ("Merge pull request #71"), ramo `main`,
315 commit totali. Test: 381/386 superati, 5 falliti in `homeCleanSurfaces.test.ts`.*
