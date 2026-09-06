# Analisi della repo Erga — 6 settembre 2026

Documento scritto in linguaggio semplice, senza gergo tecnico.
Nessuna modifica al codice è stata fatta: questa è solo una "visita medica" del progetto.

---

## 1. In una frase

Erga è una app web scritta molto bene, in salute, con un impianto di qualità
sopra la media dei progetti nati su Lovable: 384 controlli automatici passano
tutti, la app si compila senza errori e la sicurezza dei dati è impostata
correttamente. Ci sono 4 punti da tenere d'occhio, nessuno urgente.

---

## 2. Com'è fatta la app (la mappa)

Immagina Erga come un edificio con due piani.

**Il piano di sopra — quello che lo studente vede** (cartella `src/`)

Cinque "stanze", che sono le schede in basso nella app:

| Stanza | A cosa serve |
|---|---|
| **Home** | Il cruscotto: cosa studiare oggi, timeline della giornata, scorciatoie |
| **Studio** | I percorsi di studio: corsi, moduli, lezioni, lettore a schermo intero, figure estratte dai PDF |
| **Piano** | Il calendario: verifiche, interrogazioni, pianificatore settimanale |
| **Pratica** | Esercizi generati dall'AI, simulazione di interrogazione orale, chat con il tutor |
| **Core** | Il profilo cognitivo: l'esagono (Logica, Memoria, Focus, Lessico, Calma, Pratica) e la routine settimanale |

Più le pagine di contorno: landing pubblica, login/registrazione, impostazioni
(account, aspetto, accessibilità, lingua, termini), profilo, statistiche Focus.

**Il piano di sotto — il motore invisibile** (cartella `supabase/`, cioè Lovable Cloud)

26 "funzioni" che girano sul cloud. Le principali:

- `generate-lessons` (la più grande, ~1.070 righe): trasforma il materiale in lezioni
- `generate-exercises`, `interrogazione`, `generate-plan`: pratica e pianificazione
- `extract-pdf`, `extract-lesson-figures`, `upload-pdf`: leggono PDF, testo e immagini
- `chat`, `lesson-chat`, `study-tutor`: le conversazioni con l'AI
- `cognitive-profile`: calcola e salva l'esagono
- `web-search`, `wiki-image`: fonti esterne e immagini
- `payments-webhook` (Paddle), `push-*` (notifiche), `auth-email-hook` e
  `process-email-queue` (email transazionali)

**Il magazzino dati:** 23 tabelle (lezioni, contesti di studio, eventi di studio,
profili cognitivi, quiz, abbonamenti, coda email…) e 59 migrazioni, cioè 59
modifiche successive alla struttura del database.

**Dimensione totale:** circa 50.000 righe di codice tra app e cloud. Un progetto
serio, non un prototipo.

---

## 3. Stato di salute — i controlli che ho eseguito

| Controllo | Esito | Cosa significa |
|---|---|---|
| Test automatici | ✅ **384 su 384 passati** (46 file) | Le "prove di collaudo" scritte nel progetto funzionano tutte |
| Controllo tipi (TypeScript) | ✅ **0 errori** | Non ci sono incongruenze logiche nel codice |
| Build di produzione | ✅ **riuscita** | La app si compila e sarebbe pubblicabile ora |
| Qualità stilistica (lint) | ⚠️ **67 errori, 18 avvisi** | Nessuno rompe niente: sono regole di stile non rispettate |
| Segreti esposti | ✅ **nessuno** | Nessuna chiave privata nel codice pubblico |
| Protezione dati (RLS) | ✅ **attiva su tutte le tabelle** | Ogni utente vede solo i propri dati |

Cosa mi ha colpito in positivo:

