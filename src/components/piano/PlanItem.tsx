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
  study: { bg: "bg-primary-container", border: "border-l-primary", badge: "bg-primary-container text-primary", label: "Studio" },
  test: { bg: "bg-tertiary-container", border: "border-l-tertiary", badge: "bg-tertiary-container text-tertiary", label: "Verifica" },
  assignment: { bg: "bg-secondary-container", border: "border-l-secondary", badge: "bg-secondary-container text-secondary", label: "Compito" },
};

export function PlanItem({ item, onClick }: PlanItemProps) {
  const config = typeConfig[item.type];

  return (
    <div
      className={cn(
        "m3-card-elevated rounded-xl border-l-4 cursor-pointer p-4 state-layer",
        config.border,
        item.completed && "opacity-60"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={cn("label-small px-2.5 py-0.5 rounded-full", config.badge)}>
              {config.label}
            </span>
            <span className="label-small text-muted-foreground">
              {item.subject}
            </span>
          </div>
          <p className={cn(
            "title-small truncate",
            item.completed && "line-through"
          )}>
            {item.title}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 body-small text-muted-foreground">
          <div className="flex items-center gap-1 bg-surface-container-highest px-2 py-0.5 rounded-full">
            <Calendar className="w-3 h-3" />
            <span>{item.date}</span>
          </div>
          {item.time && (
            <div className="flex items-center gap-1 bg-surface-container-highest px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              <span>{item.time}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
