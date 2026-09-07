import { useState, useEffect, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StudioView } from "@/components/studio/StudioView";
import { PianoView } from "@/components/piano/PianoView";
import { PraticaView } from "@/components/pratica/PraticaView";
import { CoreView } from "@/components/core/CoreView";
import { HomeView } from "@/components/home/HomeView";
import { UploadSheet } from "@/components/upload/UploadSheet";
import type { PraticaSubTab } from "@/components/pratica/PraticaView";
import { useUserData } from "@/hooks/useUserData";
import { useHasContentQuery, useLessonsCacheControls } from "@/hooks/useLessons";
import { useGenerationRealtime } from "@/hooks/useGenerationRealtime";
import { SplashScreen } from "@/components/shared/SplashScreen";
import { useSplashGate } from "@/hooks/useSplashGate";
import { useCognitiveProfile } from "@/hooks/useCognitiveProfile";
import { CognitiveOnboarding } from "@/components/onboarding/CognitiveOnboarding";
import { resolveOnboardingGate } from "@/lib/onboardingGate";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Brain, AlertTriangle } from "lucide-react";
import { useDemoHandoff } from "@/hooks/useDemoHandoff";
import { useTranslation } from "react-i18next";
import { SeoHead } from "@/components/SeoHead";

type Tab = "home" | "studio" | "piano" | "pratica" | "core";

interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: string;
}

