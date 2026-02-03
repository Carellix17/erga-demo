import { z } from "zod";

// Schema di validazione della password (8-16 caratteri)
export const passwordSchema = z
  .string()
  .min(8, "La password deve avere almeno 8 caratteri")
  .max(16, "La password deve avere massimo 16 caratteri");

// Lista ufficiale dei Beta Tester
export const PREDEFINED_USERS = [
  "alessandra.avantaggiato",
  "alessandro.vito.bellomo",
  "alessia.francavilla",
  "cristian.piscitelli",
  "enrico.pepe",
  "iida.brattico",
  "luca.fizzarotti",
  "lucia.ingravalle",
  "martina.gesuita",
  "matilde.carella",
  "matteo.angiulli",
  "michele.losacco",
  "roberto.rubino",
  "saverio.bratta",
  "simone.melillo",
  "zahira.loseto",
  "patrizia.straziota.rappresentante",
  "nicola.marotti",
  "amministratore.carellix",
] as const;

export type Username = (typeof PREDEFINED_USERS)[number];

const INITIAL_PASSWORD = "qwerty1234";
const AUTH_STORAGE_KEY = "erga_auth";
const USERS_STORAGE_KEY = "erga_users";
const VERSION_KEY = "erga_version_id";
const CURRENT_VERSION = "3.0"; // Incrementato per migrazione a password hashate

// Simple hash function for client-side password storage
// NOTE: This is NOT cryptographically secure, but better than plaintext
// Real security comes from OAuth (Google/Apple) authentication
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "erga_salt_2024");
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Synchronous hash for initial setup (less secure but works without async)
function simpleHash(password: string): string {
  let hash = 0;
  const str = password + "erga_salt_2024";
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export interface UserData {
  username: Username;
  passwordHash: string; // Now stores hash, not plaintext
  hasChangedPassword: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: Username | null;
  requiresPasswordChange: boolean;
}

// Inizializzazione intelligente degli utenti
function initializeUsers(): Record<Username, UserData> {
  // Controllo versione per pulizia cache obsoleta
  const savedVersion = localStorage.getItem(VERSION_KEY);
  if (savedVersion !== CURRENT_VERSION) {
    // Se la versione è diversa, resettiamo tutti i dati utente per forzare il reset
    localStorage.removeItem(USERS_STORAGE_KEY);
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION);
  }

  const stored = localStorage.getItem(USERS_STORAGE_KEY);
  let users: Record<string, UserData> = {};
  
  // Prova a parsare i dati esistenti
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Verifica che sia un oggetto valido
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        users = parsed;
      }
    } catch {
      // Se il parsing fallisce, resetta
      users = {};
    }
  }

  let needsSave = false;

  // Sincronizza: aggiunge nuovi utenti e verifica la struttura di quelli esistenti
  PREDEFINED_USERS.forEach((username) => {
    const existing = users[username];
    
    // Se l'utente non esiste o ha una struttura corrotta, lo ricrea con password hashata
    if (!existing || typeof existing !== 'object' || !existing.username || !existing.passwordHash) {
      users[username] = {
        username: username as Username,
        passwordHash: simpleHash(INITIAL_PASSWORD), // Store hash, not plaintext
        hasChangedPassword: false,
      };
      needsSave = true;
    }
  });

  // Rimuovi utenti che non sono più nella lista predefinita
  Object.keys(users).forEach((key) => {
    if (!PREDEFINED_USERS.includes(key as Username)) {
      delete users[key];
      needsSave = true;
    }
  });

  if (needsSave || !stored) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  return users as Record<Username, UserData>;
}

// Ottieni tutti gli utenti
export function getUsers(): Record<Username, UserData> {
  return initializeUsers();
}

// Salva modifiche agli utenti
function saveUsers(users: Record<Username, UserData>): void {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

// Ottieni stato autenticazione attuale
export function getAuthState(): AuthState {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    isAuthenticated: false,
    currentUser: null,
    requiresPasswordChange: false,
  };
}

// Salva stato autenticazione
function saveAuthState(state: AuthState): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

// Funzione di LOGIN migliorata
export function login(
  username: string,
  password: string
): { success: boolean; error?: string; requiresPasswordChange?: boolean } {
  // Pulizia input
  const trimmedUsername = username.trim().toLowerCase();
  const users = getUsers();

  // Verifica esistenza nella lista ufficiale
  if (!PREDEFINED_USERS.includes(trimmedUsername as Username)) {
    return { success: false, error: "Nome utente non riconosciuto dal sistema" };
  }

  const user = users[trimmedUsername as Username];
  
  if (!user) {
    return { success: false, error: "Errore di sincronizzazione account" };
  }

  // Verifica password usando hash
  const inputHash = simpleHash(password);
  if (user.passwordHash !== inputHash) {
    return { success: false, error: "Password non corretta" };
  }

  const authState: AuthState = {
    isAuthenticated: true,
    currentUser: trimmedUsername as Username,
    requiresPasswordChange: !user.hasChangedPassword,
  };
  saveAuthState(authState);

  return {
    success: true,
    requiresPasswordChange: !user.hasChangedPassword,
  };
}

// Funzione Cambia Password
export function changePassword(
  newPassword: string
): { success: boolean; error?: string } {
  const authState = getAuthState();
  if (!authState.currentUser) {
    return { success: false, error: "Devi essere loggato per cambiare password" };
  }

  const result = passwordSchema.safeParse(newPassword);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const users = getUsers();
  users[authState.currentUser] = {
    ...users[authState.currentUser],
    passwordHash: simpleHash(newPassword), // Store hash, not plaintext
    hasChangedPassword: true,
  };
  saveUsers(users);

  saveAuthState({
    ...authState,
    requiresPasswordChange: false,
  });

  return { success: true };
}

// Logout
export function logout(): void {
  saveAuthState({
    isAuthenticated: false,
    currentUser: null,
    requiresPasswordChange: false,
  });
}

// Utility per storage specifico dell'utente
export function getUserStorageKey(key: string): string {
  const authState = getAuthState();
  if (!authState.currentUser) {
    throw new Error("Utente non autenticato");
  }
  return `erga_${authState.currentUser}_${key}`;
}

export function getUserData<T>(key: string, defaultValue: T): T {
  try {
    const storageKey = getUserStorageKey(key);
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function saveUserData<T>(key: string, data: T): void {
  try {
    const storageKey = getUserStorageKey(key);
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (e) {
    console.error("Errore nel salvataggio dati utente", e);
  }
}
