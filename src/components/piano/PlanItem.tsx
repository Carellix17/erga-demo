import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanItemProps {
  item: {
    id: string;
    subject: string;
    title: string;
    date: string;
    time?: string;
    type: "study" | "test" | "assignment";
    completed?: boolean;
  };
  onClick?: () => void;
}

const typeConfig = {
  study: { glass: "glass-primary", border: "border-l-primary", badge: "glass-primary text-primary", label: "Studio" },
  test: { glass: "glass-accent", border: "border-l-accent", badge: "glass-accent text-accent", label: "Verifica" },
  assignment: { glass: "glass-tertiary", border: "border-l-tertiary", badge: "glass-tertiary text-tertiary", label: "Compito" },
};

export function PlanItem({ item, onClick }: PlanItemProps) {
  const config = typeConfig[item.type];

  return (
    <div
      className={cn(
        "glass-card rounded-2xl border-l-4 cursor-pointer p-4",
        config.border,
        item.completed && "opacity-60"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn("text-xs font-medium px-2.5 py-0.5 rounded-full", config.badge)}>
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {item.subject}
            </span>
          </div>
          <p className={cn(
            "font-medium truncate",
            item.completed && "line-through"
          )}>
            {item.title}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 glass-subtle px-2 py-0.5 rounded-full">
            <Calendar className="w-3 h-3" />
            <span>{item.date}</span>
          </div>
          {item.time && (
            <div className="flex items-center gap-1 glass-subtle px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              <span>{item.time}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
