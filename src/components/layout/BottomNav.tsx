import { BookOpen, CalendarDays, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "studio" | "piano" | "chat" | "profilo";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: "studio" as Tab, label: "Studio", icon: BookOpen, color: "primary" },
  { id: "piano" as Tab, label: "Piano", icon: CalendarDays, color: "tertiary" },
  { id: "chat" as Tab, label: "Chat", icon: MessageCircle, color: "accent" },
  { id: "profilo" as Tab, label: "Profilo", icon: User, color: "primary" },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      {/* Glass nav container */}
      <div className="mx-3 mb-2 glass-strong rounded-[1.75rem] shadow-glass-lg glass-shimmer">
        <div className="flex items-center justify-around h-[4.25rem] max-w-lg mx-auto px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-2 transition-all duration-400 ease-out",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-2xl",
                  isActive && "scale-105"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-12 h-9 rounded-2xl transition-all duration-400 ease-out relative",
                    isActive && tab.color === "primary" && "bg-primary/15 shadow-glow",
                    isActive && tab.color === "tertiary" && "bg-tertiary/15 shadow-glow-tertiary",
                    isActive && tab.color === "accent" && "bg-accent/15 shadow-glow-accent",
                    !isActive && "bg-transparent hover:bg-muted/40"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-[22px] h-[22px] transition-all duration-400",
                      isActive && tab.color === "primary" && "text-primary drop-shadow-sm",
                      isActive && tab.color === "tertiary" && "text-tertiary drop-shadow-sm",
                      isActive && tab.color === "accent" && "text-accent drop-shadow-sm",
                      !isActive && "text-muted-foreground"
                    )}
                  />
                </div>
                <span
                  className={cn(
                    "text-[10px] mt-1 font-semibold tracking-wide transition-all duration-400",
                    isActive && tab.color === "primary" && "text-primary",
                    isActive && tab.color === "tertiary" && "text-tertiary",
                    isActive && tab.color === "accent" && "text-accent",
                    !isActive && "text-muted-foreground"
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
