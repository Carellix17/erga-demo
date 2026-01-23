import { z } from "zod";

// Password validation schema (8-16 characters)
export const passwordSchema = z
  .string()
  .min(8, "La password deve avere almeno 8 caratteri")
  .max(16, "La password deve avere massimo 16 caratteri");

// Predefined users
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

// Initialize users in localStorage if not exists
function initializeUsers(): Record<Username, UserData> {
  const stored = localStorage.getItem(USERS_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }

  const users: Record<string, UserData> = {};
  PREDEFINED_USERS.forEach((username) => {
    users[username] = {
      username,
      password: INITIAL_PASSWORD,
      hasChangedPassword: false,
    };
  });

  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  return users as Record<Username, UserData>;
}

// Get all users
export function getUsers(): Record<Username, UserData> {
  return initializeUsers();
}

// Save users
function saveUsers(users: Record<Username, UserData>): void {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

// Get auth state
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

// Save auth state
function saveAuthState(state: AuthState): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

// Login
export function login(
  username: string,
  password: string
): { success: boolean; error?: string; requiresPasswordChange?: boolean } {
  const trimmedUsername = username.trim().toLowerCase();
  const users = getUsers();

  if (!PREDEFINED_USERS.includes(trimmedUsername as Username)) {
    return { success: false, error: "Nome utente non valido" };
  }

  const user = users[trimmedUsername as Username];
  if (user.password !== password) {
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

// Change password
export function changePassword(
  newPassword: string
): { success: boolean; error?: string } {
  const authState = getAuthState();
  if (!authState.currentUser) {
    return { success: false, error: "Utente non autenticato" };
  }

  // Validate password
  const result = passwordSchema.safeParse(newPassword);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const users = getUsers();
  users[authState.currentUser] = {
    ...users[authState.currentUser],
    password: newPassword,
    hasChangedPassword: true,
  };
  saveUsers(users);

  // Update auth state
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

// Get user-specific storage key
export function getUserStorageKey(key: string): string {
  const authState = getAuthState();
  if (!authState.currentUser) {
    throw new Error("User not authenticated");
  }
  return `erga_${authState.currentUser}_${key}`;
}

// Get user data from localStorage
export function getUserData<T>(key: string, defaultValue: T): T {
  try {
    const storageKey = getUserStorageKey(key);
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

// Save user data to localStorage
export function saveUserData<T>(key: string, data: T): void {
  const storageKey = getUserStorageKey(key);
  localStorage.setItem(storageKey, JSON.stringify(data));
}
