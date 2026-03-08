import { FileUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";

interface AppHeaderProps {
  onUploadClick: () => void;
  hasFiles: boolean;
}

export function AppHeader({ onUploadClick, hasFiles }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-outline-variant/50 transition-all duration-300">
      <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 animate-fade-up">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-level-2 rotate-3 hover:rotate-0 transition-transform duration-500 ease-m3-emphasized">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-display font-bold text-xl text-foreground tracking-tight">
              Erga
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={hasFiles ? "tonal" : "default"}
            size="sm"
            onClick={onUploadClick}
            className="gap-2"
          >
            <FileUp className="w-4 h-4" />
            {hasFiles ? "File" : "Carica"}
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
