import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
// Importiamo il client di Supabase per parlare con il cloud
import { supabase } from "@/integrations/supabase/client";

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser } = useAuth(); 
  const navigate = useNavigate();
  const { toast } = useToast();

  const passwordLength = newPassword.length;
  const isLengthValid = passwordLength >= 8 && passwordLength <= 16;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = isLengthValid && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) {
      toast({
        title: "Errore",
        description: "Verifica i requisiti della password",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Aggiorniamo la password direttamente su Supabase (Cloud)
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password aggiornata",
        description: "La tua nuova password è stata salvata nel cloud!",
      });
      navigate("/");
      
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare la password",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-accent-foreground" />
          </div>
          <h1 className="text-xl font-bold">Cambia password</h1>
          <p className="text-muted-foreground text-sm mt-1 text-center">
            Ciao <span className="font-medium text-foreground">{currentUser}</span>!
            <br />
            Crea una nuova password sicura nel cloud.
          </p>
        </div>

        <Card className="border-0 shadow-soft-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Nuova password</CardTitle>
            <CardDescription>
              La password deve essere tra 8 e 16 caratteri
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nuova password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                    autoComplete="new-password"
                    maxLength={16}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-xs">
                  <div
                    className={cn(
                      "flex items-center gap-1",
                      isLengthValid ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {isLengthValid && <Check className="w-3 h-3" />}
                    <span>8-16 caratteri ({passwordLength}/16)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Conferma password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Ripeti la password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    autoComplete="new-password"
                    maxLength={16}
                    required
                  />
                </div>
                
                {confirmPassword.length > 0 && (
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs",
                      passwordsMatch ? "text-primary" : "text-destructive"
                    )}
                  >
                    {passwordsMatch && <Check className="w-3 h-3" />}
                    <span>
                      {passwordsMatch ? "Le password corrispondono" : "Le password non corrispondono"}
                    </span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? "Salvataggio..." : "Salva nuova password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
