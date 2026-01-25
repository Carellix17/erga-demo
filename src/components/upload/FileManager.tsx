import { useState, useEffect } from "react";
import { Trash2, FileText, BookOpen, Loader2, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StudyContext {
  id: string;
  file_name: string;
  created_at: string;
  lesson_count: number;
}

interface FileManagerProps {
  onFileDeleted: () => void;
  onSelectFile: (contextId: string) => void;
}

export function FileManager({ onFileDeleted, onSelectFile }: FileManagerProps) {
  const [contexts, setContexts] = useState<StudyContext[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<StudyContext | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const fetchContexts = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-context`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ userId: currentUser, action: "list" }),
        }
      );

      const data = await response.json();
      if (response.ok && data.contexts) {
        setContexts(data.contexts);
      }
    } catch (error) {
      console.error("Error fetching contexts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContexts();
  }, [currentUser]);

  const handleDelete = async () => {
    if (!deleteTarget || !currentUser) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-context`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            userId: currentUser,
            contextId: deleteTarget.id,
            action: "delete",
          }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        toast({
          title: "File eliminato",
          description: `"${deleteTarget.file_name}" è stato rimosso insieme alle sue lezioni.`,
        });
        setContexts(prev => prev.filter(c => c.id !== deleteTarget.id));
        onFileDeleted();
      } else {
        throw new Error(data.error || "Errore nell'eliminazione");
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: error instanceof Error ? error.message : "Errore nell'eliminazione",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (contexts.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Nessun file caricato</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground px-1">
        I tuoi file ({contexts.length})
      </h3>
      
      <div className="space-y-2">
        {contexts.map((context) => (
          <div
            key={context.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm">
                {context.file_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {context.lesson_count > 0 
                  ? `${context.lesson_count} lezioni`
                  : "Nessuna lezione generata"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSelectFile(context.id)}
                className="h-8 px-2"
              >
                <BookOpen className="w-4 h-4 mr-1" />
                Studia
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteTarget(context)}
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo file?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare "{deleteTarget?.file_name}".
              {deleteTarget?.lesson_count && deleteTarget.lesson_count > 0 && (
                <span className="block mt-2 font-medium text-destructive">
                  Verranno eliminate anche le {deleteTarget.lesson_count} lezioni associate.
                </span>
              )}
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                "Elimina"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
