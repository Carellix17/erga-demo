# Audit di design e usabilità — Erga, 8 settembre 2026

Documento in linguaggio semplice. È un **audit da codice** (non ho potuto aprire
l'app in un browser in questa sessione): le valutazioni nascono da controlli
automatici sulle schermate (`detector` della skill Impeccable) e da letture mirate
del codice. Serve a scegliere dove intervenire per primo.

---

## 1. Voto di salute (dimensione tecnica, da 0 a 4)

| # | Dimensione | Voto | Cosa ho trovato |
|---|---|---|---|
| 1 | Accessibilità | 3/4 | Molto curata: 143 etichette per i pulsanti a sola icona, sistema di contrasto automatico, rispetto di `prefers-reduced-motion`. Da controllare: testi piccoli diffusi e 13 punti senza indicatore di tastiera visibile. |
| 2 | Prestazioni | 2/4 | Il punto debole già noto: due pacchetti grandi al primo avvio (~1 MB + ~794 KB). Le pagine sono già "pigre", ma la zona principale (Index) scarica tutto insieme. |
| 3 | Adattamento ai dispositivi | 3/4 | Buon approccio "telefono prima di tutto": schede in basso, skeleton, punti di rottura. |
| 4 | Tema (colori/tokens) | 4/4 | Eccellente: sistema di colori centralizzato con tema chiaro/scuro; solo 8 colori "scritti a mano" in tutta l'app. |
| 5 | Coerenza complessiva | 3/4 | Identità chiara e protetta da test automatici. Ci sono però alcuni dettagli "da generico AI" (rimbalzi, un bordo colorato) e i 5 test di guardia rimasti indietro. |
| **Totale** | | **15/20** | Fascia **"Buono"**: intervenire sulle dimensioni più deboli |

---

## 2. Proposte ordinate per valore

### 🔴 Priorità A — Valore alto, sforzo basso

| # | Schermata | Cosa | Perché | Sforzo |
|---|---|---|---|---|
| A1 | **Tutte** (Pratica, Studio, Core, Chat) | Sostituire 9 animazioni "a rimbalzo" (`animate-bounce`, molle elastiche) con movimenti più morbidi e controllati, rispettando `prefers-reduced-motion` | Il rimbalzo continuo stanca e appare "da template"; la skill motion della repo (Emil Kowalski) dà la ricetta giusta | ⭐ Basso (9 punti precisi già individuati) |
| A2 | **Piano** | Il segno colorato sul bordo sinistro delle card evento (`border-l-4`) è il classico "trucco da AI generica": sostituirlo con un accento più elegante | Rende le card del calendario più curate e meno "generiche" | ⭐ Basso |

### 🟡 Priorità B — Valore medio

| # | Schermata | Cosa | Perché | Sforzo |
|---|---|---|---|---|
| B1 | **Pratica** | Rivedere i testi piccoli (etichette sotto ~14 px): alcuni sono contenuto, non solo didascalie | Leggibilità sul telefono è una priorità delle regole Erga | ⭐⭐ Medio |
| B2 | Tutte | Verificare i 13 punti dove il focus di tastiera è stato nascosto: serve sempre un anello visibile per chi usa la tastiera | Accessibilità da tastiera (regola obbligatoria della repo) | ⭐⭐ Medio |
| B3 | **Home** | Scegliere la direzione dei 5 test stilistici rimasti indietro (allinearli o ripristinare lo stile scuro) | Chiudere il "rosso" nei controlli e chiarire l'intento di design | ⭐ Basso–⭐ ⭐ |

### 🟠 Priorità C — Valore alto, sforzo maggiore

| # | Schermata | Cosa | Perché | Sforzo |
|---|---|---|---|---|
| C1 | App (tutta) | Alleggerire il primo caricamento: scaricare ogni "stanza" solo quando serve (Studio, Piano, Pratica, Core separati) | Primo avvio più rapido sul telefono = meno abbandoni. Era il punto 1 dell'analisi del 6 settembre | ⭐⭐⭐⭐ Elevato |
| C2 | Studio / Pratica | Dividere i file più grandi (`StudioView` 1.213 righe, `EserciziView` 1.225 righe) | Modifiche future più sicure e veloci | ⭐⭐⭐ Elevato |

---

## 3. Dettaglio dei 9 "rimbalzi" individuati

Sono animazioni di andata-e-ritorno (o molle con superamento del punto di arrivo)
che il detector segnala perché sembrano datate. Posizioni precise:

- **Pratica**: `InterrogazioneView` (5 punti), `EserciziView` (1)
- **Studio**: `FinalTest` (1)
- **Core**: `WeeklyRoutineEditor` (1, molla elastica)
- **Chat**: `ChatView` (1)

Nota: non è un errore tecnico, è una scelta di gusto/qualità. Molte sono usate per
"attirare l'attenzione" (es. pallino che rimbalza mentre si genera): si possono
sostituire con un movimento una-tantum più professionale.

---

## 4. Cosa funziona bene (da preservare)

- Sistema di colori e temi chiaro/scuro molto solido.
- Etichette accessibili ovunque (pulsanti a sola icona descritti).
- Il movimento rispetta già le preferenze di riduzione del movimento.
- La "voce" visiva di Erga è chiara: stessi colori, stessi caratteri, test che la proteggono.
- Landing e marketing curate con gerarchia di titoli corretta.

---

## 5. La mia raccomandazione

Partirei da **A1 + A2** (i rimbalzi e il bordo colorato): è il pacchetto
"le schermate sembrano fatte su misura" a basso costo, tocca Pratica, Studio,
Core, Chat e Piano. Poi B1/B2/B3 in un secondo giro. C1 e C2 restano in coda come
lavori più lunghi.

---

*Audit tecnico da codice eseguito al commit `bc3ef01`. Detector Impeccable: 11
avvisi (9 rimbalzi, 1 bordo laterale, 1 font). Nessuna modifica al codice.*
