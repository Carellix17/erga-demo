import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "La password deve avere almeno 8 caratteri")
  .max(16, "La password deve avere massimo 16 caratteri");

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

export interface UserData {
  username: Username;
  password: string;
  hasChangedPassword: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: Username | null;
  requiresPasswordChange: boolean;
}

function initializeUsers(): Record<Username, UserData> {
  const stored = localStorage.getItem(USERS_STORAGE_KEY);
  let users: Record<string, UserData> = stored ? JSON.parse(stored) : {};

  let needsUpdate = false;

  // Sincronizzazione: Aggiungiamo utenti mancanti dalla lista PREDEFINED_USERS
  PREDEFINED_USERS.forEach((username) => {
    if (!users[username]) {
      users[username] = {
        username: username as Username,
        password: INITIAL_PASSWORD,
        hasChangedPassword: false,
      };
      needsUpdate = true;
    }
  });

  if (needsUpdate || !stored) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  return users as Record<Username, UserData>;
}

export function getUsers(): Record<Username, UserData> {
  return initializeUsers();
}

function saveUsers(users: Record<Username, UserData>): void {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

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

function saveAuthState(state: AuthState): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

export function login(
  username: string,
  password: string
): { success: boolean; error?: string; requiresPasswordChange?: boolean } {
  // Pulizia input: rimuove spazi e trasforma in minuscolo
  const trimmedUsername = username.trim().toLowerCase();
  const users = getUsers();

  // Verifica se l'utente esiste nella lista ufficiale
  if (!PREDEFINED_USERS.includes(trimmedUsername as Username)) {
    return { success: false, error: "Nome utente non trovato" };
  }

  const user = users[trimmedUsername as Username];
  
  if (!user) {
    return { success: false, error: "Errore di sincronizzazione utente" };
  }

  if (user.password !== password) {
    return { success: false, error: "Password errata per " + trimmedUsername };
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

// ... il resto del file (changePassword, logout, etc.) rimane uguale
export function changePassword(newPassword: string): { success: boolean; error?: string } {
  const authState = getAuthState();
  if (!authState.currentUser) return { success: false, error: "Utente non autenticato" };
  const result = passwordSchema.safeParse(newPassword);
  if (!result.success) return { success: false, error: result.error.errors[0].message };
  const users = getUsers();
  users[authState.currentUser] = { ...users[authState.currentUser], password: newPassword, hasChangedPassword: true };
  saveUsers(users);
  saveAuthState({ ...authState, requiresPasswordChange: false });
  return { success: true };
}

export function logout(): void {
  saveAuthState({ isAuthenticated: false, currentUser: null, requiresPasswordChange: false });
}

export function getUserStorageKey(key: string): string {
  const authState = getAuthState();
  if (!authState.currentUser) throw new Error("User not authenticated");
  return `erga_${authState.currentUser}_${key}`;
}

export function getUserData<T>(key: string, defaultValue: T): T {
  try {
    const storageKey = getUserStorageKey(key);
    const stored = localStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch { return defaultValue; }
}

export function saveUserData<T>(key: string, data: T): void {
  const storageKey = getUserStorageKey(key);
  localStorage.setItem(storageKey, JSON.stringify(data));
}
