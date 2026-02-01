import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickActions } from "./QuickActions";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface ChatViewProps {
  hasFiles: boolean;
  onUploadClick: () => void;
}

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
};

const welcomeMessage: Message = {
  id: "welcome",
  role: "assistant",
  content: "Ciao! Sono il tuo tutor di studio personale. Rispondo alle tue domande basandomi esclusivamente sui materiali che hai caricato. Come posso aiutarti oggi?",
};

export function ChatView({ hasFiles, onUploadClick }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!hasFiles) {
    return <EmptyState onUploadClick={onUploadClick} />;
  }

  const handleSend = async (content: string, imageUrl?: string) => {
    if (!currentUser) return;

    const userMessage: Message = {
      id: String(Date.now()),
      role: "user",
      content,
      imageUrl,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Prepare messages for API (exclude welcome message id issues)
    // Include image info in the message content if present
    const apiMessages = [...messages.filter(m => m.id !== "welcome"), userMessage].map(m => ({
      role: m.role,
      content: m.imageUrl 
        ? `[L'utente ha allegato un'immagine] ${m.content}` 
        : m.content,
    }));

    let assistantContent = "";

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            userId: currentUser,
            messages: apiMessages,
          }),
        }
      );

      // Check for error responses
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore nella risposta");
      }

      // Check if it's a non-streaming response (no content)
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        if (data.response) {
          setMessages((prev) => [
            ...prev,
            { id: String(Date.now()), role: "assistant", content: data.response },
          ]);
          setIsLoading(false);
          return;
        }
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let textBuffer = "";

      const updateAssistantMessage = (text: string) => {
        assistantContent = text;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.id !== "welcome") {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantContent } : m
            );
          }
          return [...prev, { id: String(Date.now()), role: "assistant", content: assistantContent }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              updateAssistantMessage(assistantContent + deltaContent);
            }
          } catch {
            // Incomplete JSON, put back
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) {
              updateAssistantMessage(assistantContent + deltaContent);
            }
          } catch {
            /* ignore */
          }
        }
      }

    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore nella chat",
        variant: "destructive",
      });

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          role: "assistant",
          content: "Mi dispiace, si è verificato un errore. Riprova tra qualche secondo.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
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
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="glass-subtle rounded-2xl rounded-bl-md px-4 py-3 shadow-glass">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 pb-20 glass-strong border-t-0 space-y-3">
        <QuickActions onAction={handleQuickAction} />
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}
