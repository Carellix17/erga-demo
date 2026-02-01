import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import {
  AuthState,
  getAuthState,
  login as authLogin,
  logout as authLogout,
  changePassword as authChangePassword,
  Username,
} from "@/lib/auth";

interface AuthContextType {
  isAuthenticated: boolean;
  // Ora accettiamo string generiche (email di Google) o gli Username legacy
  currentUser: string | null; 
  requiresPasswordChange: boolean;
  isLoading: boolean;
  isGoogleUser: boolean; // Utile per nascondere opzioni "cambia password" ai Google user
  login: (username: string, password: string) => { success: boolean; error?: string; requiresPasswordChange?: boolean };
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => { success: boolean; error?: string };
  refreshAuthState: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // 1. Stato per l'autenticazione Locale (Beta Testers)
  const [localAuthState, setLocalAuthState] = useState<AuthState>({
    isAuthenticated: false,
    currentUser: null,
    requiresPasswordChange: false,
  });

  // 2. Stato per l'autenticazione Supabase (Google / Nuovi Utenti)
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);

  // Funzione per aggiornare lo stato locale
  const refreshAuthState = useCallback(() => {
    const state = getAuthState();
    setLocalAuthState(state);
  }, []);

  // INIT: Controlla sia Supabase che Locale al caricamento
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        // A. Controlla sessione Supabase esistente
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSupabaseSession(session);
        }

        // B. Ascolta i cambiamenti di Supabase (es. login con Google completato)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (mounted) {
            setSupabaseSession(session);
            // Se entra con Google, puliamo eventuali sessioni locali per evitare conflitti
            if (session) {
              authLogout();
              refreshAuthState();
            }
          }
        });

        // C. Carica stato locale
        refreshAuthState();

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error("Errore inizializzazione Auth:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [refreshAuthState]);

  // --- LOGICA IBRIDA ---
  
  // L'utente è autenticato se lo è su Supabase OPPURE in locale
  const isAuthenticated = !!supabaseSession || localAuthState.isAuthenticated;
  
  // L'utente corrente è l'email di Google OPPURE lo username locale
  const currentUser = supabaseSession?.user?.email || localAuthState.currentUser;
  
  // Google users non devono cambiare password qui (lo fanno su Google)
  const requiresPasswordChange = !supabaseSession && localAuthState.requiresPasswordChange;
  const isGoogleUser = !!supabaseSession;

  // Login Manuale (Legacy)
  const login = useCallback((username: string, password: string) => {
    const result = authLogin(username, password);
    if (result.success) {
      refreshAuthState();
    }
    return result;
  }, [refreshAuthState]);

  // Logout Unificato (Pulisce sia Google che Locale)
  const logout = useCallback(async () => {
    try {
      // 1. Logout da Supabase
      if (supabaseSession) {
        await supabase.auth.signOut();
      }
      // 2. Logout Locale
      authLogout();
      refreshAuthState();
      setSupabaseSession(null);
    } catch (error) {
      console.error("Errore durante il logout:", error);
    }
  }, [supabaseSession, refreshAuthState]);

  const changePassword = useCallback((newPassword: string) => {
    // Non permettere cambio password locale se sei loggato con Google
    if (supabaseSession) {
      return { success: false, error: "Non puoi cambiare la password di Google da qui." };
    }
    
    const result = authChangePassword(newPassword);
    if (result.success) {
      refreshAuthState();
    }
    return result;
  }, [refreshAuthState, supabaseSession]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        requiresPasswordChange,
        isLoading,
        isGoogleUser,
        login,
        logout,
        changePassword,
        refreshAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
