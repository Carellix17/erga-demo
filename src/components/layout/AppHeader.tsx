import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  onUploadClick: () => void;
  hasFiles: boolean;
}

export function AppHeader({ onUploadClick, hasFiles }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border/50">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">E</span>
          </div>
          <span className="font-semibold text-lg">Erga</span>
        </div>
        
        <Button
          variant={hasFiles ? "ghost" : "tonal"}
          size="icon-sm"
          onClick={onUploadClick}
          className="relative"
        >
          <FileUp className="w-5 h-5" />
          {!hasFiles && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full animate-pulse-soft" />
          )}
        </Button>
      </div>
    </header>
  );
}
