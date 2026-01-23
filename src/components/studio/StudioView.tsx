import { useState } from "react";
import { MiniLesson } from "./MiniLesson";
import { EmptyState } from "@/components/shared/EmptyState";

interface StudioViewProps {
  hasFiles: boolean;
  onUploadClick: () => void;
}

// Demo data - will be replaced with AI-generated content
const demoLessons = [
  {
    id: "1",
    title: "Introduzione alla Fotosintesi",
    concept: "La fotosintesi è il processo attraverso cui le piante convertono la luce solare in energia chimica",
    explanation: "Le piante assorbono la luce solare attraverso la clorofilla, un pigmento verde presente nelle foglie. Questo processo avviene principalmente nei cloroplasti, organelli cellulari specializzati. L'energia luminosa viene utilizzata per convertire anidride carbonica e acqua in glucosio e ossigeno.",
    question: "Quale organello cellulare è principalmente responsabile della fotosintesi?",
    duration: 5,
  },
  {
    id: "2",
    title: "Le Fasi della Fotosintesi",
    concept: "La fotosintesi si divide in due fasi: la fase luminosa e il ciclo di Calvin",
    explanation: "Nella fase luminosa, l'energia solare viene catturata e convertita in ATP e NADPH. Nel ciclo di Calvin, queste molecole energetiche vengono utilizzate per fissare il carbonio dell'anidride carbonica e produrre glucosio. Le due fasi sono strettamente interconnesse.",
    question: "In quale fase viene prodotto il glucosio?",
    duration: 5,
  },
];

export function StudioView({ hasFiles, onUploadClick }: StudioViewProps) {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);

  if (!hasFiles) {
    return <EmptyState onUploadClick={onUploadClick} />;
  }

  const currentLesson = demoLessons[currentLessonIndex];
  const progress = ((currentLessonIndex + 1) / demoLessons.length) * 100;

  const handleNext = () => {
    if (currentLessonIndex < demoLessons.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  };

  return (
    <div className="p-4 pb-24">
      <MiniLesson
        lesson={currentLesson}
        progress={progress}
        totalLessons={demoLessons.length}
        currentIndex={currentLessonIndex}
        onNext={handleNext}
      />
    </div>
  );
}
