import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * 🛡️ P45 — guardie anti-regresso per i due bug mobile:
 * 1) la Chat dello Studio non usa MAI più hack calc(100vh-6rem)/-mb-24
 *    che seppellivano il campo di input sotto la barra di navigazione;
 * 2) niente bianco pieno negli stati attivi/premuti dei bottoni (dark mode):
 *    il ring-offset di default non deve essere #fff (alone bianco attorno al
 *    focus) e nessun controllo applica bg-white pieno su active/hover.
 */

const ROOT = join(__dirname, "..", "..");

describe("P45 — layout Chat Studio (input sempre visibile)", () => {
  const studio = readFileSync(join(ROOT, "src/components/studio/StudioView.tsx"), "utf8");
  const index = readFileSync(join(ROOT, "src/pages/Index.tsx"), "utf8");

  it("niente hack calc(100vh-6rem) né margine negativo -mb-24", () => {
    expect(studio).not.toMatch(/100vh-6rem/);
    expect(studio).not.toMatch(/-mb-24/);
  });

  it("la sottovista Chat riempie lo spazio reale (h-full + safe-area)", () => {
    expect(studio).toMatch(/h-full min-h-0 flex-1 flex-col pb-\[env\(safe-area-inset-bottom\)\]/);
  });

  it("la pagina attiva fillViewport quando la Chat dello Studio è aperta", () => {
    expect(index).toMatch(/fillViewport=\{activeTab === "pratica" \|\| studioChatOpen\}/);
    expect(index).toMatch(/onChatLayoutChange=\{setStudioChatOpen\}/);
  });
});

describe("P45 — niente bianco-su-bianco in dark mode", () => {
  it("il ring-offset di default segue lo sfondo (non #fff di Tailwind)", () => {
    const tailwind = readFileSync(join(ROOT, "tailwind.config.ts"), "utf8");
    expect(tailwind).toMatch(/ringOffsetColor:\s*\{\s*DEFAULT:\s*"hsl\(var\(--background\)\)"/);
  });

  it("i trigger dei menù abbinano il testo quando cambia lo sfondo (bg-accent)", () => {
    const dropdown = readFileSync(join(ROOT, "src/components/ui/dropdown-menu.tsx"), "utf8");
    expect(dropdown).toMatch(/data-\[state=open\]:bg-accent data-\[state=open\]:text-accent-foreground/);
    expect(dropdown).toMatch(/focus:bg-accent focus:text-accent-foreground/);
  });

  it("nessun bottone diventa bianco pieno su active/hover/focus (fuori landing)", () => {
    const problems: string[] = [];
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (p.startsWith(join(ROOT, "src/components/landing"))) continue;
        if (statSync(p).isDirectory()) out.push(...walk(p));
        else if (/\.tsx$/.test(name)) out.push(p);
      }
      return out;
    };
    for (const file of walk(join(ROOT, "src"))) {
      const content = readFileSync(file, "utf8");
      if (/(?:active|hover|focus|focus-visible|data-\[state=(?:active|open|on)\]):(?:bg|to|via|from)-white(?![/\w-])/.test(content)) {
        problems.push(file);
      }
    }
    expect(problems).toEqual([]);
  });
});
