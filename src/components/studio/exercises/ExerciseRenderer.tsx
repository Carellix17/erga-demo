import { MultipleChoice } from "./MultipleChoice";
import { TrueFalse } from "./TrueFalse";
import { FillBlank } from "./FillBlank";
import { ShortAnswer } from "./ShortAnswer";

export interface Exercise {
  type: "multiple_choice" | "true_false" | "fill_blank" | "short_answer";
  question?: string;
  options?: string[];
  correct_index?: number;
  statement?: string;
  correct?: boolean;
  sentence_with_blank?: string;
  correct_answer?: string;
  expected_keywords?: string[];
}

interface ExerciseRendererProps {
  exercise: Exercise;
  onComplete: (correct: boolean) => void;
  isCompleted: boolean;
}

export function ExerciseRenderer({ exercise, onComplete, isCompleted }: ExerciseRendererProps) {
  switch (exercise.type) {
    case "multiple_choice":
      return (
        <MultipleChoice
          question={exercise.question || ""}
          options={exercise.options || []}
          correctIndex={exercise.correct_index ?? 0}
          onComplete={onComplete}
          isCompleted={isCompleted}
        />
      );
    
    case "true_false":
      return (
        <TrueFalse
          statement={exercise.statement || exercise.question || ""}
          correct={exercise.correct ?? true}
          onComplete={onComplete}
          isCompleted={isCompleted}
        />
      );
    
    case "fill_blank":
      return (
        <FillBlank
          sentenceWithBlank={exercise.sentence_with_blank || ""}
          correctAnswer={exercise.correct_answer || ""}
          onComplete={onComplete}
          isCompleted={isCompleted}
        />
      );
    
    case "short_answer":
      return (
        <ShortAnswer
          question={exercise.question || ""}
          expectedKeywords={exercise.expected_keywords || []}
          onComplete={onComplete}
          isCompleted={isCompleted}
        />
      );
    
    default:
      return (
        <div className="p-4 bg-muted rounded-xl text-muted-foreground">
          Tipo di esercizio non riconosciuto
        </div>
      );
  }
}