- **Zero `console.log` e zero "TODO" abbandonati.** Segno di codice curato.
- **Commenti in italiano e comprensibili** dentro il codice (es. "la dispensa nel
  telefono", "il citofono dell'agente"). Chi lavorerà dopo capisce subito.
- **CORS con lista bianca**: solo i domini ufficiali di Erga possono chiamare le API.
  È una protezione che moltissimi progetti non hanno.
- **Test "di gusto"**: ci sono controlli automatici che verificano perfino che non
  compaia il colore verde (`noGreen.test.ts`) o stili "carta" indesiderati
  (`noPaperStyle.test.ts`). L'identità visiva è protetta dal codice stesso.
- **Bilinguismo** già pronto: italiano e inglese completi.
- **PWA**: la app è installabile sul telefono e funziona parzialmente offline.

---

## 4. I 4 punti da tenere d'occhio

### 🟡 A. Il peso della app al primo caricamento

Quando si apre la sezione app, il telefono deve scaricare un pacchetto da circa
**1 MB** (290 KB compressi) più uno da 776 KB. È tanto per una connessione mobile
lenta: si traduce in qualche secondo di attesa in più sul 4G debole.

*Perché succede:* la pagina Index carica in un colpo solo calendario, lettore PDF,
grafici e esercizi.
*Soluzione possibile:* spezzare il caricamento per stanza (si carica il calendario
solo quando si apre "Piano"). Lavoro di mezza giornata, guadagno reale sul telefono.

### 🟡 B. Alcuni file sono diventati molto lunghi

- `EserciziView.tsx` → 1.225 righe
- `StudioView.tsx` → 1.213 righe
- `generate-lessons/index.ts` → 1.069 righe

Non è un errore, ma sono i file dove è più facile rompere qualcosa modificando
altro. Se in futuro toccheremo spesso queste aree, conviene dividerli in pezzi più
piccoli.

### 🟡 C. 67 segnalazioni di stile (lint)

Tradotto: il codice funziona, ma in 44 punti si usa il "tipo jolly" (`any`), cioè
si dice al computer "fidati, non controllare". È il modo tipico in cui nascono bug
silenziosi mesi dopo. **51 di queste 67 segnalazioni sono nelle funzioni cloud**,
non nell'app visibile. Si possono sistemare gradualmente.

### 🟡 D. Il file `.env` è dentro GitHub

Il file con le configurazioni è pubblicato nella repo. **Ho verificato: contiene
solo chiavi pubbliche** (la chiave "anon" di Supabase e il token cliente di Paddle),
che sono progettate per stare nel browser — quindi **non c'è una fuga di dati**.
È però un'abitudine rischiosa: il giorno in cui per errore ci finisce una chiave
segreta, finisce online. Lovable fa così di default, quindi va gestito con
attenzione più che "corretto".

Segnalo anche un dettaglio minore: la funzione `auth-email-hook` accetta chiamate
da qualunque origine (`*`), diversamente da tutte le altre. Ha senso perché la
chiama Supabase e non un browser, ma vale la pena verificarlo.

---

## 5. Le regole di lavoro che ho letto e che seguirò

La repo contiene già le tue istruzioni, e sono ottime. Le ho lette tutte:

- **`AGENTS.md`** — le regole operative: backend su Lovable Cloud, mai migrazioni
  dirette, spiegazioni in italiano semplice, priorità (sicurezza → accessibilità →
  chiarezza → prestazioni → identità → estetica).
- **`PRODUCT.md`** — chi è lo studente, cosa promette Erga, cosa NON si può
  inventare (testimonianze, prezzi, studi di efficacia).
- **`.agents/skills/`** — 19 skill installate: `impeccable` (progettazione e
  revisione UI), `ui-ux-pro-max` (ricerca design system), `frontend-design`,
  `design-taste-frontend` (solo landing/marketing), le skill di motion di Emil
  Kowalski (`animate`, `review-animations`, `emil-design-eng`, `ask-sonner`),
  `scroll-experience`, `3d-web-experience`, `apple-design`.

**Come procederò a ogni modifica:**

1. Leggo la skill giusta per il tipo di lavoro richiesto
2. Modifico il codice
3. Eseguo test + controllo tipi + build (come chiede `AGENTS.md`, punto 5)
4. Faccio il push su GitHub da solo
5. Ti spiego in parole semplici cosa è cambiato
6. Se serve il database o una funzione cloud → **ti preparo il prompt da incollare in Lovable**
7. Ti ricordo di premere **Update** su Lovable per vedere le modifiche

---

## 6. Cosa proporrei di fare, in ordine

| Priorità | Intervento | Beneficio |
|---|---|---|
| 1 | Alleggerire il primo caricamento della app | App più veloce sul telefono, meno abbandoni |
| 2 | Ripulire i 67 avvisi di lint, partendo dalle funzioni cloud | Meno bug futuri |
| 3 | Dividere i 3 file più grandi | Modifiche future più sicure e rapide |
| 4 | Rivedere la gestione di `.env` e del CORS di `auth-email-hook` | Igiene di sicurezza |

Nessuno di questi è urgente: la app oggi funziona e si compila.
Dimmi tu se preferisci partire da qui o se hai in mente una funzionalità nuova.

---

*Analisi eseguita su commit `a84053b` ("Validazione regole cognitive"), ramo `main`, 306 commit totali.*
