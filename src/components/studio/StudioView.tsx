import { useState, useEffect, useRef, useMemo } from "react";
import { FullscreenLessonGate } from "./FullscreenLesson";
import { FinalTest } from "./FinalTest";
import { GenerationProgress } from "./GenerationProgress";
import { ModulePath } from "./ModulePath";
import { ModulesOverview, type ModuleCardData } from "./ModulesOverview";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { LessonsListSkeleton } from "./LessonsListSkeleton";
import { ModuleGenerationScreen } from "./ModuleGenerationScreen";
import { PathHero } from "./PathHero";
import { PraticaSubTab } from "@/components/pratica/PraticaView";
import { ChatView } from "@/components/chat/ChatView";
import { EserciziView } from "@/components/pratica/EserciziView";
import { InterrogazioneView } from "@/components/pratica/InterrogazioneView";
import { ModuleHeaderCard, PracticeLaunchers, PromptBar, SheetDrawer, SubViewHeader } from "./StudioPractice";
import { AnimatePresence, motion } from "framer-motion";
import { cleanCourseName } from "@/lib/courseName";
import { getSubjectAccent } from "@/lib/subjectColors";
import { useSubjectAccent } from "@/hooks/useSubjectAccent";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Exercise } from "./exercises/ExerciseRenderer";
import { supabase } from "@/integrations/supabase/client";
import { edgeFetch } from "@/lib/edgeFetch";
import { MODULE_SIZE, moduleIndexOf, moduleRange, moduleCount, moduleTitleFor, lessonsInModule, isModuleFullyMissing, isFirstOfModule, isInGatedModule, isGateLesson } from "@/lib/lessonModules";
import { currentLanguage } from "@/i18n";
import {
  useLessonsQuery,
  useStudyContextsQuery,
  useUpdateLessonProgress,
  useLessonsCacheControls,
  fetchLessonsList,
  fetchLessonFull,
  lessonsKeys,
  type Lesson,
  type LessonMeta,
} from "@/hooks/useLessons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGenerationUsage,
  useInvalidateGenerationUsage,
  FREE_LIMIT_MESSAGE,
} from "@/hooks/useGenerationUsage";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useDeleteFileContext } from "@/hooks/useFileContexts";

interface StudioViewProps {
  hasFiles: boolean;
  onUploadClick: () => void;
  selectedContextId?: string | null;
  lessonLaunch?: { contextId: string; lessonIndex: number; requestId: number } | null;
  onLessonLaunchHandled?: () => void;
  onClearContext?: () => void;
  onOpenCourseMaterials?: (contextId: string) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export function StudioView({ hasFiles, onUploadClick, selectedContextId, lessonLaunch, onLessonLaunchHandled, onClearContext, onOpenCourseMaterials, onFullscreenChange }: StudioViewProps) {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const handledLessonLaunchRef = useRef<number | null>(null);
  // `localStarting` copre la finestra tra il click "Genera" e la prima scrittura
  // di `generation_status='generating'` da parte del backend. Lo stato vero
  // arriva via Realtime dalla riga di `study_contexts`.
  const [localStarting, setLocalStarting] = useState(false);

  // 🏭 P10b: la sala d'attesa della fabbrica dei moduli (null = chiusa).
  // Il lavoro vero vive sul cloud (generation_progress.moduleGeneration);
  // questo stato decide solo se la FINESTRA è aperta su questa scheda.
  const [moduleScreen, setModuleScreen] = useState<{ moduleIndex: number } | null>(null);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);

  // 🧭 P38 — navigazione progressiva del corso: 'overview' = Home Studio
  // (card + pratica), 'modules' = Livello 1 (schede dei moduli + "Riprendi
  // lezione"), 'branch' = Livello 2 (percorso a ramo del modulo, navbar
  // nascosta). Il modulo aperto nel ramo è `activeModuleIndex`.
  const [courseViewState, setCourseViewState] = useState<"overview" | "modules" | "branch">("overview");
  // 🧩 P37 — sottoviste di pratica DEDICATE (niente schede condivise): null =
  // panoramica Studio; altrimenti una modalità esclusiva a schermo intero.
  const [praticaSubView, setPraticaSubView] = useState<PraticaSubTab | null>(null);

  // 🧭 P37 — barra di navigazione: NASCOSTA nelle sottoviste immersive
  // (Esercizi/Interrogazione, esperienza full-screen senza occlusioni),
  // VISIBILE in panoramica e in Chat (il campo di testo resta sopra la barra
  // grazie al layout h-[calc(100vh-6rem)] -mb-24 della sottovista Chat).
  const immersiveSubView = praticaSubView === "esercizi" || praticaSubView === "interrogazione";
  // 🧭 P38: anche il Livello 2 (percorso a ramo) è full-screen → navbar nascosta.
  const hideNavbar = immersiveSubView || courseViewState === "branch";
  useEffect(() => {
    onFullscreenChange?.(hideNavbar);
  }, [hideNavbar, onFullscreenChange]);
  // Se la stanza si smonta con la barra nascosta (es. cambio scheda forzato
  // dagli eventi dell'agente), la navigazione torna sempre visibile.
  useEffect(() => () => {
    onFullscreenChange?.(false);
  }, [onFullscreenChange]);

  // P42 — passo del bottom sheet: "select" (scelta modalità, ~88% del viewport)
  // → "active" (sessione in corso, schermo intero). Si resetta a ogni apertura.
  const [drawerStep, setDrawerStep] = useState<"select" | "active">("select");
  const openPractice = (sub: "esercizi" | "interrogazione") => {
    if (praticaSubView) return; // guardia anti doppio tocco
    setDrawerStep("select");
    setPraticaSubView(sub);
  };
  const closePratica = () => {
    setPraticaSubView(null);
    setDrawerStep("select");
  };
  // 💬 P39: seme della Chat — la PromptBar semina il primo messaggio, la
  // sottovista Chat lo recapita con il flusso di invio già esistente.
  const [chatSeed, setChatSeed] = useState<{ text: string; requestId: number } | null>(null);
  const openChat = (text?: string) => {
    const t = typeof text === "string" ? text.trim() : "";
    if (t) setChatSeed({ text: t, requestId: Date.now() });
    setPraticaSubView("chat");
  };
  const [isCoursePickerOpen, setIsCoursePickerOpen] = useState(false);
  const [activeModuleIndex, setActiveModuleIndex] = useState<number | null>(null);
  const [activeLessonIndex, setActiveLessonIndex] = useState<number | null>(null);
  const [activeContextId, setActiveContextId] = useState<string | null>(null);
  // 🔖 P10a: segnalibro nel cloud — l'app ricorda l'ultimo percorso VISTO
  // (non solo l'ultimo generato), condiviso fra tutti i dispositivi.
  const [lastViewedStored, setLastViewedStored] = useState<string | null>(null);
  const [lastViewedLoaded, setLastViewedLoaded] = useState(false);
  const [showFinalTest, setShowFinalTest] = useState(false);
  const [finalTestExercises, setFinalTestExercises] = useState<Exercise[]>([]);
  const [isLoadingFinalTest, setIsLoadingFinalTest] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const push = usePushNotifications();
  const deleteContextMutation = useDeleteFileContext();

