import { ChevronRight, Clock, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface MiniLessonProps {
  lesson: {
    id: string;
    title: string;
    concept: string;
    explanation: string;
    question: string;
    duration: number;
  };
  progress: number;
  totalLessons: number;
  currentIndex: number;
  onNext: () => void;
}

export function MiniLesson({
  lesson,
  progress,
  totalLessons,
  currentIndex,
  onNext,
}: MiniLessonProps) {
  return (
    <div className="space-y-4 animate-fade-up">
      {/* Progress Header */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            Lezione {currentIndex + 1} di {totalLessons}
          </span>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{lesson.duration} min</span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Concept Card */}
      <Card className="border-0 bg-primary/10">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-primary">
            <Lightbulb className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wide">
              Concetto chiave
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-semibold text-foreground">
            {lesson.concept}
          </p>
        </CardContent>
      </Card>

      {/* Lesson Content */}
      <Card>
        <CardHeader>
          <CardTitle>{lesson.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {lesson.explanation}
          </p>

          {/* Question Card */}
          <div className="p-4 rounded-xl bg-secondary">
            <p className="text-sm font-medium text-secondary-foreground mb-1">
              Verifica la comprensione
            </p>
            <p className="text-foreground">{lesson.question}</p>
          </div>
        </CardContent>
      </Card>

      {/* Next Button */}
      <Button onClick={onNext} className="w-full" size="lg">
        Continua
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
}
