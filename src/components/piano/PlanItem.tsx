import { Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

const typeStyles = {
  study: "bg-primary/10 border-primary/20",
  test: "bg-accent/10 border-accent/20",
  assignment: "bg-tertiary/10 border-tertiary/20",
};

const typeLabels = {
  study: "Studio",
  test: "Verifica",
  assignment: "Compito",
};

export function PlanItem({ item, onClick }: PlanItemProps) {
  return (
    <Card
      className={cn(
        "border-l-4 cursor-pointer transition-all duration-200 hover:translate-x-1",
        typeStyles[item.type],
        item.completed && "opacity-60"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full",
                  item.type === "study" && "bg-primary/20 text-primary",
                  item.type === "test" && "bg-accent/20 text-accent",
                  item.type === "assignment" && "bg-tertiary/20 text-tertiary"
                )}
              >
                {typeLabels[item.type]}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {item.subject}
              </span>
            </div>
            <p
              className={cn(
                "font-medium truncate",
                item.completed && "line-through"
              )}
            >
              {item.title}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{item.date}</span>
            </div>
            {item.time && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{item.time}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
