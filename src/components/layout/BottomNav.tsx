import { BookOpen, CalendarDays, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "studio" | "piano" | "chat" | "profilo";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: "studio" as Tab, label: "Studio", icon: BookOpen, activeColor: "bg-primary-container text-primary" },
  { id: "piano" as Tab, label: "Piano", icon: CalendarDays, activeColor: "bg-secondary-container text-secondary" },
  { id: "chat" as Tab, label: "Chat", icon: MessageCircle, activeColor: "bg-tertiary-container text-tertiary" },
  { id: "profilo" as Tab, label: "Profilo", icon: User, activeColor: "bg-surface-container-highest text-foreground" },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="bg-surface-container shadow-level-2 backdrop-blur-lg">
        <div className="flex items-center justify-around h-[5rem] max-w-lg mx-auto px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center flex-1 py-1 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
              >
                {/* Pill indicator */}
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full transition-all duration-500",
                    isActive
                      ? `${tab.activeColor} w-16 h-8 shadow-level-1`
                      : "w-12 h-8 bg-transparent group-hover:bg-foreground/[0.08]"
                  )}
                  style={{ transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                >
                  <Icon
                    className={cn(
                      "w-[22px] h-[22px] transition-all duration-300",
                      isActive ? "" : "text-muted-foreground"
                    )}
                    fill={isActive ? "currentColor" : "none"}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                </div>
                <span
                  className={cn(
                    "label-small mt-1 transition-all duration-300",
                    isActive ? "text-foreground font-bold" : "text-muted-foreground"
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
