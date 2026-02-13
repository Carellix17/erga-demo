import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Save, User, GraduationCap, BookOpen, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const INSTITUTES = [
  { value: "liceo_scientifico", label: "Liceo Scientifico" },
  { value: "liceo_classico", label: "Liceo Classico" },
  { value: "liceo_linguistico", label: "Liceo Linguistico" },
  { value: "istituto_tecnico", label: "Istituto Tecnico" },
];

const SUBJECTS = [
  "Matematica",
  "Italiano",
  "Storia",
  "Inglese",
  "Fisica",
  "Scienze",
  "Filosofia",
  "Informatica",
];

interface SubjectLevels {
  [subject: string]: number;
}

export function ProfileView() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [institute, setInstitute] = useState("liceo_scientifico");
  const [subjectLevels, setSubjectLevels] = useState<SubjectLevels>(() => {
    const defaults: SubjectLevels = {};
    SUBJECTS.forEach((s) => (defaults[s] = 6));
    return defaults;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!currentUser) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ userId: currentUser, action: "get" }),
        }
      );
      const data = await response.json();
      if (data.profile) {
        setInstitute(data.profile.institute_type || "liceo_scientifico");
        if (data.profile.subject_levels && Object.keys(data.profile.subject_levels).length > 0) {
          setSubjectLevels((prev) => ({ ...prev, ...data.profile.subject_levels }));
        }
      }
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    setSaved(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            userId: currentUser,
            action: "save",
            institute_type: institute,
            subject_levels: subjectLevels,
          }),
        }
      );
      if (response.ok) {
        setSaved(true);
        toast({ title: "Profilo salvato!", description: "I tuoi dati verranno usati per personalizzare l'esperienza." });
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      toast({ title: "Errore", description: "Impossibile salvare il profilo.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLevelChange = (subject: string, value: number[]) => {
    setSubjectLevels((prev) => ({ ...prev, [subject]: value[0] }));
  };

  const getLevelLabel = (level: number) => {
    if (level <= 3) return "Insufficiente";
    if (level <= 5) return "Sufficiente";
    if (level <= 7) return "Buono";
    if (level <= 9) return "Ottimo";
    return "Eccellente";
  };

  const getLevelColor = (level: number) => {
    if (level <= 3) return "text-destructive";
    if (level <= 5) return "text-warning";
    if (level <= 7) return "text-primary";
    if (level <= 9) return "text-success";
    return "text-success";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-32 space-y-6 max-w-lg mx-auto animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-heading font-bold text-foreground">Il tuo profilo</h1>
          <p className="text-sm text-muted-foreground">Personalizza la tua esperienza di studio</p>
        </div>
      </div>

      {/* Institute Section */}
      <div className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="w-5 h-5 text-tertiary" />
          <h2 className="font-heading font-semibold text-foreground">Tipo di istituto</h2>
        </div>
        <RadioGroup value={institute} onValueChange={setInstitute} className="space-y-2">
          {INSTITUTES.map((inst) => (
            <label
              key={inst.value}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-muted/50 has-[data-state=checked]:bg-primary/10 has-[data-state=checked]:border-primary/20"
            >
              <RadioGroupItem value={inst.value} />
              <span className="text-sm font-medium text-foreground">{inst.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Subject Levels Section */}
      <div className="glass-card rounded-2xl p-5 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-accent" />
          <h2 className="font-heading font-semibold text-foreground">Livello per materia</h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">Indica come vai in ogni materia (da 2 a 10)</p>

        <div className="space-y-5">
          {SUBJECTS.map((subject) => {
            const level = subjectLevels[subject] || 6;
            return (
              <div key={subject} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">{subject}</Label>
                  <span className={`text-sm font-semibold ${getLevelColor(level)}`}>
                    {level} — {getLevelLabel(level)}
                  </span>
                </div>
                <Slider
                  value={[level]}
                  onValueChange={(v) => handleLevelChange(subject, v)}
                  min={2}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full h-14 text-lg rounded-2xl"
        variant={saved ? "default" : "default"}
      >
        {isSaving ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : saved ? (
          <CheckCircle2 className="w-5 h-5 mr-2" />
        ) : (
          <Save className="w-5 h-5 mr-2" />
        )}
        {isSaving ? "Salvataggio..." : saved ? "Salvato!" : "Salva profilo"}
      </Button>
    </div>
  );
}
