import type { ReactNode } from "react";
import { BottomNav, type Tab } from "@/components/layout/BottomNav";
import { AppHeader } from "@/components/layout/AppHeader";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  headerTitle?: string | null;
  hideChrome?: boolean;
  /**
   * Modalità "riempi lo schermo": usata dalle viste che gestiscono da sole il
   * proprio scroll interno (es. Pratica: chat, interrogazione, esercizi).
   * La pagina diventa alta esattamente quanto il viewport reale (dvh, sicuro
   * con le tastiere mobili) e il contenuto si distribuisce in colonna fless,
   * così la barra di input in fondo non finisce MAI sotto la barra di
   * navigazione fissa in basso.
   */
  fillViewport?: boolean;
  children: ReactNode;
}

export function AppLayout({
  activeTab,
  onTabChange,
  headerTitle,
  hideChrome = false,
  fillViewport = false,
  children,
}: AppLayoutProps) {
  const isHome = activeTab === "home";

  return (
    <div
      className={cn(
        "flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-background bg-dot-grid md:flex-row",
        fillViewport && "h-dvh min-h-0 overflow-hidden",
      )}
    >
      {!hideChrome && <BottomNav activeTab={activeTab} onTabChange={onTabChange} />}
      <div className={cn("relative flex min-w-0 max-w-full flex-1 flex-col", fillViewport && "min-h-0")}>
        {!hideChrome && <AppHeader title={headerTitle} integratedHome={isHome} />}
        <main
          className={cn(
            "mx-auto w-full max-w-lg overflow-visible px-4 pb-24 sm:px-6 md:max-w-2xl md:pb-6 lg:max-w-4xl",
            fillViewport && "flex min-h-0 flex-1 flex-col overflow-hidden",
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
