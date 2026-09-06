import { useState } from "react";
import { Brain, Zap, RotateCcw, ChevronDown, ChevronUp, AlertTriangle, Layers, BookOpen, HelpCircle, Link } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useStudyTutor, StudyMaterial, Flashcard, DomandaAutovalutazione } from "@/hooks/useStudyTutor";

// ── Flashcard singola con flip ────────────────────────────────────────────────

function FlashcardItem({ fc }: { fc: Flashcard }) {
  const [flipped, setFlipped] = useState(false);
  const colorMap = {
    facile: "bg-success-container text-success border-success/20",
    medio: "bg-warning-container text-warning border-warning/20",
    difficile: "bg-error-container text-error border-error/20",
  };
  return (
    <button
      onClick={() => setFlipped(!flipped)}
      className={cn(
        "w-full text-left p-4 rounded-xl border transition-all duration-200 min-h-[90px] flex flex-col justify-between",
        "hover:shadow-level-1 active:scale-[0.98]",
        flipped ? "bg-primary-container border-primary/20" : "bg-surface-container border-border"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={cn("label-small px-2 py-0.5 rounded-full text-xs font-medium", colorMap[fc.difficolta])}>
          {fc.difficolta}
        </span>
        <span className="label-small text-muted-foreground text-xs">
          {flipped ? "← domanda" : "tocca per risposta →"}
        </span>
      </div>
      <p className={cn("body-medium leading-relaxed", flipped ? "text-primary font-medium" : "text-foreground")}>
        {flipped ? fc.retro : fc.fronte}
      </p>
    </button>
  );
}

// ── Domanda autovalutazione ───────────────────────────────────────────────────

function QuestionItem({ q }: { q: DomandaAutovalutazione }) {
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="p-4 rounded-xl bg-surface-container border border-border space-y-3">
      <p className="body-large font-medium text-foreground">{q.domanda}</p>

      {q.tipo === "scelta_multipla" && q.opzioni.length > 0 && (
        <div className="space-y-2">
          {q.opzioni.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = selected === opt;
            const isCorrect = revealed && opt === q.risposta_corretta;
            const isWrong = revealed && isSelected && opt !== q.risposta_corretta;
            return (
              <button
                key={i}
                onClick={() => !revealed && setSelected(opt)}
                className={cn(
                  "w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all duration-200",
                  isCorrect ? "border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100 font-medium" :
                  isWrong ? "border-rose-500 bg-rose-500/15 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100" :
                  isSelected ? "bg-primary-container border-primary text-primary" :
                  "bg-surface-container-high border-border text-foreground hover:border-primary/50"
                )}
              >
                <span className="font-semibold mr-2">{letter}.</span>{opt}
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setRevealed(!revealed)}
        className="label-small text-primary underline-offset-2 hover:underline text-sm"
      >
        {revealed ? "Nascondi risposta" : "Mostra risposta"}
      </button>

      {revealed && (
        <div className="p-3 rounded-lg bg-emerald-500/15 dark:bg-emerald-950/40 border border-emerald-500/40 space-y-1">
          <p className="label-medium text-emerald-900 dark:text-emerald-100 font-semibold">✓ {q.risposta_corretta}</p>
          <p className="body-small text-muted-foreground">{q.spiegazione_risposta}</p>
        </div>
      )}
    </div>
  );
}

// ── Sezione collassabile ──────────────────────────────────────────────────────

function Section({ title, icon, count, children }: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Card className="border-0">
      <CardHeader
        className="cursor-pointer hover:bg-foreground/[0.04] transition-colors rounded-t-xl"
        onClick={() => setOpen(!open)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
              {icon}
            </div>
            <span className="title-medium">{title}</span>
            {count !== undefined && (
              <span className="label-small px-2 py-0.5 rounded-full bg-surface-container-highest text-muted-foreground text-xs">
                {count}
              </span>
            )}
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

// ── Risultato completo ────────────────────────────────────────────────────────

function StudyMaterialView({ material, onReset }: { material: StudyMaterial; onReset: () => void }) {
  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="m3-card-elevated rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="label-small text-muted-foreground uppercase tracking-wide mb-0.5">Materiale generato</p>
          <h2 className="title-large font-display">{material.titolo_argomento}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="w-4 h-4 mr-1.5" /> Nuovo
        </Button>
      </div>

      {/* Warning */}
      {material.warning && (
        <div className="flex gap-3 p-4 rounded-xl bg-warning-container border border-warning/20">
          <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
          <p className="body-small text-warning">{material.warning}</p>
        </div>
      )}

      {/* Spiegazione Feynman */}
      <Card className="bg-primary-container border-0">
        <CardContent className="pt-5 space-y-2">
          <div className="flex items-center gap-2 label-large text-primary uppercase tracking-wide">
            <Brain className="w-4 h-4" /> Spiegazione semplificata
          </div>
          <p className="body-large text-foreground leading-relaxed">
            {material.sintesi_concettuale.spiegazione_feynman}
          </p>
        </CardContent>
      </Card>

      {/* Concetti chiave */}
      {material.sintesi_concettuale.concetti_chiave.length > 0 && (
        <Section
          title="Concetti chiave"
          icon={<Layers className="w-5 h-5 text-primary" />}
          count={material.sintesi_concettuale.concetti_chiave.length}
        >
          <div className="grid gap-3">
            {material.sintesi_concettuale.concetti_chiave.map((c, i) => (
              <div key={i} className="p-3 rounded-xl bg-surface-container border border-border">
                <p className="label-large font-semibold text-foreground mb-0.5">{c.nome}</p>
                <p className="body-small text-muted-foreground">{c.definizione_breve}</p>
                <p className="label-small text-primary mt-1 italic">{c.perche_importante}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Flashcards */}
      {material.flashcards.length > 0 && (
        <Section
          title="Flashcard"
          icon={<BookOpen className="w-5 h-5 text-primary" />}
          count={material.flashcards.length}
        >
          <div className="grid sm:grid-cols-2 gap-3">
            {material.flashcards.map((fc) => (
              <FlashcardItem key={fc.id} fc={fc} />
            ))}
          </div>
        </Section>
      )}

      {/* Domande autovalutazione */}
      {material.domande_autovalutazione.length > 0 && (
        <Section
          title="Mettiti alla prova"
          icon={<HelpCircle className="w-5 h-5 text-primary" />}
          count={material.domande_autovalutazione.length}
        >
          <div className="space-y-3">
            {material.domande_autovalutazione.map((q) => (
              <QuestionItem key={q.id} q={q} />
            ))}
          </div>
        </Section>
      )}

      {/* Collegamenti suggeriti */}
      {material.collegamenti_suggeriti.length > 0 && (
        <div className="p-4 rounded-xl bg-surface-container border border-border">
          <div className="flex items-center gap-2 label-medium text-muted-foreground mb-3">
            <Link className="w-4 h-4" /> Argomenti collegati
          </div>
          <div className="flex flex-wrap gap-2">
            {material.collegamenti_suggeriti.map((link, i) => (
              <span key={i} className="px-3 py-1 rounded-full bg-secondary-container text-secondary label-small text-sm">
                {link}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principale ─────────────────────────────────────────────────────

export function StudyTutorView() {
  const [inputText, setInputText] = useState("");
  const { material, state, error, generate, reset } = useStudyTutor();

  const handleGenerate = () => generate(inputText);

  const handleReset = () => {
    setInputText("");
    reset();
  };

  if (state === "success" && material) {
    return <StudyMaterialView material={material} onReset={handleReset} />;
  }

  return (
    <div className="space-y-5">
      <div className="m3-card-elevated rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-primary-container flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="title-large font-display">Studio con AI</h2>
            <p className="body-small text-muted-foreground">Incolla i tuoi appunti e ottieni flashcard, concetti e domande</p>
          </div>
        </div>

        <Textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Incolla qui i tuoi appunti, dispense o trascrizioni..."
          className="min-h-[160px] resize-none bg-surface-container border-border"
          disabled={state === "loading"}
        />

        {error && (
          <div className="flex gap-2 p-3 rounded-lg bg-error-container border border-error/20">
            <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
            <p className="body-small text-error">{error}</p>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={state === "loading" || inputText.trim().length < 20}
          className="w-full h-12"
          size="lg"
        >
          {state === "loading" ? (
            <>
              <span className="animate-spin mr-2">⟳</span> Analisi in corso...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 mr-2" /> Genera materiale di studio
            </>
          )}
        </Button>
      </div>

      {state === "loading" && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-surface-container animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}
