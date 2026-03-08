import { FileUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";

interface AppHeaderProps {
  onUploadClick: () => void;
  hasFiles: boolean;
}

export function AppHeader({ onUploadClick, hasFiles }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-2xl border-b border-outline-variant/30 transition-all duration-400 ease-m3-emphasized">
      <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 animate-fade-up">
          <div className="w-11 h-11 rounded-[1.25rem] bg-primary flex items-center justify-center shadow-level-2 rotate-3 hover:rotate-0 hover:scale-110 active:scale-95 transition-all duration-500 ease-m3-emphasized">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="font-display font-bold text-xl text-foreground tracking-tight">
              Erga
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
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
