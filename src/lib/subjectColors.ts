/**
 * Maps course/file names to subject-based color themes.
 * Each subject gets a unique vibrant color for visual differentiation.
 */

export interface SubjectColor {
  key: string;
  label: string;
  bg: string;          // background for chips/cards
  bgActive: string;    // active state background
  text: string;        // text color on bg
  textActive: string;  // text on active bg
  border: string;      // border color
  icon: string;        // icon bg
  gradient: string;    // gradient for progress cards
  badge: string;       // badge bg
  badgeText: string;   // badge text
}

const SUBJECT_COLORS: SubjectColor[] = [
  {
    key: "storia",
    label: "Storia",
    bg: "bg-amber-50", bgActive: "bg-amber-500", text: "text-amber-800", textActive: "text-white",
    border: "border-amber-200", icon: "bg-amber-100", gradient: "from-amber-500 to-orange-500",
    badge: "bg-amber-100", badgeText: "text-amber-700",
  },
  {
    key: "matematica",
    label: "Matematica",
    bg: "bg-blue-50", bgActive: "bg-blue-600", text: "text-blue-800", textActive: "text-white",
    border: "border-blue-200", icon: "bg-blue-100", gradient: "from-blue-500 to-indigo-600",
    badge: "bg-blue-100", badgeText: "text-blue-700",
  },
  {
    key: "economia",
    label: "Economia",
    bg: "bg-emerald-50", bgActive: "bg-emerald-600", text: "text-emerald-800", textActive: "text-white",
    border: "border-emerald-200", icon: "bg-emerald-100", gradient: "from-emerald-500 to-green-600",
    badge: "bg-emerald-100", badgeText: "text-emerald-700",
  },
  {
    key: "scienze",
    label: "Scienze",
    bg: "bg-teal-50", bgActive: "bg-teal-600", text: "text-teal-800", textActive: "text-white",
    border: "border-teal-200", icon: "bg-teal-100", gradient: "from-teal-500 to-cyan-600",
    badge: "bg-teal-100", badgeText: "text-teal-700",
  },
  {
    key: "letteratura",
    label: "Letteratura",
    bg: "bg-rose-50", bgActive: "bg-rose-500", text: "text-rose-800", textActive: "text-white",
    border: "border-rose-200", icon: "bg-rose-100", gradient: "from-rose-500 to-pink-600",
    badge: "bg-rose-100", badgeText: "text-rose-700",
  },
  {
    key: "filosofia",
    label: "Filosofia",
    bg: "bg-violet-50", bgActive: "bg-violet-600", text: "text-violet-800", textActive: "text-white",
    border: "border-violet-200", icon: "bg-violet-100", gradient: "from-violet-500 to-purple-600",
    badge: "bg-violet-100", badgeText: "text-violet-700",
  },
  {
    key: "fisica",
    label: "Fisica",
    bg: "bg-sky-50", bgActive: "bg-sky-600", text: "text-sky-800", textActive: "text-white",
    border: "border-sky-200", icon: "bg-sky-100", gradient: "from-sky-500 to-blue-500",
    badge: "bg-sky-100", badgeText: "text-sky-700",
  },
  {
    key: "informatica",
    label: "Informatica",
    bg: "bg-cyan-50", bgActive: "bg-cyan-600", text: "text-cyan-800", textActive: "text-white",
    border: "border-cyan-200", icon: "bg-cyan-100", gradient: "from-cyan-500 to-teal-500",
    badge: "bg-cyan-100", badgeText: "text-cyan-700",
  },
  {
    key: "arte",
    label: "Arte",
    bg: "bg-fuchsia-50", bgActive: "bg-fuchsia-600", text: "text-fuchsia-800", textActive: "text-white",
    border: "border-fuchsia-200", icon: "bg-fuchsia-100", gradient: "from-fuchsia-500 to-pink-500",
    badge: "bg-fuchsia-100", badgeText: "text-fuchsia-700",
  },
  {
    key: "geografia",
    label: "Geografia",
    bg: "bg-lime-50", bgActive: "bg-lime-600", text: "text-lime-800", textActive: "text-white",
    border: "border-lime-200", icon: "bg-lime-100", gradient: "from-lime-500 to-green-500",
    badge: "bg-lime-100", badgeText: "text-lime-700",
  },
  {
    key: "diritto",
    label: "Diritto",
    bg: "bg-slate-50", bgActive: "bg-slate-600", text: "text-slate-800", textActive: "text-white",
    border: "border-slate-200", icon: "bg-slate-100", gradient: "from-slate-500 to-gray-600",
    badge: "bg-slate-100", badgeText: "text-slate-700",
  },
  {
    key: "lingue",
    label: "Lingue",
    bg: "bg-orange-50", bgActive: "bg-orange-500", text: "text-orange-800", textActive: "text-white",
    border: "border-orange-200", icon: "bg-orange-100", gradient: "from-orange-500 to-red-500",
    badge: "bg-orange-100", badgeText: "text-orange-700",
  },
];

