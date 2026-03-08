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
    <div className="px-4 pt-4 pb-1">
      <p className="label-medium text-muted-foreground mb-2.5 px-1">I tuoi corsi</p>
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide">
        {courses.map((course) => {
          const isActive = course.id === activeContextId;
          const Icon = getIcon(course.file_name);

          return (
            <button
              key={course.id}
              onClick={() => onSelectCourse(course.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all duration-300 ease-m3-emphasized flex-shrink-0",
                "border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-level-2"
                  : "bg-surface-container-low text-foreground border-outline-variant hover:bg-surface-container-high hover:shadow-level-1"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
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
