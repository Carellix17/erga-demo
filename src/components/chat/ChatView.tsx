import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickActions } from "./QuickActions";
import { EmptyState } from "@/components/shared/EmptyState";

interface ChatViewProps {
  hasFiles: boolean;
  onUploadClick: () => void;
}

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const welcomeMessage: Message = {
  id: "welcome",
  role: "assistant",
  content: "Ciao! Sono qui per aiutarti a studiare. Puoi chiedermi di spiegarti concetti dai tuoi appunti, farti esempi, o creare quiz veloci. Come posso aiutarti?",
};

export function ChatView({ hasFiles, onUploadClick }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!hasFiles) {
    return <EmptyState onUploadClick={onUploadClick} />;
  }

  const handleSend = async (content: string) => {
    const userMessage: Message = {
      id: String(Date.now()),
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI response (will be replaced with real LLM call)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: getDemoResponse(content),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleQuickAction = (action: string) => {
    handleSend(action);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 pb-20 bg-background border-t border-border/50 space-y-3">
        <QuickActions onAction={handleQuickAction} />
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}

// Demo responses
function getDemoResponse(input: string): string {
  const lowered = input.toLowerCase();
  
  if (lowered.includes("spiegami") || lowered.includes("spiega")) {
    return "La fotosintesi clorofilliana è un processo biochimico fondamentale. In pratica, le piante catturano l'energia del sole usando la clorofilla (il pigmento verde delle foglie) e la usano per trasformare CO₂ e acqua in zuccheri, rilasciando ossigeno come 'scarto'. È grazie a questo processo che esiste la vita sulla Terra!";
  }
  
  if (lowered.includes("esempio")) {
    return "Immagina una fabbrica solare: le foglie sono i pannelli solari che catturano la luce. L'acqua arriva dalle radici (come tubi), la CO₂ entra dagli stomi (piccole aperture). La fabbrica produce zucchero (energia) e rilascia ossigeno dal 'camino'. Di notte la fabbrica 'riposa' e fa solo respirazione!";
  }
  
  if (lowered.includes("riassumi")) {
    return "📌 **Fotosintesi in 30 secondi:**\n\n• **Input:** Luce + CO₂ + H₂O\n• **Output:** Glucosio + O₂\n• **Dove:** Cloroplasti (foglie)\n• **Quando:** Di giorno (serve luce)\n• **Perché importante:** Produce O₂ e cibo per tutta la catena alimentare";
  }
  
  if (lowered.includes("quiz")) {
    return "🎯 **Quiz veloce:**\n\nDomanda: Quale gas viene rilasciato come prodotto della fotosintesi?\n\nA) Anidride carbonica\nB) Azoto\nC) Ossigeno\nD) Idrogeno\n\nPensaci e dimmi la tua risposta!";
  }
  
  return "Interessante domanda! Basandomi sui tuoi appunti sulla fotosintesi, posso dirti che questo processo è essenziale per la vita sulla Terra. Vuoi che ti spieghi qualche aspetto specifico o preferisci un quiz per testare le tue conoscenze?";
}
