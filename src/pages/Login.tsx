import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, User, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client"; // Usa direttamente il client supabase
import { Separator } from "@/components/ui/separator";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Ora prendiamo anche isAuthenticated dal context per fare il redirect automatico
  const { login, isAuthenticated } = useAuth(); 
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect automatico se l'utente è già loggato (es. torna da Google Login)
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Login manuale (Legacy / Beta Testers)
    const result = login(username, password);

    if (result.success) {
      if (result.requiresPasswordChange) {
        navigate("/cambia-password");
      } else {
        navigate("/");
      }
    } else {
      toast({
        title: "Errore di accesso",
        description: result.error,
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      // Usiamo supabase direttamente per il login OAuth
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin, // Torna alla home dopo il login
        },
      });
      
      if (error) {
        throw error;
      }
      // Non facciamo nulla qui, il redirect di Google gestirà il resto
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile accedere con Google",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* ... (Il resto del design Glassmorphism rimane identico, non lo modifico per brevità) ... */}
      
      {/* Sostituisci solo la CardContent se vuoi essere sicuro, ma il codice sopra gestisce la logica */}
      
      <div className="w-full max-w-sm animate-fade-up relative z-10">
        {/* ... Header e Logo ... */}
        
        <Card className="glass-strong border-0 shadow-glass-xl overflow-hidden">
           {/* ... Effetti sfondo card ... */}
          
          <CardHeader className="text-center pb-4 relative">
            <CardTitle className="text-xl font-heading">Accedi</CardTitle>
            <CardDescription>
              Beta Tester o account Google
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* CAMPI USERNAME/PASSWORD (Uguale a prima) */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">Nome utente</Label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="nome.cognome"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-12 h-12 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    autoComplete="username"
                    // Rimuovi 'required' se vuoi permettere di cliccare Google senza scrivere nulla
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 pr-12 h-12 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/50"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Pulsante ACCEDI (Manuale) */}
              <Button
                type="submit"
                className="w-full h-13 text-base font-semibold gradient-primary text-white border-0 rounded-xl shadow-glass-md hover:shadow-glass-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                size="lg"
                disabled={isSubmitting || (!username && !password)} // Disabilita se vuoto per evitare click accidentali
              >
                <LogIn className="w-5 h-5 mr-2" />
                Accedi (Beta)
              </Button>

              <div className="relative my-4">
                <Separator className="bg-border/50" />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                  oppure
                </span>
              </div>

              {/* Pulsante GOOGLE (Supabase) */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl border-border/50 hover:bg-muted/50 transition-all"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
              >
                 <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continua con Google
              </Button>
            </form>
          </CardContent>
        </Card>
         
        {/* ... Footer ... */}
      </div>
    </div>
  );
}
