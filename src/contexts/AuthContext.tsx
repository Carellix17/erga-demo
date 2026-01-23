import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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
  currentUser: Username | null;
  requiresPasswordChange: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => { success: boolean; error?: string; requiresPasswordChange?: boolean };
  logout: () => void;
  changePassword: (newPassword: string) => { success: boolean; error?: string };
  refreshAuthState: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    currentUser: null,
    requiresPasswordChange: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuthState = useCallback(() => {
    const state = getAuthState();
    setAuthState(state);
  }, []);

  useEffect(() => {
    refreshAuthState();
    setIsLoading(false);
  }, [refreshAuthState]);

  const login = useCallback((username: string, password: string) => {
    const result = authLogin(username, password);
    if (result.success) {
      refreshAuthState();
    }
    return result;
  }, [refreshAuthState]);

  const logout = useCallback(() => {
    authLogout();
    refreshAuthState();
  }, [refreshAuthState]);

  const changePassword = useCallback((newPassword: string) => {
    const result = authChangePassword(newPassword);
    if (result.success) {
      refreshAuthState();
    }
    return result;
  }, [refreshAuthState]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authState.isAuthenticated,
        currentUser: authState.currentUser,
        requiresPasswordChange: authState.requiresPasswordChange,
        isLoading,
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
