import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onAction: (action: string) => void;
}

const quickActions = [
  "Spiegami meglio",
  "Fammi un esempio",
  "Riassumi",
  "Quiz veloce",
];

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {quickActions.map((action) => (
        <Button
          key={action}
          variant="secondary"
          size="sm"
          onClick={() => onAction(action)}
          className="whitespace-nowrap flex-shrink-0"
        >
          {action}
        </Button>
      ))}
    </div>
  );
}
