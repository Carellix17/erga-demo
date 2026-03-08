import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Save, User, GraduationCap, BookOpen, Loader2, CheckCircle2, Camera, UserCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const INSTITUTES = [
  { value: "liceo_scientifico", label: "Liceo Scientifico" },
  { value: "liceo_classico", label: "Liceo Classico" },
  { value: "liceo_linguistico", label: "Liceo Linguistico" },
  { value: "istituto_tecnico", label: "Istituto Tecnico" },
];

const SCHOOLS = [
  { value: "licei_cartesio", label: "Licei Cartesio" },
];

const SUBJECTS = [
  "Matematica", "Italiano", "Storia", "Inglese",
  "Fisica", "Scienze", "Filosofia", "Informatica",
];

interface SubjectLevels { [subject: string]: number; }

export function ProfileView() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState<string>("");
  const [school, setSchool] = useState("licei_cartesio");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

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
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, action: "get" }) }
      );
      const data = await response.json();
      if (data.profile) {
        const p = data.profile;
        setInstitute(p.institute_type || "liceo_scientifico");
        setFirstName(p.first_name || "");
        setLastName(p.last_name || "");
        setNickname(p.nickname || "");
        setAge(p.age ? String(p.age) : "");
        setSchool(p.school || "licei_cartesio");
        setAvatarUrl(p.avatar_url || "");
        if (p.avatar_url) setAvatarPreview(p.avatar_url);
        if (p.subject_levels && Object.keys(p.subject_levels).length > 0) {
          setSubjectLevels((prev) => ({ ...prev, ...p.subject_levels }));
        }
      }
    } catch (err) { console.error("Error loading profile:", err); }
    finally { setIsLoading(false); }
  }, [currentUser]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (file.size > 2 * 1024 * 1024) { toast({ title: "Errore", description: "L'immagine deve essere inferiore a 2MB", variant: "destructive" }); return; }

    setIsUploadingAvatar(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non autenticato");

      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${session.user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const urlWithCache = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(urlWithCache);
      setAvatarPreview(urlWithCache);
    } catch (err) {
      console.error("Error uploading avatar:", err);
      toast({ title: "Errore", description: "Impossibile caricare l'immagine", variant: "destructive" });
    } finally { setIsUploadingAvatar(false); }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true); setSaved(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-profile`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            userId: currentUser, action: "save",
            institute_type: institute, subject_levels: subjectLevels,
            first_name: firstName, last_name: lastName, nickname,
            age: age ? parseInt(age) : null, school, avatar_url: avatarUrl,
          }) }
      );
      if (response.ok) {
        setSaved(true);
        toast({ title: "Profilo salvato! ✨", description: "I tuoi dati verranno usati per personalizzare l'esperienza." });
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      toast({ title: "Errore", description: "Impossibile salvare il profilo.", variant: "destructive" });
    } finally { setIsSaving(false); }
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
      {/* Avatar & Name Header */}
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="relative">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingAvatar}
            className="w-24 h-24 rounded-[2rem] overflow-hidden bg-primary-container flex items-center justify-center shadow-level-2 transition-all duration-400 ease-m3-emphasized hover:scale-105 hover:shadow-level-3 active:scale-95 relative group"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserCircle2 className="w-12 h-12 text-primary" />
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {isUploadingAvatar ? (
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-white" />
              )}
            </div>
          </button>
        </div>
        <div className="text-center">
          <h1 className="title-large font-display font-bold text-foreground">
            {nickname || firstName || "Il tuo profilo"}
          </h1>
          <p className="body-medium text-muted-foreground">Personalizza la tua esperienza di studio</p>
        </div>
      </div>

      {/* Personal Info */}
      <div className="m3-card-elevated rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-5 h-5 text-primary" />
          <h2 className="title-medium font-display text-foreground">Dati personali</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="label-medium text-muted-foreground">Nome</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Mario" className="rounded-2xl h-11 bg-surface-container-high border-0" />
          </div>
          <div className="space-y-1.5">
            <Label className="label-medium text-muted-foreground">Cognome</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Rossi" className="rounded-2xl h-11 bg-surface-container-high border-0" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="label-medium text-muted-foreground">Nickname <span className="text-primary">(usato dal chatbot)</span></Label>
          <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Il tuo soprannome" className="rounded-2xl h-11 bg-surface-container-high border-0" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="label-medium text-muted-foreground">Età</Label>
            <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="16" min={13} max={30} className="rounded-2xl h-11 bg-surface-container-high border-0" />
          </div>
          <div className="space-y-1.5">
            <Label className="label-medium text-muted-foreground">Scuola</Label>
            <div className="h-11 rounded-2xl bg-surface-container-high flex items-center px-3">
              <select value={school} onChange={(e) => setSchool(e.target.value)} className="bg-transparent w-full body-medium outline-none">
                {SCHOOLS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Institute Section */}
      <div className="m3-card-elevated rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="w-5 h-5 text-secondary" />
          <h2 className="title-medium font-display text-foreground">Tipo di istituto</h2>
        </div>
        <RadioGroup value={institute} onValueChange={setInstitute} className="space-y-1">
          {INSTITUTES.map((inst) => (
            <label
              key={inst.value}
              className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-300 ease-m3-emphasized hover:bg-foreground/[0.08] has-[data-state=checked]:bg-secondary-container"
            >
              <RadioGroupItem value={inst.value} />
              <span className="body-large text-foreground">{inst.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Subject Levels Section */}
      <div className="m3-card-elevated rounded-3xl p-5 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-tertiary" />
          <h2 className="title-medium font-display text-foreground">Livello per materia</h2>
        </div>
        <p className="body-small text-muted-foreground -mt-2">Indica come vai in ogni materia (da 2 a 10)</p>

        <div className="space-y-5">
          {SUBJECTS.map((subject) => {
            const level = subjectLevels[subject] || 6;
            return (
              <div key={subject} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="body-large text-foreground">{subject}</Label>
                  <span className={cn("label-large", getLevelColor(level))}>
                    {level} — {getLevelLabel(level)}
                  </span>
                </div>
                <Slider value={[level]} onValueChange={(v) => handleLevelChange(subject, v)} min={2} max={10} step={1} className="w-full" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={isSaving} className="w-full h-14 gradient-primary border-0 shadow-level-2" size="lg">
        {isSaving ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : saved ? (
          <CheckCircle2 className="w-5 h-5 mr-2" />
        ) : (
          <Save className="w-5 h-5 mr-2" />
        )}
        {isSaving ? "Salvataggio..." : saved ? "Salvato! ✨" : "Salva profilo"}
      </Button>
    </div>
  );
}
