import { BookOpen, CalendarDays, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "studio" | "piano" | "chat" | "profilo";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs = [
  { id: "studio" as Tab, label: "Studio", icon: BookOpen, color: "bg-primary-container text-primary" },
  { id: "piano" as Tab, label: "Piano", icon: CalendarDays, color: "bg-secondary-container text-secondary" },
  { id: "chat" as Tab, label: "Chat", icon: MessageCircle, color: "bg-tertiary-container text-tertiary" },
  { id: "profilo" as Tab, label: "Profilo", icon: User, color: "bg-surface-container-highest text-foreground" },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="m3-nav-bar">
        <div className="flex items-center justify-around h-20 max-w-lg mx-auto px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-16 h-8 rounded-full transition-all duration-500 ease-m3-emphasized relative",
                    isActive ? tab.color : "bg-transparent",
                    isActive && "scale-110 shadow-level-1"
                  )}
                  style={{
                    transition: "all 500ms cubic-bezier(0.34, 1.56, 0.64, 1)"
                  }}
                >
                  <Icon
                    className={cn(
                      "w-6 h-6 transition-all duration-300",
                      isActive ? "" : "text-muted-foreground"
                    )}
                    fill={isActive ? "currentColor" : "none"}
                    style={isActive ? { animation: "m3-pop 400ms cubic-bezier(0.34, 1.56, 0.64, 1)" } : {}}
                  />
                </div>
                <span
                  className={cn(
                    "label-medium mt-1 transition-all duration-300",
                    isActive ? "text-foreground font-bold scale-105" : "text-muted-foreground"
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
