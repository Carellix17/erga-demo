import { FileUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";

interface AppHeaderProps {
  onUploadClick: () => void;
  hasFiles: boolean;
}

export function AppHeader({ onUploadClick, hasFiles }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 glass-strong glass-shimmer">
      <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center shadow-glass-md animate-glow-pulse">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-heading font-bold text-xl bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              Erga
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={hasFiles ? "ghost" : "default"}
            size="sm"
            onClick={onUploadClick}
            className={
              !hasFiles 
                ? "gradient-primary text-white border-0 shadow-glass-md rounded-xl hover:shadow-glass-lg transition-all duration-300 hover:scale-105" 
                : "rounded-xl glass-subtle hover:shadow-glass transition-all duration-300"
            }
          >
            <FileUp className="w-4 h-4 mr-2" />
            {hasFiles ? "File" : "Carica PDF"}
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