// Keywords that map to each subject
const SUBJECT_KEYWORDS: Record<string, string[]> = {
  storia: ["storia", "storico", "storica", "medioevo", "romano", "romana", "impero", "guerra", "rivoluzione", "augusto", "cesare", "rinascimento", "antico", "antica", "medievale", "risorgimento", "fascismo", "napoleone"],
  matematica: ["matematica", "algebra", "geometria", "calcolo", "equazioni", "funzioni", "integrali", "derivate", "trigonometria", "statistica", "probabilità", "numeri"],
  economia: ["economia", "economico", "economica", "finanza", "mercato", "trading", "investimento", "pil", "inflazione", "borsa", "azioni", "analisi tecnica", "microeconomia", "macroeconomia"],
  scienze: ["scienza", "scienze", "biologia", "chimica", "biodiversità", "ecosistema", "cellula", "dna", "evoluzione", "organismo", "molecola", "atomo"],
  letteratura: ["letteratura", "poesia", "romanzo", "dante", "manzoni", "leopardi", "figura retorica", "figure retoriche", "narrativa", "sonetto", "epica", "prosa", "verso"],
  filosofia: ["filosofia", "filosofico", "platone", "aristotele", "kant", "hegel", "etica", "metafisica", "epistemologia", "socrate", "nietzsche"],
  fisica: ["fisica", "meccanica", "termodinamica", "elettromagnetismo", "ottica", "quantistica", "relatività", "newton", "energia", "forza", "velocità", "accelerazione"],
  informatica: ["informatica", "programmazione", "algoritmo", "database", "software", "hardware", "codice", "python", "java", "web", "computer", "rete"],
  arte: ["arte", "pittura", "scultura", "architettura", "artistica", "caravaggio", "michelangelo", "rinascimentale", "barocco", "impressionismo"],
  geografia: ["geografia", "geografico", "territorio", "continente", "clima", "cartografia", "geomorfologia", "idrografia"],
  diritto: ["diritto", "legge", "costituzione", "giuridico", "normativa", "codice civile", "penale", "contratto"],
  lingue: ["inglese", "francese", "tedesco", "spagnolo", "latino", "greco", "lingua", "grammatica", "traduzione"],
};

// Default fallback color (the primary indigo)
const DEFAULT_COLOR: SubjectColor = {
  key: "default",
  label: "Generale",
  bg: "bg-indigo-50", bgActive: "bg-primary", text: "text-indigo-800", textActive: "text-primary-foreground",
  border: "border-indigo-200", icon: "bg-indigo-100", gradient: "from-primary to-secondary",
  badge: "bg-indigo-100", badgeText: "text-indigo-700",
};

/**
 * Detects the subject from a course/file name and returns the matching color theme.
 */
export function getSubjectColor(fileName: string): SubjectColor {
  const lower = fileName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const originalLower = fileName.toLowerCase();

  for (const [subjectKey, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    for (const kw of keywords) {
      if (originalLower.includes(kw) || lower.includes(kw)) {
        return SUBJECT_COLORS.find(c => c.key === subjectKey) || DEFAULT_COLOR;
      }
    }
  }

  return DEFAULT_COLOR;
}

/**
 * Returns a stable color based on string hash (for courses that don't match any subject).
 * This ensures the same course always gets the same color.
 */
export function getStableSubjectColor(fileName: string): SubjectColor {
  const detected = getSubjectColor(fileName);
  if (detected.key !== "default") return detected;

  // Hash-based stable color assignment for unrecognized subjects
  let hash = 0;
  for (let i = 0; i < fileName.length; i++) {
    hash = ((hash << 5) - hash) + fileName.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % SUBJECT_COLORS.length;
  return SUBJECT_COLORS[index];
}
