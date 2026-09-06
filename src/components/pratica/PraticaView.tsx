import { useState } from "react";
import { MessageCircle, Mic, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatView } from "@/components/chat/ChatView";
import { InterrogazioneView } from "./InterrogazioneView";
import { EserciziView } from "./EserciziView";
import { EmptyState } from "@/components/shared/EmptyState";

export type PraticaSubTab = "chat" | "interrogazione" | "esercizi";

interface PraticaViewProps {
  hasFiles: boolean;
  onUploadClick: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  contextId?: string | null;
  contextName?: string | null;
  defaultSubTab?: PraticaSubTab;
  onBack?: () => void;
}

const subTabs = [
  { id: "chat" as PraticaSubTab, label: "Chat", icon: MessageCircle, description: "Fatti spiegare" },
  { id: "interrogazione" as PraticaSubTab, label: "Interrogazione", icon: Mic, description: "Parlare per imparare" },
  { id: "esercizi" as PraticaSubTab, label: "Esercizi", icon: Dumbbell, description: "Allenati" },
];

export function PraticaView({
  hasFiles,
  onUploadClick,
  onFullscreenChange,
  contextId,
  contextName,
  defaultSubTab = "chat",
  onBack,
}: PraticaViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<PraticaSubTab>(defaultSubTab);
  const [isExerciseFullscreen, setIsExerciseFullscreen] = useState(false);

  const handleFullscreenChange = (isFullscreen: boolean) => {
    setIsExerciseFullscreen(isFullscreen);
    onFullscreenChange?.(isFullscreen);
  };

  if (!hasFiles) return <EmptyState onUploadClick={onUploadClick} />;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
      {/* Sub-tab selector - hidden during exercises fullscreen */}
      {!isExerciseFullscreen && (
        <div className="sticky top-16 z-30 -mx-4 flex-shrink-0 bg-background/95 px-4 pb-2 pt-2 backdrop-blur-md sm:-mx-6 sm:px-6">
          <div className="flex gap-1.5 rounded-card bg-surface-container p-1">
            {subTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-button transition-[transform,background-color,color,box-shadow] duration-200 ease-in-out active:scale-[0.98]",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-level-1"
                      : "text-muted-foreground hover:bg-foreground/[0.05]"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="label-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeSubTab === "chat" && (
          <ChatView hasFiles={hasFiles} onUploadClick={onUploadClick} contextId={contextId} />
        )}
        {activeSubTab === "interrogazione" && (
          <InterrogazioneView contextId={contextId} contextName={contextName} />
        )}
        {activeSubTab === "esercizi" && (
          <EserciziView onFullscreenChange={handleFullscreenChange} contextId={contextId} contextName={contextName} />
        )}
      </div>
    </div>
  );
}
