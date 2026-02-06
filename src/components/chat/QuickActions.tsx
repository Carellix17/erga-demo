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
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          onClick={() => onAction(action.label)}
          className="whitespace-nowrap flex-shrink-0 glass-subtle border-border/30 rounded-xl hover:shadow-glass hover:scale-[1.03] transition-all duration-300 text-xs font-medium"
        >
          <span className="mr-1.5">{action.emoji}</span>
          {action.label}
        </Button>
      ))}
    </div>
  );
}