const Index = () => {
  // Mantiene in tempo reale lo stato dei job di generazione (lezioni + esercizi)
  // così la UI riprende l'attesa anche se l'utente è uscito e rientrato nell'app.
  useGenerationRealtime();
  // Se l'utente arriva qui dopo una sessione demo anonima, persistiamo l'esagono
  // calcolato in locale sul suo nuovo profilo cognitivo.
  useDemoHandoff();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showUpload, setShowUpload] = useState(false);
  const [manageFocusContextId, setManageFocusContextId] = useState<string | null>(null);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  // Sotto-sezione di Pratica da aprire al prossimo ingresso nella scheda
  // (es. "Crea esercizi" o "Interrogazione" dalla Home).
  const [praticaInitialSubTab, setPraticaInitialSubTab] = useState<PraticaSubTab>("chat");
  const [lessonLaunch, setLessonLaunch] = useState<{ contextId: string; lessonIndex: number; requestId: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // 💬 P45 — quando lo Studio apre la sottovista Chat, la pagina passa in
  // modalità fillViewport (h-dvh): la barra di input resta SEMPRE sopra la
  // barra di navigazione fissa, anche con la tastiera virtuale aperta.
  const [studioChatOpen, setStudioChatOpen] = useState(false);

  // 🧭 P24 — memoria di posizione: ogni stanza riapre DOV'ERA (oggetti persistenti)
  const scrollPositions = useRef<Record<Tab, number>>({ home: 0, studio: 0, piano: 0, pratica: 0, core: 0 });
  const changeTab = useCallback(
    (tab: Tab) => {
      scrollPositions.current[activeTab] = window.scrollY;
      setActiveTab(tab);
    },
    [activeTab]
  );

  useEffect(() => {
    window.scrollTo(0, scrollPositions.current[activeTab]);
  }, [activeTab]);

  // 🤖 P7 — il citofono dell'agente: la chat può chiedere di cambiare scheda
  // ("portami agli esercizi", "apri le lezioni") senza conoscere la app.
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<string>).detail;
      if (tab === "home" || tab === "studio" || tab === "piano" || tab === "pratica" || tab === "core") {
        changeTab(tab);
      }
    };
    window.addEventListener("erga:goto-tab", handler);
    return () => window.removeEventListener("erga:goto-tab", handler);
  }, [changeTab]);

  const { data: uploadedFiles, updateData: setUploadedFiles } = useUserData<UploadedFile[]>(
    "uploaded_files",
    []
  );

  const hasContentQuery = useHasContentQuery();
  const { invalidateAll, invalidateContexts, invalidateHasContent } = useLessonsCacheControls();

  // Cognitive onboarding gate
  const {
    profile: cognitive,
    gateInput: cognitiveGateInput,
    refresh: refreshCognitive,
  } = useCognitiveProfile();
  const { logout } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // 🔒 anti-regressione: un errore di lettura NON equivale a "utente nuovo".
  // Il cancello mostra l'onboarding solo quando il server ha RISPOSTO che
  // l'utente non ha completato il percorso cognitivo.
  const cognitiveGate = resolveOnboardingGate(cognitiveGateInput);

  // Loading iniziale: solo il primo fetch, mai più tra le tab
  const initialLoading = hasContentQuery.isLoading || cognitiveGate.kind === "loading";
  // 🎬 P14: terzo e ultimo cancello del sipario (cronometro condiviso)
  const splash = useSplashGate(initialLoading);
  const hasCloudContent = hasContentQuery.data ?? false;
  const hasFiles = uploadedFiles.length > 0 || hasCloudContent;
  const hasContentError = hasContentQuery.isError;

  const handleUpload = (files: { name: string; size: number }[], contextId?: string) => {
    const newFiles: UploadedFile[] = files.map((file) => ({
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    }));
    setUploadedFiles((prev) => [...prev, ...newFiles]);
    if (contextId) setSelectedContextId(contextId);
    // Nuovo file caricato: invalida tutto il dominio lezioni/contesti
    invalidateAll();
    invalidateHasContent();
    changeTab("studio");
  };

  const handleSelectFile = (contextId: string) => {
    setSelectedContextId(contextId);
    changeTab("studio");
  };

  const handleFileDeleted = () => {
    invalidateAll();
    invalidateContexts();
    invalidateHasContent();
  };

  const displayFiles = uploadedFiles.map((f) => ({
    name: f.name,
    size: f.size,
  }));

  if (splash.showSplash) {
    return <SplashScreen leaving={splash.leaving} />;
  }

  // ⚠️ Lettura profilo fallita (rete, CORS, Edge Function non deployata,
  // sessione scaduta): NON mostriamo l'onboarding a un utente esistente.
  // Blocchiamo con un errore recuperabile, con il dettaglio in chiaro.
  if (cognitiveGate.kind === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-level-1">
          <Brain className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 font-display text-xl font-bold tracking-tight">
            Non riusciamo a caricare i tuoi dati
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Il tuo account esiste, ma in questo momento non è stato possibile
            leggere il profilo.{" "}
            {cognitiveGate.error && (
              <span className="block text-xs text-foreground/70">
                ({cognitiveGate.error})
              </span>
            )}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={() => void refreshCognitive()}>Riprova</Button>
            <Button variant="ghost" onClick={() => void logout()}>
              Esci e accedi di nuovo
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Onboarding bloccante: SOLO dopo conferma positiva del server che l'utente
  // non ha completato il test cognitivo.
  if (cognitiveGate.kind === "ready" && cognitiveGate.showOnboarding) {
    return (
      <CognitiveOnboarding
        onCompleted={async () => {
          await refreshCognitive();
        }}
      />
    );
  }

  // Home e Core portano già la propria intestazione dentro la stanza:
  // niente titolo duplicato nella barra in alto (un solo <h1> per pagina).
  const headerTitle = activeTab === "home" || activeTab === "core" ? null : t(`nav.${activeTab}`);

  return (
    <>
      <SeoHead
        title="Studio — Erga"
        description="Il tuo spazio di studio personale: lezioni, esercizi, piano e focus in un'unica app."
        path="/app"
        noindex
      />
      <AppLayout
        activeTab={activeTab}
        onTabChange={changeTab}
        headerTitle={headerTitle}
        hideChrome={isFullscreen}
        fillViewport={activeTab === "pratica" || studioChatOpen}
      >
        {/* ⚠️ Errori di lettura dati visibili (mai "vuoto" silenzioso):
            se il contenuto cloud non si carica, l'utente lo sa e può riprovare. */}
        {hasContentError && (
          <div
            role="alert"
            className="mb-3 flex items-start gap-2 rounded-card border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            <p>
              Alcuni dati non si sono caricati.{" "}
              <button
                type="button"
                className="font-semibold underline underline-offset-2"
                onClick={() => {
                  invalidateAll();
                  invalidateHasContent();
                }}
              >
                Riprova
              </button>
            </p>
          </div>
        )}
        {/* 🌲 P24 — passaggio tra stanze: dissolvenza di sola luce (200ms) */}
        <div
          key={activeTab}
          className={
            activeTab === "pratica" || studioChatOpen
              ? "room-fade flex min-h-0 flex-1 flex-col"
              : "room-fade"
          }
        >
        {activeTab === "home" && (
          <HomeView
            onOpenStudio={() => changeTab("studio")}
            onResumeLesson={(contextId, lessonIndex) => {
              setSelectedContextId(contextId);
              setLessonLaunch({ contextId, lessonIndex, requestId: Date.now() });
              changeTab("studio");
            }}
            onOpenPlan={() => changeTab("piano")}
            onOpenPratica={(subTab) => {
              if (subTab) setPraticaInitialSubTab(subTab);
              changeTab("pratica");
            }}
            onUpload={() => setShowUpload(true)}
          />
        )}
        {/* Banner ricalcola Esagono se per qualche motivo i punteggi sono tutti default */}
        {activeTab === "studio" && cognitive && [cognitive.log_score, cognitive.mem_score, cognitive.foc_score, cognitive.voc_score, cognitive.ans_score, cognitive.app_score].every((s) => s === 50) && (
          <button
            onClick={() => setShowOnboarding(true)}
            className="interactive-card mt-4 mb-2 flex w-full items-center gap-3 rounded-card border border-border bg-card px-4 py-3 text-left"
          >
            <Brain className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Personalizza Erga al massimo</p>
              <p className="text-xs text-muted-foreground">Calcola il tuo Esagono Cognitivo in 2 minuti.</p>
            </div>
          </button>
        )}
        {activeTab === "studio" && (
          <StudioView
            hasFiles={hasFiles}
            onUploadClick={() => setShowUpload(true)}
            selectedContextId={selectedContextId}
            lessonLaunch={lessonLaunch}
            onLessonLaunchHandled={() => setLessonLaunch(null)}
            onClearContext={() => setSelectedContextId(null)}
            onOpenCourseMaterials={(contextId) => {
              setManageFocusContextId(contextId);
              setShowUpload(true);
            }}
            onFullscreenChange={setIsFullscreen}
            onChatLayoutChange={setStudioChatOpen}
          />
        )}
        {activeTab === "piano" && (
          <PianoView
            hasFiles={hasFiles}
            onUploadClick={() => setShowUpload(true)}
          />
        )}
        {activeTab === "pratica" && (
          <PraticaView
            hasFiles={hasFiles}
            onUploadClick={() => setShowUpload(true)}
            defaultSubTab={praticaInitialSubTab}
            onFullscreenChange={setIsFullscreen}
          />
        )}
        {activeTab === "core" && (
          <CoreView onOpenCognitive={() => setShowOnboarding(true)} />
        )}
        </div>
      </AppLayout>

      <UploadSheet
        open={showUpload}
        onOpenChange={(o) => {
          setShowUpload(o);
          if (!o) setManageFocusContextId(null);
        }}
        onUpload={handleUpload}
        uploadedFiles={displayFiles}
        onSelectFile={handleSelectFile}
        onFileDeleted={handleFileDeleted}
        initialManageContextId={manageFocusContextId}
      />

      {showOnboarding && (
        <CognitiveOnboarding
          allowClose
          onClose={() => setShowOnboarding(false)}
          onCompleted={async () => {
            await refreshCognitive();
            setShowOnboarding(false);
          }}
        />
      )}
    </>
  );
};

export default Index;
