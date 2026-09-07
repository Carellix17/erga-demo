import { useState } from "react";
import { AudioLines, MessageSquare, PencilLine, RefreshCw, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import { HomeDashboardSkeleton } from "./HomeDashboardSkeleton";
import { useFocus } from "@/contexts/FocusContext";
import { useHomeDashboard, type HomeTask } from "@/hooks/useHomeDashboard";
import { useWelcomeMessage } from "@/hooks/useWelcomeMessage";
import { useHaptics } from "@/hooks/useHaptics";
import { HomeHeader } from "./HomeHeader";
import { CourseHeroCard } from "./CourseHeroCard";
import { QuickToolsGrid, type QuickToolItem } from "./QuickToolsGrid";
import { DailyTimeline } from "./DailyTimeline";
import type { PraticaSubTab } from "@/components/pratica/PraticaView";

interface HomeViewProps {
  onOpenStudio: () => void;
  onResumeLesson: (contextId: string, lessonIndex: number) => void;
  onOpenPlan: () => void;
  /** Apre la scheda Pratica, eventualmente sulla sotto-sezione richiesta. */
  onOpenPratica?: (subTab?: PraticaSubTab) => void;
  onUpload: () => void;
}

const VISIBLE_TASKS = 3;

export function HomeView({
  onOpenStudio,
  onResumeLesson,
  onOpenPlan,
  onOpenPratica,
  onUpload,
}: HomeViewProps) {
  const { t } = useTranslation();
  const dashboard = useHomeDashboard();
  const focus = useFocus();
  const { triggerLight } = useHaptics();
  const [showAllTasks, setShowAllTasks] = useState(false);

  const data = dashboard.data;
  const pendingTasks = data?.todayTasks.filter((task) => !task.isCompleted).length ?? 0;
  const welcome = useWelcomeMessage({
    userName: data?.displayName ?? "",
    pendingTasks,
    completedTasks: data?.completedActivities ?? 0,
    hasResumeLesson: !!data?.resumeLesson,
    nextEvaluationDays: data?.nextEvaluation?.daysAway ?? null,
  });

  const showHomeSkeleton = useDelayedLoading(dashboard.isLoading, 100);
  if (showHomeSkeleton) return <HomeDashboardSkeleton />;
  if (dashboard.isLoading) return null;

  if (dashboard.isError || !data) {
    return (
      <div className="pb-10 pt-20">
        <Card className="mx-auto max-w-xl border-destructive/25 bg-card p-6 text-center">
          <RefreshCw className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" />
          <h1 className="mt-4 font-display text-xl font-bold">{t("home.error.title")}</h1>
          <p className="mt-2 text-base text-muted-foreground">{t("home.error.description")}</p>
          <Button className="mt-5 min-h-12 rounded-button" onClick={() => dashboard.refetch()}>
            {t("home.error.retry")}
          </Button>
        </Card>
      </div>
    );
  }

  const tasks = showAllTasks ? data.todayTasks : data.todayTasks.slice(0, VISIBLE_TASKS);
  const hiddenTasks = Math.max(0, data.todayTasks.length - VISIBLE_TASKS);
  const resume = data.resumeLesson;

  // ── Card corso: tre stati reali, nessun contenuto inventato ─────────────
  const heroIsGenerating = !resume && data.isGenerating;
  const heroHasNoLessons = !resume && !data.isGenerating && data.hasContexts;

  const handleOpenPlan = () => {
    triggerLight();
    onOpenPlan();
  };

  const handleToggleTasks = () => {
    triggerLight();
    setShowAllTasks((value) => !value);
  };

  const startTaskFocus = (task: HomeTask) => {
    if (!task.canStartFocus) return;
    triggerLight();
    focus.startSession({
      label: task.title,
      subject: task.subject,
      eventId: task.sourceId,
      sourceType: "planned",
    });
  };

  // ── Strumenti rapidi: apertura delle azioni principali ──────────────────
  const tools: QuickToolItem[] = [
    {
      id: "upload",
      label: t("home.tools.upload"),
      icon: Upload,
      onClick: () => {
        triggerLight();
        onUpload();
      },
    },
      {
        id: "tutor",
        label: t("home.tools.tutor"),
        icon: MessageSquare,
        onClick: () => {
          triggerLight();
          onOpenPratica?.("chat");
        },
      },
      {
        id: "exercises",
        label: t("home.tools.exercises"),
        icon: PencilLine,
        onClick: () => {
          triggerLight();
          onOpenPratica?.("esercizi");
        },
      },
      {
        id: "interrogation",
        label: t("home.tools.interrogation"),
        icon: AudioLines,
        onClick: () => {
          triggerLight();
          onOpenPratica?.("interrogazione");
        },
      },
  ];

  return (
    // `no-ambient` spegne l'alone ambientale animato (P26/P27) su TUTTA la
    // Home: il fondo resta uniforme e le card portano solo la loro ombra
    // leggera del design system. Le altre sezioni non vengono toccate.
    <div className="no-ambient flex min-w-0 flex-col gap-6 overflow-x-clip pt-20 pb-2 sm:pt-24">
      {/* 1. Saluto (l'avatar profilo sta nell'header in alto a destra) */}
      <HomeHeader
        greeting={welcome.greeting}
        userName={welcome.name || t("home.resume.studentFallback")}
        subtitle={welcome.subtitle}
      />

      {/* 2. Card unificata del corso attivo */}
      <CourseHeroCard
        courseTitle={resume?.courseTitle ?? null}
        contextId={resume?.contextId ?? null}
        eyebrowText={t("home.course.eyebrow")}
        lessonTitle={resume?.lessonTitle ?? null}
        lessonMetaText={
          resume
            ? t("home.course.lessonsMeta", { current: resume.lessonNumber, total: resume.lessonCount })
            : null
        }
        progressPercent={resume?.progressPercent ?? null}
        progressAriaLabel={
          resume ? t("home.course.progressAria", { percent: Math.min(100, Math.max(0, Math.round(resume.progressPercent))) }) : null
        }
        primaryCtaLabel={
          resume
            ? resume.lessonNumber > 1
              ? t("home.resume.continue")
              : t("home.resume.start")
            : null
        }
        onPrimaryCta={
          resume
            ? () => {
                triggerLight();
                onResumeLesson(resume.contextId, resume.lessonIndex);
              }
            : undefined
        }
        emptyTitle={
          heroIsGenerating
            ? t("home.resume.generatingTitle")
            : heroHasNoLessons
              ? t("home.resume.noLessonTitle")
              : t("home.resume.noContentTitle")
        }
        emptyDescription={
          heroIsGenerating
            ? t("home.resume.generatingDescription")
            : heroHasNoLessons
              ? t("home.resume.noLessonDescription")
              : t("home.resume.noContentDescription")
        }
        emptyCtaLabel={
          heroIsGenerating || heroHasNoLessons ? t("home.resume.openStudio") : t("home.resume.upload")
        }
        onEmptyCta={
          heroIsGenerating || heroHasNoLessons
            ? () => {
                triggerLight();
                onOpenStudio();
              }
            : () => {
                triggerLight();
                onUpload();
              }
        }
      />

      {/* 3. Strumenti rapidi */}
      <QuickToolsGrid title={t("home.tools.title")} tools={tools} />

      {/* 4. Piano del giorno */}
      <DailyTimeline
        title={t("home.today.title")}
        seeAllLabel={t("home.today.openPlan")}
        emptyTitle={t("home.today.emptyTitle")}
        emptyDescription={t("home.today.emptyDescription")}
        emptyCtaLabel={t("home.today.organize")}
        tasks={tasks.map((task) => ({
          id: task.id,
          title: task.title,
          time: task.time,
          subject: task.subject,
          isCompleted: task.isCompleted,
          kind: task.kind,
        }))}
        onTaskClick={(id) => {
          const task = data.todayTasks.find((item) => item.id === id);
          if (task) startTaskFocus(task);
        }}
        onSeeAll={hiddenTasks > 0 || showAllTasks ? handleToggleTasks : handleOpenPlan}
      />
    </div>
  );
}
