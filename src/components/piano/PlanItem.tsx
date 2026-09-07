import { useTranslation } from "react-i18next";
import { Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubjectColor } from "@/lib/subjectColors";

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
  /** Colore della materia (automatico o scelto dall'utente). */
  subjectColor?: SubjectColor;
  onClick?: () => void;
}

export function PlanItem({ item, subjectColor, onClick }: PlanItemProps) {
  const { t } = useTranslation();
  const subjBadge = subjectColor
    ? cn(subjectColor.badge, subjectColor.badgeText)
    : "bg-secondary text-muted-foreground";

  return (
    <div
      className={cn(
        "m3-card-elevated rounded-xl cursor-pointer p-4 state-layer flex items-start gap-3",
        item.completed && "opacity-60"
      )}
      onClick={onClick}
    >
      {subjectColor && (
        <span aria-hidden="true" className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", subjectColor.solid)} />
      )}
      <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="label-small px-2.5 py-0.5 rounded-full bg-surface-container text-muted-foreground">
              {t(`piano.type_${item.type}`)}
            </span>
            <span className={cn("label-small px-2.5 py-0.5 rounded-full", subjBadge)}>
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
