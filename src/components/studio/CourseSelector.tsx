import { BookOpen, Globe, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  file_name: string;
  processing_status?: string | null;
}

interface CourseSelectorProps {
  courses: Course[];
  activeContextId: string | null;
  onSelectCourse: (contextId: string) => void;
}

export function CourseSelector({ courses, activeContextId, onSelectCourse }: CourseSelectorProps) {
  if (courses.length <= 1) return null;

  const getIcon = (name: string) => {
    if (name.startsWith("🌐") || name.toLowerCase().includes("web")) return Globe;
    if (name.endsWith(".pdf")) return FileText;
    return BookOpen;
  };

  const cleanName = (name: string) => {
    return name.replace(/^🌐\s*/, "").replace(/\.pdf$/i, "");
  };

  return (
    <div className="px-4 pt-4 pb-1 animate-fade-up">
      <p className="label-medium text-muted-foreground mb-3 px-1">I tuoi corsi</p>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {courses.map((course, i) => {
          const isActive = course.id === activeContextId;
          const Icon = getIcon(course.file_name);

          return (
            <button
              key={course.id}
              onClick={() => onSelectCourse(course.id)}
              className={cn(
                "flex items-center gap-2.5 px-5 py-3 rounded-full whitespace-nowrap flex-shrink-0",
                "transition-all duration-500 ease-m3-emphasized",
                "active:scale-[0.93]",
                `animate-fade-up animate-stagger-${Math.min(i + 1, 5)}`,
                isActive
                  ? "bg-primary text-primary-foreground shadow-level-2 scale-[1.02]"
                  : "bg-surface-container-low text-foreground border border-outline-variant hover:bg-surface-container-high hover:shadow-level-1 hover:scale-[1.04]"
              )}
            >
              <Icon className={cn("w-4.5 h-4.5 flex-shrink-0", isActive && "animate-wiggle")} />
              <span className="label-large max-w-[140px] truncate">
                {cleanName(course.file_name)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
