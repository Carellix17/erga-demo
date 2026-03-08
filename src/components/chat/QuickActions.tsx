import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onAction: (action: string) => void;
}

const quickActions = [
  { label: "Spiegami meglio", emoji: "💡" },
  { label: "Fammi un esempio", emoji: "📝" },
  { label: "Riassumi", emoji: "📋" },
  { label: "Quiz veloce", emoji: "⚡" },
];

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {quickActions.map((action) => (
        <button
          key={action.label}
          onClick={() => onAction(action.label)}
          className="whitespace-nowrap flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container-low border border-outline-variant/60 text-foreground label-large hover:bg-surface-container-high hover:shadow-level-1 transition-all duration-300 ease-m3-standard active:scale-95"
        >
          <span>{action.emoji}</span>
          {action.label}
        </button>
      ))}
    </div>
  );
}