  // Rate limiting beta: 5 mini-lezioni gratuite per utente.
  // Le lezioni dei contesti demo NON contano nel limite.
  const usageQuery = useGenerationUsage();
  const usage = usageQuery.data;
  const invalidateUsage = useInvalidateGenerationUsage();
  const limitReached = !!usage && !usage.unlimited && usage.remaining <= 0;

  // Tracciamento delle generazioni di lezione in volo per evitare doppie chiamate
  // sullo stesso (contextId, lessonIndex) durante refetch della query.
  const inflightLessonsRef = useRef<Set<string>>(new Set());

  // === React Query: contesti + lezioni cached (5 min) ===
  const contextsQuery = useStudyContextsQuery();
  const allContexts = contextsQuery.data ?? [];

  // Determina contextId effettivo
  useEffect(() => {
    if (selectedContextId) setActiveContextId(selectedContextId);
  }, [selectedContextId]);

  // 🔖 P10a: carica il segnalibro dal profilo (una volta sola)
  useEffect(() => {
    if (!currentUser) return;
    let alive = true;
    supabase
      .from("user_profiles")
      .select("last_studio_context_id")
      .eq("user_id", currentUser)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) console.error("[P10a] lettura segnalibro fallita:", error);
        setLastViewedStored((data?.last_studio_context_id as string | null) ?? null);
        setLastViewedLoaded(true);
      });
    return () => { alive = false; };
  }, [currentUser]);

  useEffect(() => {
    if (allContexts.length === 0) return;
    // 🔖 P11a CORSIA DEL SEGNALIBRO: l'elenco dei percorsi arriva dalla cache
    // (istantaneo) ma il segnalibro dal cloud arriva dopo. Scegliere il default
    // ORA farebbe vincere sempre "il primo della lista" = l'ultimo GENERATO
    // (è il bug che hai visto): aspettiamo che il segnalibro sia arrivato.
    if (!lastViewedLoaded) return;
    const availableIds = new Set(allContexts.map((c) => c.id));
    if (selectedContextId && !availableIds.has(selectedContextId)) {
      onClearContext?.();
    }
    if (!selectedContextId && (!activeContextId || !availableIds.has(activeContextId))) {
      // 🔖 P10a: riparti dall'ultimo percorso VISTO (se esiste ancora), non dal più recente
      const remembered = lastViewedLoaded && lastViewedStored && availableIds.has(lastViewedStored)
        ? lastViewedStored
        : null;
      setActiveContextId(remembered ?? allContexts[0].id);
    }
  }, [allContexts, selectedContextId, activeContextId, onClearContext, lastViewedLoaded, lastViewedStored]);

  const effectiveContextId =
    (selectedContextId && allContexts.some((c) => c.id === selectedContextId) && selectedContextId) ||
    (activeContextId && allContexts.some((c) => c.id === activeContextId) && activeContextId) ||
    // 🔖 P11a: niente ripiego "ultimo generato" prima che il segnalibro sia arrivato
    (lastViewedLoaded ? allContexts[0]?.id : null) ||
    null;

  const activeContext = allContexts.find((c) => c.id === effectiveContextId) || null;

  // 🔖 P10a: salva il segnalibro quando cambia il percorso aperto (silenzioso)
  useEffect(() => {
    if (!currentUser || !lastViewedLoaded || !effectiveContextId) return;
    if (effectiveContextId === lastViewedStored) return;
    setLastViewedStored(effectiveContextId);
    supabase
      .from("user_profiles")
      .update({ last_studio_context_id: effectiveContextId })
      .eq("user_id", currentUser)
      .then(({ error }) => { if (error) console.error("[P10a] salvataggio segnalibro fallito:", error); });
  }, [currentUser, effectiveContextId, lastViewedLoaded, lastViewedStored]);
  const contextFileName = activeContext?.file_name || null;
  // 🌲 P24 — accento dinamico: il colore della MATERIA del percorso attivo
  // guida badge, barre, nodi e callout (--subject-accent). Quando non c'è
  // contesto (o si esce da Studio) l'hook ripristina il tema neutro.
  useSubjectAccent(contextFileName ? getSubjectAccent(contextFileName) : null);
  const contextStatus = activeContext?.processing_status || null;
  const contextErrorMessage = activeContext?.error_message || "Errore durante l'elaborazione del PDF. Ricarica il file e riprova.";
  const isDemoContext = !!activeContext?.is_demo;
  // Il limite è effettivo solo per percorsi NON demo
  const generationBlocked = limitReached && !isDemoContext;

  // ── Stato persistente di generazione (sopravvive a chiusura app) ──
  const generationStatus = activeContext?.generation_status ?? "idle";
  const generationProgress = activeContext?.generation_progress ?? {};
  const isGenerating = localStarting || generationStatus === "generating";
  const generationStep = (generationProgress.step as
    | "analyzing"
    | "creating-index"
    | "generating-lessons"
    | "complete") || "creating-index";
  const generationTotalLessons = generationProgress.totalLessons ?? 0;
  const generationLessonCount = generationProgress.generatedCount ?? 0;
  // 🏭 P10b: il cantiere del modulo in lavorazione (null = fabbrica ferma).
  const moduleJob = generationProgress.moduleGeneration ?? null;

  // Quando il backend completa, ricarica le lezioni e mostra un toast.
  useEffect(() => {
    if (generationStatus === "completed") {
      invalidateList(effectiveContextId);
      invalidateContexts();
    } else if (generationStatus === "failed" && activeContext?.generation_error) {
      toast({
        title: "Generazione non riuscita",
        description: activeContext.generation_error,
        variant: "destructive",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationStatus, effectiveContextId]);

  const lessonsQuery = useLessonsQuery(effectiveContextId);
  // Reference stabile (useMemo): i useMemo che dipendono da `lessons` non
  // ricalcolano a ogni render quando i dati non sono cambiati.
  const lessons: LessonMeta[] = useMemo(
    () => lessonsQuery.data?.lessons ?? [],
    [lessonsQuery.data?.lessons],
  );
  const cachedCurrentIndex = lessonsQuery.data?.currentIndex ?? 0;
  const updateProgress = useUpdateLessonProgress(effectiveContextId);
  const { invalidateList, invalidateContexts, setLessonsList } = useLessonsCacheControls();
  const queryClient = useQueryClient(); // ⚡ P16: la manopola della dispensa

  // 🚦 Bridging: dopo che il backend segna 'completed', le lezioni potrebbero
  // non essere ancora arrivate al client. Manteniamo uno stato "settling" per
  // evitare che l'utente veda lampeggiare la schermata "Nessuna lezione" tra
  // la fine della generazione e l'arrivo del refetch.
  const [postCompleteSettling, setPostCompleteSettling] = useState(false);
  useEffect(() => {
    if (generationStatus === "completed") {
      setPostCompleteSettling(true);
      // Forza il refetch immediato e sblocca quando arrivano i dati o dopo timeout.
      lessonsQuery.refetch().finally(() => setPostCompleteSettling(false));
      const t = window.setTimeout(() => setPostCompleteSettling(false), 6000);
      return () => window.clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generationStatus, effectiveContextId]);

  // 🌲 P24 — percentuale della fabbrica per l'eroe del percorso
  const generationPercent =
    generationStep === "analyzing" ? 15
    : generationStep === "creating-index" ? 35
    : generationStep === "generating-lessons" ? Math.min(95, 35 + ((generationLessonCount / Math.max(generationTotalLessons, 1)) * 60))
    : 100;

  // Sincronizza l'indice corrente con quello del cloud al primo load di un context.
  // Per un nuovo PDF la progressione è separata, quindi parte da 0.
  useEffect(() => {
    setCurrentLessonIndex(cachedCurrentIndex);
  }, [effectiveContextId, cachedCurrentIndex]);

  // 🧭 P38 — cambio corso: si riparte dalla Home Studio (Livello 0).
  useEffect(() => {
    setCourseViewState("overview");
    setActiveModuleIndex(null);
  }, [effectiveContextId]);

  // Spinner SOLO al primo fetch (nessuna cache disponibile)
  const isLoading = hasFiles && lessonsQuery.isLoading && lessons.length === 0;
  const showLessonsSkeleton = useDelayedLoading(isLoading, 100);

  useEffect(() => { if (lessons.length === 0) return; setCurrentLessonIndex((idx) => { if (idx < 0) return 0; if (idx > lessons.length - 1) return lessons.length - 1; return idx; }); }, [lessons.length]);
  // ⚠️ NESSUNA auto-generazione a cascata. Le lezioni vengono generate SOLO on-demand:
  //   - quando l'utente apre una lezione (handleSelectLesson)
  //   - quando l'utente passa alla "prossima" (handleNext), max 1 in anticipo
  // Concorrenza: massimo UNA richiesta in volo (vedi inflightLessonsRef + isGeneratingLesson).
  useEffect(() => { onFullscreenChange?.(hideNavbar || activeLessonIndex !== null || showFinalTest || moduleScreen !== null); }, [hideNavbar, activeLessonIndex, showFinalTest, moduleScreen, onFullscreenChange]);

  const refetchLessons = async () => {
    invalidateContexts();
    invalidateList(effectiveContextId);
  };

  useEffect(() => {
    if (contextStatus !== "pending" && contextStatus !== "processing") return;
    const timer = window.setInterval(refetchLessons, 2500);
    return () => window.clearInterval(timer);
  }, [contextStatus, effectiveContextId]);

  // 🔁 Fallback di polling durante la generazione: se la sottoscrizione Realtime
  // non recapita gli update (es. replication non attiva sulla tabella), forziamo
  // comunque il refresh del contesto + lista lezioni così l'UI si aggiorna sulla
  // stessa scheda senza dover ricaricare.
  useEffect(() => {
    // 🏭 P10b: il polling gira anche a fabbrica attiva (moduleJob), così la
    // barra della sala d'attesa avanza e i quadratini si accendono uno a uno.
    if (!isGenerating && !moduleJob) return;
    const timer = window.setInterval(() => {
      invalidateContexts();
      invalidateList(effectiveContextId);
    }, 2500);
    return () => window.clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating, moduleJob, effectiveContextId]);

  const handleGenerateLessons = async () => {
    if (!currentUser) return;
    if (generationBlocked) {
      toast({ title: "Limite raggiunto", description: FREE_LIMIT_MESSAGE, variant: "destructive" });
      return;
    }
    if (contextStatus === "pending" || contextStatus === "processing") {
      toast({ title: "PDF in elaborazione", description: "Attendi il completamento dell'analisi prima di generare il percorso." });
      await refetchLessons();
      return;
    }
    if (contextStatus === "failed") {
      toast({ title: "PDF non elaborabile", description: contextErrorMessage, variant: "destructive" });
      return;
    }
    if (isGenerating) {
      toast({ title: "Generazione già in corso", description: "Stiamo già creando il tuo percorso. Attendi qualche istante." });
      return;
    }
    setLocalStarting(true);
    try {
      // Chiedi (una sola volta) il permesso notifiche: avviseremo a fine generazione.
      if (push.supported && push.permission === "default") {
        push.subscribe().catch(() => {});
      } else if (push.supported && push.permission === "granted") {
        push.subscribe().catch(() => {});
      }
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const contextId = selectedContextId || activeContextId;
      if (!contextId) throw new Error("Seleziona prima un documento.");

      // Il backend risponde 202 e prosegue in background (EdgeRuntime.waitUntil).
      // Lo stato della generazione è leggibile via realtime su `study_contexts`.
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, contextId, language: currentLanguage() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore nella generazione");
      // Forza refetch del contesto: lo stato dovrebbe già essere 'generating'
      await refetchLessons();
    } catch (error) {
      console.error("Error generating lessons:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella generazione", variant: "destructive" });
    } finally {
      setLocalStarting(false);
    }
  };

  const generateLessonContent = async (lessonIndex: number) => {
    if (!currentUser) return null;
    // Blocca preventivamente quando il limite è raggiunto e il contesto NON è demo.
    if (generationBlocked) {
      toast({ title: "Limite raggiunto", description: FREE_LIMIT_MESSAGE, variant: "destructive" });
      return null;
    }
    const contextId = selectedContextId || activeContextId;
    const key = `${contextId ?? "null"}::${lessonIndex}`;
    // 🛑 LIMITE DI CONCORRENZA: una sola richiesta di generazione in volo nell'intera app.
    if (inflightLessonsRef.current.size > 0) {
      console.warn("[generateLessonContent] richiesta ignorata: un'altra è già in corso", { lessonIndex });
      return null;
    }
    inflightLessonsRef.current.add(key);
    setIsGeneratingLesson(true);
    try {
      const body: Record<string, unknown> = { userId: currentUser, action: "generateLesson", lessonIndex };
      if (contextId) body.contextId = contextId;
      // edgeFetch ha retry esponenziale su 429/502/503/504 e su "Failed to fetch"
      const data = await edgeFetch<{ lesson?: Lesson }>("generate-lessons", body);
      if (data.lesson) {
        setLessonsList(effectiveContextId, (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            lessons: prev.lessons.map((l) => (l.lesson_order === lessonIndex ? (data.lesson as Lesson) : l)),
          };
        });
      }
      // ⚡ P16: la lezione appena tornita va dritta anche sullo scaffale
      // della singola — riaprirla non costa nemmeno un viaggio.
      if (data.lesson && effectiveContextId) {
        queryClient.setQueryData(
          lessonsKeys.lesson(currentUser, effectiveContextId, lessonIndex),
          data.lesson,
        );
      }
      // Aggiorna il contatore d'uso lato client (anche se demo per rinfrescare).
      invalidateUsage();
      return data.lesson ?? null;
    } catch (error) {
      console.error("Error generating lesson:", error);
      const msg = error instanceof Error ? error.message : "Errore nella generazione";
      if (msg === FREE_LIMIT_MESSAGE) {
        // Forza il refresh: il limite è stato applicato server-side
        invalidateUsage();
      }
      // Il network-blip transient è già stato ritentato da edgeFetch; se siamo qui è un vero errore
      toast({ title: "Errore", description: msg, variant: "destructive" });
      return null;
    } finally {
      inflightLessonsRef.current.delete(key);
      setIsGeneratingLesson(false);
    }
  };

  // 🏭 P10b: avvia la fabbrica del modulo (lavoro SERVER in background).
  // silent = niente sala d'attesa (auto-partenza a fine modulo).
  // Ritorna true se il modulo è (o era già) in lavorazione.
  const startModuleGeneration = async (moduleIndex: number, opts?: { silent?: boolean }): Promise<boolean> => {
    if (!currentUser) return false;
    if (generationBlocked) {
      toast({ title: "Limite raggiunto", description: FREE_LIMIT_MESSAGE, variant: "destructive" });
      return false;
    }
    // Un cantiere è già attivo: niente accavalli, al massimo apri la sala d'attesa.
    if (moduleJob) {
      if (!opts?.silent) setModuleScreen({ moduleIndex });
      return true;
    }
    try {
      // Pre-registra le notifiche (best-effort): a fine modulo arriva la push.
      if (push.supported) push.subscribe().catch(() => {});
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const contextId = selectedContextId || activeContextId;
      if (!contextId) return false;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, action: "generateModule", moduleIndex, contextId, language: currentLanguage() }) });
      const data = await response.json().catch(() => ({}));
      // 409 = la fabbrica sta già lavorando: non è un errore, apri la sala d'attesa.
      if (!response.ok && response.status !== 409) {
        throw new Error((data as { error?: string }).error || "Errore nella generazione del modulo");
      }
      if (!opts?.silent) setModuleScreen({ moduleIndex });
      invalidateContexts();
      return true;
    } catch (error) {
      console.error("Error starting module generation:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella generazione del modulo", variant: "destructive" });
      return false;
    }
  };

  // 🏭 P10b: la fabbrica ha FINITO → chiudi la sala d'attesa e apri la prima
  // lezione del modulo (ora tornita), SOLO se l'utente è ancora nella schermata
  // di quel modulo. Se è tornato ai moduli, la card mostra "Riprendi".
  useEffect(() => {
    if (!moduleScreen || moduleJob) return;
    const target = moduleScreen.moduleIndex;
    setModuleScreen(null);
    void (async () => {
      const fresh = await lessonsQuery.refetch();
      const freshLessons = fresh.data?.lessons ?? [];
      const firstIdx = moduleRange(target).start;
      const first = freshLessons[firstIdx];
      const stillOnModule = courseViewState === "branch" && activeModuleIndex === target;
      if (first?.is_generated) {
        if (stillOnModule) {
          setActiveLessonIndex(firstIdx);
          if (firstIdx > cachedCurrentIndex) updateProgress.mutate(firstIdx);
        }
        toast({ title: `Modulo ${target + 1} pronto!`, description: "Le nuove lezioni ti aspettano: buono studio!" });
      } else {
        toast({ title: "Modulo non completato", description: "Non tutte le lezioni sono state create. Riprova dalla prima lezione del modulo.", variant: "destructive" });
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleJob, moduleScreen, courseViewState, activeModuleIndex]);

  const handleNext = async () => {
    if (currentLessonIndex < lessons.length - 1) {
      const newIndex = currentLessonIndex + 1;
      const nextLesson = lessons[newIndex];
      if (!nextLesson) return;
      if (!nextLesson.is_generated) await generateLessonContent(newIndex);
      setCurrentLessonIndex(newIndex);
      // Avanzamento reale: persiste il nuovo massimo raggiunto.
      if (newIndex > cachedCurrentIndex) updateProgress.mutate(newIndex);
    } else { handleStartFinalTest(); }
  };

  const handleStartFinalTest = async () => {
    if (!currentUser) return;
    setIsLoadingFinalTest(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const contextId = selectedContextId || activeContextId;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lessons`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, action: "generateFinalTest", ...(contextId ? { contextId } : {}), language: currentLanguage() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Errore generazione test");
      setFinalTestExercises(data.exercises || []);
      setShowFinalTest(true);
    } catch (error) { console.error("Error generating final test:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella generazione del test", variant: "destructive" });
    } finally { setIsLoadingFinalTest(false); }
  };

  const handleSelectLesson = async (index: number) => {
    const selectedLesson = lessons[index];
    if (!selectedLesson) return;
    if (!selectedLesson.is_generated) await generateLessonContent(index);
    // ⚡ P16: scaldi il pacco di QUELLA lezione mentre la vista cambia —
    // quando il tornello le chiede il contenuto, è (quasi) già sul bancone.
    if (effectiveContextId) {
      void queryClient.prefetchQuery({
        queryKey: lessonsKeys.lesson(currentUser, effectiveContextId, index),
        queryFn: () => fetchLessonFull(currentUser as string, effectiveContextId, index),
      });
    }
    setCurrentLessonIndex(index);
    // Aggiorna i progressi solo in avanti: tornare indietro non riduce il completamento.
    if (index > cachedCurrentIndex) updateProgress.mutate(index);
  };

  // ── 🌲 P24: comandi del corso, usati dal banner (PathHero) ──
  const handleSelectCourse = (contextId: string) => {
    // 📌 P17: lo spillo del "vai a quel corso" vale solo per l'arrivo —
    // toccare un altro corso a mano lo stacca SUBITO (era il bug del comando ignorato).
    onClearContext?.();
    setActiveContextId(contextId);
    setActiveLessonIndex(null);
    setCurrentLessonIndex(0);
    // ⚡ P16: il furgoncino parte SUBITO, prima ancora di ridisegnare:
    // quando Studio torna su questo percorso, la lista è quasi sempre pronta.
    void queryClient.prefetchQuery({
      queryKey: lessonsKeys.list(currentUser, contextId),
      queryFn: () => fetchLessonsList(currentUser, contextId),
    });
  };

  const activeCourseId = activeContextId ?? effectiveContextId;

  // ── 🧭 P38: navigazione progressiva (overview ↔ moduli ↔ ramo) ──
  const backToModules = () => {
    setModuleScreen(null);
    setActiveModuleIndex(null);
    setCourseViewState("modules");
  };
  // Livello 1 → Livello 0: "Torna a Studio" ripristina la Home Studio senza
  // perdere il corso selezionato.
  const backToOverview = () => {
    setModuleScreen(null);
    setActiveModuleIndex(null);
    setCourseViewState("overview");
  };
  // "Continua" (panoramica): scende di livello e apre la vista moduli.
  const goToModules = () => setCourseViewState("modules");
  // "Riprendi lezione" (vista moduli): la prima lezione non completata, lo
  // stesso segnalibro cloud già usato dalla card percorso.
  const resumeCurrentLesson = () => {
    const l = lessons[currentLessonIndex];
    if (l?.is_generated) setActiveLessonIndex(currentLessonIndex);
  };

  const openModule = async (moduleIndex: number) => {
    setActiveModuleIndex(moduleIndex);
    setCourseViewState("branch");
    window.scrollTo(0, 0); // la barra compatta e il ramo partono dall'alto
    const modLessons = lessonsInModule(lessons, moduleIndex);
    // Modulo già in fabbrica → schermata "in generazione" (arma l'apertura a fine job).
    if (moduleJob && moduleJob.moduleIndex === moduleIndex) {
      setModuleScreen({ moduleIndex });
      return;
    }
    // Modulo tutto da costruire → la fabbrica parte DA SOLA e mostriamo la costruzione.
    if (isModuleFullyMissing(modLessons)) {
      setModuleScreen({ moduleIndex });
      void startModuleGeneration(moduleIndex, { silent: true });
      return;
    }
    // Modulo pronto (o parzialmente): il percorso si apre e le eventuali
    // lezioni mancanti si riparano al tocco, come sempre.
  };

  // Le card della schermata 1: stato, titolo, avanzamento per ogni modulo.
  const modules = useMemo<ModuleCardData[]>(() => {
    const count = moduleCount(lessons.length);
    const result: ModuleCardData[] = [];
    for (let m = 0; m < count; m++) {
      const { start, end } = moduleRange(m);
      const modWithPos = lessons
        .map((l, pos) => ({ l, pos }))
        .filter(({ l, pos }) => {
          const order = l.lesson_order ?? pos;
          return order >= start && order <= end;
        });
      const total = modWithPos.length;
      const doneCount = modWithPos.filter(({ pos }) => pos < currentLessonIndex).length;
      const containsCurrent = modWithPos.some(({ pos }) => pos === currentLessonIndex);
      const fullyMissing = total > 0 && modWithPos.every(({ l }) => !l.is_generated);
      const isGen = moduleJob?.moduleIndex === m;
      let state: ModuleCardData["state"];
      if (isGen) state = "gen";
      else if (total > 0 && doneCount === total) state = "done";
      else if (containsCurrent) state = "cur";
      else if (fullyMissing) state = "lock";
      else state = "ready";
      result.push({
        index: m,
        title: moduleTitleFor(m, activeContext?.module_titles ?? null, modWithPos[0]?.l.title).replace(/^Modulo \d+ · /, ""),
        doneCount,
        total,
        state,
        genPercent:
          isGen && moduleJob
            ? Math.round(((moduleJob.generatedCount ?? 0) / Math.max(moduleJob.totalLessons ?? total, 1)) * 100)
            : undefined,
      });
    }
    return result;
  }, [lessons, currentLessonIndex, moduleJob, activeContext?.module_titles]);

  const handleRegenerateCourse = async () => {
    await handleGenerateLessons();
  };

  const handleOpenMaterials = () => {
    if (effectiveContextId) onOpenCourseMaterials?.(effectiveContextId);
  };

  const handleRenameCourse = async (newName: string) => {
    const ctx = allContexts.find((c) => c.id === activeCourseId);
    if (!ctx) return;
    const original = ctx.file_name || "";
    const prefix = original.startsWith("🌐") ? "🌐 " : "";
    const suffix = /\.pdf$/i.test(original) ? ".pdf" : "";
    const finalName = `${prefix}${newName}${suffix}`;
    try {
      const { error } = await supabase
        .from("study_contexts")
        .update({ file_name: finalName })
        .eq("id", ctx.id);
      if (error) throw error;
      invalidateContexts();
      toast({ title: "Corso rinominato" });
    } catch (err) {
      console.error("Error renaming course:", err);
      toast({ title: "Errore", description: "Impossibile rinominare il corso", variant: "destructive" });
    }
  };

  const handleDeleteCourse = async () => {
    if (!activeCourseId) return;
    try {
      await deleteContextMutation.mutateAsync(activeCourseId);
      toast({ title: "Corso eliminato" });
      setActiveContextId(null);
      onClearContext?.();
    } catch (err) {
      toast({ title: "Errore", description: err instanceof Error ? err.message : "Impossibile eliminare", variant: "destructive" });
    }
  };

  // ── 🌲 P24: azioni sulle lezioni (usate dal percorso) ──
  const handleSelectFromPath = async (index: number) => {
    const lesson = lessons[index];
    if (!lesson) return;
    // 🔒 P10c CANCELLO DEL VAGONE: finché la fabbrica lavora su QUESTO modulo,
    // solo la porta si apre → schermata in generazione.
    if (moduleJob && isInGatedModule(index, moduleJob.moduleIndex)) {
      if (isGateLesson(index, moduleJob.moduleIndex)) {
        setModuleScreen({ moduleIndex: moduleJob.moduleIndex });
        setActiveModuleIndex(moduleJob.moduleIndex);
        setCourseViewState("branch");
      } else {
        toast({ title: "Modulo in preparazione", description: "Questa si sblocca quando TUTTO il modulo è pronto: ti avvisiamo noi con una notifica!" });
      }
      return;
    }
    if (lesson.is_generated) {
      setActiveLessonIndex(index);
      if (index > cachedCurrentIndex) updateProgress.mutate(index);
      return;
    }
    // 🏭 P10b: la lezione non è pronta → ragiona a MODULI, non a singola.
    const mIdx = moduleIndexOf(index);
    if (moduleJob) {
      setModuleScreen({ moduleIndex: moduleJob.moduleIndex });
      setActiveModuleIndex(moduleJob.moduleIndex);
      setCourseViewState("branch");
      return;
    }
    if (isModuleFullyMissing(lessonsInModule(lessons, mIdx))) {
      // Vagone tutto da costruire → la fabbrica parte e vediamo la costruzione.
      setModuleScreen({ moduleIndex: mIdx });
      setActiveModuleIndex(mIdx);
      setCourseViewState("branch");
      await startModuleGeneration(mIdx, { silent: true });
    } else {
      // Vagone parzialmente pronto: ripara solo il buco, come abbiamo sempre fatto.
      await generateLessonContent(index);
      setActiveLessonIndex(index);
      if (index > cachedCurrentIndex) updateProgress.mutate(index);
    }
  };

  // La Home può chiedere di riaprire una lezione precisa. Aspettiamo che il
  // contesto e la lista siano disponibili, poi apriamo direttamente il lettore.
  useEffect(() => {
    if (!lessonLaunch) return;
    if (handledLessonLaunchRef.current === lessonLaunch.requestId) return;
    if (effectiveContextId !== lessonLaunch.contextId || lessons.length === 0) return;

    const index = Math.max(0, Math.min(lessonLaunch.lessonIndex, lessons.length - 1));
    const lesson = lessons[index];
    handledLessonLaunchRef.current = lessonLaunch.requestId;
    setCurrentLessonIndex(index);
    setActiveModuleIndex(moduleIndexOf(index));
    setCourseViewState("branch");
    if (lesson?.is_generated) {
      setActiveLessonIndex(index);
      if (index > cachedCurrentIndex) updateProgress.mutate(index);
    }
    onLessonLaunchHandled?.();
  }, [lessonLaunch, effectiveContextId, lessons, cachedCurrentIndex, updateProgress, onLessonLaunchHandled]);

  const handleRegenerateLesson = async (index: number) => {
    const lesson = lessons[index];
    if (!lesson) return;
    setLessonsList(effectiveContextId, (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lessons: prev.lessons.map((l) =>
          l.id === lesson.id ? { ...l, is_generated: false } : l,
        ),
      };
    });
    try {
      await supabase
        .from("mini_lessons")
        .update({ is_generated: false, explanation: "", concept: "", example: null, exercises: [] })
        .eq("id", lesson.id);
    } catch (err) {
      console.error("Error resetting lesson for regenerate:", err);
    }
    const fresh = await generateLessonContent(index);
    if (fresh) {
      toast({ title: "Lezione rigenerata", description: "I contenuti sono stati aggiornati." });
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    const lessonOrder = lessons.find((l) => l.id === lessonId)?.lesson_order;
    try {
      const { error } = await supabase.from("mini_lessons").delete().eq("id", lessonId);
      if (error) throw error;
      setLessonsList(effectiveContextId, (prev) => {
        if (!prev) return prev;
        const remaining = prev.lessons.filter((l) => l.id !== lessonId);
        return { ...prev, lessons: remaining };
      });
      toast({ title: "Lezione eliminata" });
      if (lessonOrder !== undefined && currentLessonIndex >= lessons.length - 1) {
        setCurrentLessonIndex(Math.max(0, lessons.length - 2));
      }
      await refetchLessons();
    } catch (err) {
      console.error("Error deleting lesson:", err);
      toast({ title: "Errore", description: "Impossibile eliminare la lezione", variant: "destructive" });
    }
  };

  const handleRenameLesson = async (lessonId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from("mini_lessons")
        .update({ title: newTitle })
        .eq("id", lessonId);
      if (error) throw error;
      setLessonsList(effectiveContextId, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          lessons: prev.lessons.map((l) => (l.id === lessonId ? { ...l, title: newTitle } : l)),
        };
      });
      toast({ title: "Titolo aggiornato" });
    } catch (err) {
      console.error("Error renaming lesson:", err);
      toast({ title: "Errore", description: "Impossibile rinominare la lezione", variant: "destructive" });
    }
  };

  if (!hasFiles) return <EmptyState onUploadClick={onUploadClick} />;

  // 🌲 P24 — la generazione NON sostituisce più la schermata: vive nello spazio.
  // Nome del percorso senza estensione né prefissi emoji (per l'eroe).
  const heroTitle = contextFileName ? cleanCourseName(contextFileName) || null : null;

  // Prima generazione (nessuna lezione ancora): eroe-fabbrica + pannello fasi.
  if (isGenerating && lessons.length === 0) {
    return (
      <>
        <PathHero
          title={heroTitle}
          completedCount={0}
          totalLessons={0}
          isGenerating
          progressPercent={generationPercent}
          courses={allContexts}
          activeCourseId={activeCourseId}
          onSelectCourse={handleSelectCourse}
          onSelectingChange={setIsCoursePickerOpen}
          onRegenerate={handleRegenerateCourse}
          onOpenMaterials={handleOpenMaterials}
          onRenameCourse={handleRenameCourse}
          onDeleteCourse={handleDeleteCourse}
          hasNewMaterial={!!activeContext?.new_material_pending}
          generationBlocked={generationBlocked}
          freeLimitMessage={FREE_LIMIT_MESSAGE}
          isRegenerating={isGenerating || !!moduleJob}
        />
        <GenerationProgress
          compact
          isGenerating={isGenerating}
          currentStep={generationStep}
          totalLessons={generationTotalLessons}
          generatedCount={generationLessonCount}
          fileName={contextFileName || undefined}
        />
        <p className="mx-4 mt-4 text-center text-xs text-muted-foreground leading-relaxed px-4 py-3 rounded-card bg-card">
          Puoi anche uscire dall'app: ti avvisiamo con una notifica appena è pronto.
        </p>
      </>
    );
  }

  // 🔖 P14: finché il segnalibro non è arrivato dal cloud NON si mostra la
  // lista "all" — era il flash di mezzo secondo dell'ultimo corso GENERATO.
  // Al suo posto: lo scheletro del sentiero, poi si apre quello giusto.
  if (hasFiles && !selectedContextId && !lastViewedLoaded && allContexts.length > 0) {
    return <LessonsListSkeleton />;
  }

  // 🦴 P10a: l'orbe è SOLO per la generazione vera. L'attesa di un percorso già
  // esistente mostra lo scheletro del sentiero, come fanno Piano e Profilo.
  if (postCompleteSettling && lessons.length === 0) {
    return <LessonsListSkeleton />;
  }

  if (showLessonsSkeleton) {
    return <LessonsListSkeleton count={activeContext?.lesson_count} />;
  }
  if (isLoading) {
    return null;
  }

  if (lessons.length === 0) {
    const isPdfProcessing = contextStatus === "pending" || contextStatus === "processing";
    const isPdfFailed = contextStatus === "failed";

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-6 text-center animate-fade-up">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
          isPdfFailed ? "bg-error-container" : "bg-card shadow-level-1"
        }`}>
          {isPdfProcessing ? (
            <Loader2 className="w-8 h-8 text-foreground animate-spin" />
          ) : isPdfFailed ? (
            <RefreshCw className="w-8 h-8 text-destructive" strokeWidth={1.75} />
          ) : (
            <Sparkles className="w-8 h-8 text-foreground" strokeWidth={1.5} />
          )}
        </div>
        <div>
          <h3 className="font-display text-xl font-bold mb-2">
            {isPdfProcessing ? "Elaborazione PDF in corso..." : 
             isPdfFailed ? "Errore nell'elaborazione" :
             "Nessuna lezione disponibile"}
          </h3>
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
            {isPdfProcessing ? "Attendi qualche secondo mentre analizziamo il tuo documento." :
             isPdfFailed ? contextErrorMessage :
             "L'AI analizzerà i tuoi materiali e creerà un percorso di mini-lezioni personalizzato."}
          </p>
          {contextFileName && (
            <p className="text-xs text-foreground font-medium mt-3 bg-secondary inline-block px-3 py-1.5 rounded-full">{contextFileName}</p>
          )}
        </div>
        
        {isPdfProcessing ? (
          <Button onClick={refetchLessons} variant="outline" size="lg">
            <RefreshCw className="w-4 h-4 mr-2" />
            Aggiorna stato
          </Button>
        ) : (
          <Button onClick={handleGenerateLessons} disabled={isGenerating || generationBlocked} size="lg">
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analisi in corso...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Genera percorso</>
            )}
          </Button>
        )}
        {generationBlocked && !isPdfProcessing && (
          <p className="text-sm text-destructive max-w-sm bg-error-container/40 px-4 py-3 rounded-card">
            {FREE_LIMIT_MESSAGE}
          </p>
        )}
      </div>
    );
  }

  const currentLesson = activeLessonIndex !== null ? lessons[activeLessonIndex] : null;
  const allGenerated = lessons.length > 0 && lessons.every(l => l.is_generated);
  // 🧭 P38: titolo del modulo aperto, condiviso da barra compatta e ramo.
  const activeModuleTitle = activeModuleIndex != null
    ? moduleTitleFor(activeModuleIndex, activeContext?.module_titles ?? null, lessons[moduleRange(activeModuleIndex).start]?.title).replace(/^Modulo \d+ · /, "")
    : null;

  return (
    <>
      {praticaSubView ? (
        praticaSubView === "chat" ? (
          /* 💬 Chat: navbar VISIBILE — altezza calibrata per tenere il campo
             di testo sopra la barra fissa (stesso trucco già usato da Pratica). */
          <div className="flex h-[calc(100vh-6rem)] -mb-24 flex-col animate-fade-up">
            <SubViewHeader
              title="Chat col Tutor"
              courseTitle={heroTitle || contextFileName}
              onBack={closePratica}
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              <ChatView
                hasFiles={hasFiles}
                onUploadClick={onUploadClick}
                contextId={effectiveContextId}
                seedMessage={chatSeed}
                onSeedConsumed={() => setChatSeed(null)}
              />
            </div>
          </div>
        ) : (
          /* 🏋️ / 🎤 P43 — foglio che SCIVOLA dal basso (300ms) sopra lo Studio
             ancora montato e visibile, sfocato dal backdrop (mai nero pieno).
             In sessione sale a schermo intero; la X chiude tutto e il foglio
             riscende (AnimatePresence gestisce l'uscita). */
          <AnimatePresence>
          <SheetDrawer
            key={praticaSubView}
            title={praticaSubView === "esercizi" ? "Esercizi" : "Interrogazione"}
            step={drawerStep}
            onClose={closePratica}
          >
            {praticaSubView === "esercizi" ? (
              <EserciziView
                contextId={effectiveContextId}
                contextName={heroTitle || contextFileName}
                onSessionStart={() => setDrawerStep("active")}
              />
            ) : (
              <InterrogazioneView
                contextId={effectiveContextId}
                contextName={heroTitle || contextFileName}
                onSessionStart={() => setDrawerStep("active")}
              />
            )}
          </SheetDrawer>
          </AnimatePresence>
        )
      ) : (
        <>
      {/* ➕ P37 — Crea nuovo percorso: in cima, SOLO nella Home Studio. */}
      {courseViewState === "overview" && (
        <div className="studio-section-enter min-w-0 overflow-x-clip px-4 pt-3">
          <Button
            type="button"
            size="lg"
            onClick={onUploadClick}
            aria-label="Crea un nuovo percorso di studio"
            className="w-full rounded-full border border-white/10 bg-[#121214] text-white/90 shadow-tactile transition-all duration-200 hover:bg-[#1a1a1f] hover:shadow-card-active active:scale-[0.985]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Crea nuovo percorso
          </Button>
        </div>
      )}
      {/* 🧭 P43 — HERO e card compatta del modulo sono la MEDESIMA superficie:
          layoutId condiviso ("course-card-…", stessa tecnica del selettore
          corsi) → la card si comprime/espande con un morph fluido. Nei moduli
          resta STICKY: le schede scorrono sotto di lei. Il colore materia
          (CourseCardBackground "studio") resta IDENTICO in entrambi gli stati. */}
      <AnimatePresence mode="popLayout" initial={false}>
        {courseViewState === "branch" ? (
          <motion.div
            key="module-head"
            className="sticky top-0 z-20 bg-background px-4 pb-2.5 pt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <ModuleHeaderCard
              courseTitle={heroTitle || contextFileName}
              moduleIndex={activeModuleIndex ?? 0}
              moduleTitle={activeModuleTitle ?? "Modulo"}
              subjectColor={getSubjectAccent(contextFileName ?? "")}
              layoutId={`course-card-${activeCourseId}`}
              onClose={backToModules}
            />
          </motion.div>
        ) : (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.18 } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className={courseViewState === "modules"
              ? "studio-section-enter min-w-0 overflow-x-clip sticky top-0 z-20 bg-background"
              : "studio-section-enter min-w-0 overflow-x-clip"}
          >
      <PathHero
        variant={courseViewState === "modules" ? "resume" : "full"}
        onCloseModules={courseViewState === "modules" ? backToOverview : undefined}
        title={heroTitle}
        completedCount={Math.max(0, Math.min(currentLessonIndex, lessons.length))}
        totalLessons={lessons.length}
        isGenerating={isGenerating}
        progressPercent={generationPercent}
        canResume={courseViewState === "modules"
          ? !!lessons[currentLessonIndex]?.is_generated && !isGenerating
          : lessons.length > 0}
        onResume={courseViewState === "modules" ? resumeCurrentLesson : goToModules}
        courses={allContexts}
        activeCourseId={activeCourseId}
        onSelectCourse={handleSelectCourse}
        onSelectingChange={setIsCoursePickerOpen}
        onRegenerate={handleRegenerateCourse}
        onOpenMaterials={handleOpenMaterials}
        onRenameCourse={handleRenameCourse}
        onDeleteCourse={handleDeleteCourse}
        hasNewMaterial={!!activeContext?.new_material_pending}
        generationBlocked={generationBlocked}
        freeLimitMessage={FREE_LIMIT_MESSAGE}
        isRegenerating={isGenerating || !!moduleJob}
      />
          </motion.div>
        )}
      </AnimatePresence>
      {/* 🧩 P39 — due card di pratica affiancate (accento del corso attivo) +
          barra prompter AI: SOLO nella Home Studio, con pb-32 che tiene tutto
          sopra la barra di navigazione fissa. */}
      {courseViewState === "overview" && !isCoursePickerOpen && modules.length > 0 && (
        <div className="animate-fade-up">
          <PracticeLaunchers
            onOpenEsercizi={() => openPractice("esercizi")}
            onOpenInterrogazione={() => openPractice("interrogazione")}
          />
          <PromptBar onSend={(text) => openChat(text)} onOpen={() => openChat()} />
        </div>
      )}
      {/* 🧭 P42 — lista dei moduli e albero delle lezioni si danno il cambio
          con un cross-animato (solo transform/opacity, 60fps). */}
      <AnimatePresence mode="wait" initial={false}>
        {courseViewState === "modules" && !isCoursePickerOpen && (
          <motion.div
            key="modules-list"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-10 min-w-0 overflow-x-clip"
          >
            <ModulesOverview
              modules={modules}
              onOpenModule={(idx) => void openModule(idx)}
            />
          </motion.div>
        )}
        {courseViewState === "branch" && (
          <motion.div
            key="branch-tree"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative z-10 min-w-0 overflow-x-clip"
          >
            <ModulePath
              hideHeader
              moduleIndex={activeModuleIndex ?? 0}
              moduleTitle={activeModuleTitle ?? "Modulo"}
              lessons={lessons}
              currentIndex={currentLessonIndex}
              isGeneratingLesson={isGeneratingLesson}
              isModuleGenerating={!!moduleScreen && moduleScreen.moduleIndex === activeModuleIndex}
              genCount={moduleJob && moduleJob.moduleIndex === activeModuleIndex ? (moduleJob.generatedCount ?? 0) : 0}
              genTotal={moduleJob && moduleJob.moduleIndex === activeModuleIndex ? (moduleJob.totalLessons ?? MODULE_SIZE) : MODULE_SIZE}
              onBack={backToModules}
              onModuleCompleted={backToModules}
              onSelectLesson={(idx) => void handleSelectFromPath(idx)}
              showFinalTest={allGenerated}
              onStartFinalTest={handleStartFinalTest}
              isLoadingFinalTest={isLoadingFinalTest}
              onRegenerateLesson={handleRegenerateLesson}
              onDeleteLesson={handleDeleteLesson}
              onRenameLesson={handleRenameLesson}
            />
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}

      {activeLessonIndex !== null && currentLesson && currentLesson.is_generated && !isGeneratingLesson && (
        <FullscreenLessonGate
          meta={currentLesson}
          contextId={effectiveContextId ?? null}
          lessonNumber={activeLessonIndex + 1}
          totalLessons={lessons.length}
          onClose={() => setActiveLessonIndex(null)}
          onComplete={() => {
            const nextIndex = activeLessonIndex < lessons.length - 1 ? activeLessonIndex + 1 : activeLessonIndex;
            setCurrentLessonIndex(nextIndex);
            setActiveLessonIndex(null);
            if (nextIndex > cachedCurrentIndex) updateProgress.mutate(nextIndex);
            // 🌲 P24: finito l'ultimo passo di un modulo → torna alla schermata
            // dei moduli (il prossimo mostra "in generazione" se parte la fabbrica).
            if (nextIndex < lessons.length && isFirstOfModule(nextIndex)) {
              backToModules();
            }
            // 🏭 P10b IBRIDO: hai appena messo piede sul cancello di un vagone
            // tutto da costruire → la fabbrica parte DA SOLA (silenziosa: se poi
            // clicchi la lezione e non è pronta, si apre la schermata in generazione).
            if (
              nextIndex < lessons.length &&
              isFirstOfModule(nextIndex) &&
              !moduleJob &&
              !generationBlocked &&
              isModuleFullyMissing(lessonsInModule(lessons, moduleIndexOf(nextIndex)))
            ) {
              toast({ title: "Modulo in preparazione", description: `Sto già costruendo il modulo ${moduleIndexOf(nextIndex) + 1}: ti avviso con una notifica quando è pronto!` });
              void startModuleGeneration(moduleIndexOf(nextIndex), { silent: true });
            }
          }}
          isLastLesson={activeLessonIndex === lessons.length - 1}
          nextLessonId={
            activeLessonIndex < lessons.length - 1
              ? lessons[activeLessonIndex + 1]?.id ?? null
              : null
          }
        />
      )}

      {/* 🏭 P10b: la sala d'attesa della fabbrica (fallback: la schermata
          "in generazione" del percorso la sostituisce quando si è nella vista
          lezioni del modulo) */}
      {moduleScreen && courseViewState !== "branch" && (
        <ModuleGenerationScreen
          moduleIndex={moduleScreen.moduleIndex}
          moduleTitle={(activeContext?.module_titles?.[moduleScreen.moduleIndex] || null) ?? null}
          generatedCount={moduleJob && moduleJob.moduleIndex === moduleScreen.moduleIndex ? (moduleJob.generatedCount ?? 0) : 0}
          totalLessons={moduleJob && moduleJob.moduleIndex === moduleScreen.moduleIndex ? (moduleJob.totalLessons ?? MODULE_SIZE) : MODULE_SIZE}
          fileName={contextFileName}
          onCancel={() => setModuleScreen(null)}
        />
      )}

      {showFinalTest && finalTestExercises.length > 0 && (
        <FinalTest
          exercises={finalTestExercises}
          onClose={() => setShowFinalTest(false)}
          onComplete={() => { setShowFinalTest(false);
            backToModules();
            toast({ title: "Complimenti!", description: "Hai completato il percorso e il test finale!" }); }}
        />
      )}
    </>
  );
}
