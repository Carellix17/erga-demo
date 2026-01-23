import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (event: {
    subject: string;
    title: string;
    date: string;
    type: "test" | "assignment";
  }) => void;
}

export function AddEventSheet({ open, onOpenChange, onAdd }: AddEventSheetProps) {
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<"test" | "assignment">("test");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (subject && title && date) {
      onAdd({ subject, title, date, type });
      setSubject("");
      setTitle("");
      setDate("");
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-safe">
        <SheetHeader className="mb-6">
          <SheetTitle>Aggiungi evento</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === "test" ? "default" : "outline"}
              size="sm"
              onClick={() => setType("test")}
              className="flex-1"
            >
              Verifica
            </Button>
            <Button
              type="button"
              variant={type === "assignment" ? "default" : "outline"}
              size="sm"
              onClick={() => setType("assignment")}
              className="flex-1"
            >
              Compito
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Materia</Label>
            <Input
              id="subject"
              placeholder="Es. Matematica"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titolo</Label>
            <Input
              id="title"
              placeholder="Es. Capitolo 5 - Derivate"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          <Button type="submit" className="w-full" size="lg">
            Aggiungi
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
