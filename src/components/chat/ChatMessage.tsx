import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    imageUrl?: string;
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {!isUser && (
        <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0 shadow-level-1">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
      )}
      
      <div
        className={cn(
          "max-w-[85%] overflow-hidden transition-all duration-300 ease-m3-emphasized",
          isUser
            ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md shadow-level-1"
            : "bg-surface-container-high text-foreground rounded-2xl rounded-bl-md shadow-level-1"
        )}
      >
        {/* Image attachment */}
        {message.imageUrl && (
          <div className="p-2 pb-0">
            <img 
              src={message.imageUrl} 
              alt="Allegato" 
              className="max-w-full max-h-52 rounded-xl object-cover shadow-level-1"
            />
          </div>
        )}
        
        {/* Text content with Markdown */}
        <div className={cn("px-4 py-3", message.imageUrl && "pt-2")}>
          {isUser ? (
            <p className="body-medium leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <div className="body-medium leading-relaxed prose prose-sm max-w-none prose-p:my-1.5 prose-headings:font-display prose-headings:mt-3 prose-headings:mb-1.5 prose-strong:text-foreground prose-em:text-foreground/90 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="my-1.5">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  ul: ({ children }) => <ul className="list-disc pl-4 my-1.5 space-y-0.5">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal pl-4 my-1.5 space-y-0.5">{children}</ol>,
                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                  h1: ({ children }) => <h3 className="font-display font-medium text-base mt-3 mb-1">{children}</h3>,
                  h2: ({ children }) => <h4 className="font-display font-medium text-base mt-2 mb-1">{children}</h4>,
                  h3: ({ children }) => <h5 className="font-display font-medium mt-2 mb-1">{children}</h5>,
                  code: ({ children }) => (
                    <code className="bg-surface-container-highest px-1.5 py-0.5 rounded-md text-xs font-mono">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-surface-container-highest p-3 rounded-xl overflow-x-auto my-2 text-xs">
                      {children}
                    </pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-3 border-primary pl-3 my-2 italic text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
