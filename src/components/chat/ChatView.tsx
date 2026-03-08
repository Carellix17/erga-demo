import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickActions } from "./QuickActions";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ChatViewProps { hasFiles: boolean; onUploadClick: () => void; }
type Message = { id: string; role: "user" | "assistant"; content: string; imageUrl?: string; };

const welcomeMessage: Message = {
  id: "welcome", role: "assistant",
  content: "Ciao! Sono il tuo tutor di studio personale. Rispondo alle tue domande basandomi esclusivamente sui materiali che hai caricato. Come posso aiutarti oggi?",
};

export function ChatView({ hasFiles, onUploadClick }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages]);

  if (!hasFiles) return <EmptyState onUploadClick={onUploadClick} />;

  const handleSend = async (content: string, imageUrl?: string) => {
    if (!currentUser) return;
    const userMessage: Message = { id: String(Date.now()), role: "user", content, imageUrl };
    setMessages(prev => [...prev, userMessage]); setIsLoading(true);

    // Build API messages - include image data for vision
    const apiMessages = [...messages.filter(m => m.id !== "welcome"), userMessage].map(m => {
      if (m.imageUrl && m.imageUrl.startsWith("data:image")) {
        // Send multimodal content for vision models
        return {
          role: m.role,
          content: [
            { type: "text", text: m.content || "Descrivi e analizza questa immagine in relazione ai materiali di studio." },
            { type: "image_url", image_url: { url: m.imageUrl } },
          ],
        };
      }
      return { role: m.role, content: m.content };
    });

    let assistantContent = "";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ userId: currentUser, messages: apiMessages }) });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || "Errore nella risposta"); }
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const data = await response.json();
        if (data.response) { setMessages(prev => [...prev, { id: String(Date.now()), role: "assistant", content: data.response }]); setIsLoading(false); return; }
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder(); let textBuffer = "";
      const updateAssistantMessage = (text: string) => {
        assistantContent = text;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.id !== "welcome") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
          return [...prev, { id: String(Date.now()), role: "assistant", content: assistantContent }];
        });
      };
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex); textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim(); if (jsonStr === "[DONE]") break;
          try { const parsed = JSON.parse(jsonStr); const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) updateAssistantMessage(assistantContent + deltaContent);
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue; if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim(); if (jsonStr === "[DONE]") continue;
          try { const parsed = JSON.parse(jsonStr); const deltaContent = parsed.choices?.[0]?.delta?.content;
            if (deltaContent) updateAssistantMessage(assistantContent + deltaContent);
          } catch { /* ignore */ }
        }
      }
    } catch (error) { console.error("Chat error:", error);
      toast({ title: "Errore", description: error instanceof Error ? error.message : "Errore nella chat", variant: "destructive" });
      setMessages(prev => [...prev, { id: String(Date.now()), role: "assistant", content: "Mi dispiace, si è verificato un errore. Riprova tra qualche secondo." }]);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)]">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
        {messages.map((message) => <ChatMessage key={message.id} message={message} />)}
        {isLoading && (
          <div className="flex gap-3 animate-fade-up">
            <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center shadow-level-1">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="bg-surface-container-high rounded-2xl rounded-bl-md px-4 py-3 shadow-level-1">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-secondary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-tertiary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="px-3 pb-20 pt-2 space-y-2">
        <QuickActions onAction={(action) => handleSend(action)} />
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}
