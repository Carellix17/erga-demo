import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Mostra uno spinner o niente mentre controlla
    return <div className="min-h-screen bg-background flex items-center justify-center">Caricamento...</div>;
  }

  if (!isAuthenticated) {
    // Se non è loggato, via al login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se è arrivato qui, è loggato (o con Google o con User/Pass). Fallo passare!
  return <>{children}</>;
}
