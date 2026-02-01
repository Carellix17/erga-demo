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
  currentUser: string | null;
  requiresPasswordChange: boolean;
  isLoading: boolean;
  isGoogleUser: boolean;
  login: (username: string, password: string) => { success: boolean; error?: string; requiresPasswordChange?: boolean };
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => { success: boolean; error?: string };
  refreshAuthState: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [localAuthState, setLocalAuthState] = useState<AuthState>({
    isAuthenticated: false,
    currentUser: null,
    requiresPasswordChange: false,
  });
  const [supabaseSession, setSupabaseSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuthState = useCallback(() => {
    const state = getAuthState();
    setLocalAuthState(state);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        // 1. Controlla subito la sessione esistente (importante al ritorno da Google)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (session) {
            console.log("Sessione Google trovata:", session.user.email);
            setSupabaseSession(session);
            authLogout(); // Pulisce sessioni legacy se entra con Google
          }
          refreshAuthState();
        }

        // 2. Resta in ascolto di cambi di stato
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log("Evento Auth rilevato:", event);
          if (mounted) {
            setSupabaseSession(session);
            if (session) {
              authLogout();
              refreshAuthState();
            }
          }
        });

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error("Errore inizializzazione Auth:", error);
      } finally {
        if (mounted) {
          // Aspettiamo un piccolo tick per essere sicuri che lo stato sia propagato
          setTimeout(() => setIsLoading(false), 100);
        }
      }
    }

    initAuth();
    return () => { mounted = false; };
  }, [refreshAuthState]);

  // Logica Ibrida
  const isAuthenticated = !!supabaseSession || localAuthState.isAuthenticated;
  const currentUser = supabaseSession?.user?.email || localAuthState.currentUser;
  const isGoogleUser = !!supabaseSession;
  const requiresPasswordChange = !isGoogleUser && localAuthState.requiresPasswordChange;

  const login = useCallback((username: string, password: string) => {
    const result = authLogin(username, password);
    if (result.success) refreshAuthState();
    return result;
  }, [refreshAuthState]);

  const logout = useCallback(async () => {
    if (supabaseSession) await supabase.auth.signOut();
    authLogout();
    setSupabaseSession(null);
    refreshAuthState();
  }, [supabaseSession, refreshAuthState]);

  const changePassword = useCallback((newPassword: string) => {
    if (isGoogleUser) return { success: false, error: "Usa le impostazioni di Google per cambiare password." };
    const result = authChangePassword(newPassword);
    if (result.success) refreshAuthState();
    return result;
  }, [isGoogleUser, refreshAuthState]);

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
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
