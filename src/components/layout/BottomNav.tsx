import { BookOpen, CalendarDays, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "studio" | "piano" | "chat";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: "studio" as Tab, label: "Studio", icon: BookOpen, color: "primary" },
  { id: "piano" as Tab, label: "Piano", icon: CalendarDays, color: "tertiary" },
  { id: "chat" as Tab, label: "Chat", icon: MessageCircle, color: "accent" },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass pb-safe">
      <div className="flex items-center justify-around h-18 max-w-lg mx-auto px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-3 transition-all duration-300",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-2xl",
                isActive && "scale-105"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-14 h-10 rounded-2xl transition-all duration-300",
                  isActive && tab.color === "primary" && "bg-primary/15",
                  isActive && tab.color === "tertiary" && "bg-tertiary/15",
                  isActive && tab.color === "accent" && "bg-accent/15",
                  !isActive && "bg-transparent"
                )}
              >
                <Icon
                  className={cn(
                    "w-6 h-6 transition-all duration-300",
                    isActive && tab.color === "primary" && "text-primary",
                    isActive && tab.color === "tertiary" && "text-tertiary",
                    isActive && tab.color === "accent" && "text-accent",
                    !isActive && "text-muted-foreground"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-xs mt-1 font-medium transition-all duration-300",
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
    </nav>
  );
}
