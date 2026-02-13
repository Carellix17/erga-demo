import { FileUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";

interface AppHeaderProps {
  onUploadClick: () => void;
  hasFiles: boolean;
}

export function AppHeader({ onUploadClick, hasFiles }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 m3-top-app-bar border-b border-outline-variant">
      <div className="flex items-center justify-between h-16 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">
            Erga
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={hasFiles ? "outline" : "default"}
            size="sm"
            onClick={onUploadClick}
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
