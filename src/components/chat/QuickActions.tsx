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
          className="whitespace-nowrap flex-shrink-0 rounded-full border-outline-variant hover:bg-foreground/[0.08] transition-all duration-200 ease-m3-standard label-large"
        >
          <span className="mr-1.5">{action.emoji}</span>
          {action.label}
        </Button>
      ))}
    </div>
  );
}
