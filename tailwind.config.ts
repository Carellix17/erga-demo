/* eslint-disable @typescript-eslint/no-require-imports -- QUARANTENA P21i: eredita'.
   I plugin Tailwind si registrano con require() (forma ufficiale dei config). */
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // P45 — il ring-offset di default di Tailwind è #fff: in dark mode ogni
      // focus/press con ring-offset-2 mostrava un alone BIANCO PIENO attorno
      // al bottone. Ora l'offset segue lo sfondo della pagina in ogni tema.
      ringOffsetColor: {
        DEFAULT: "hsl(var(--background))",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        scrim: "hsl(var(--scrim) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          container: "hsl(var(--primary-container))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          container: "hsl(var(--secondary-container))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        tertiary: {
          DEFAULT: "hsl(var(--tertiary))",
          foreground: "hsl(var(--tertiary-foreground))",
          container: "hsl(var(--tertiary-container))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          container: "hsl(var(--success-container))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        outline: {
          DEFAULT: "hsl(var(--outline))",
          variant: "hsl(var(--outline-variant))",
        },
        surface: {
          DEFAULT: "hsl(var(--background))",
          //  P36 — dark luxury: hero avorio e card secondaria notte (token fissi)
          cream: "hsl(var(--surface-cream))",
          "cream-foreground": "hsl(var(--surface-cream-foreground))",
          "cream-muted": "hsl(var(--surface-cream-muted))",
          "dark-card": "hsl(var(--surface-dark-card))",
          dim: "hsl(var(--surface-dim))",
          bright: "hsl(var(--surface-bright))",
          "container-lowest": "hsl(var(--surface-container-lowest))",
          "container-low": "hsl(var(--surface-container-low))",
          container: "hsl(var(--surface-container))",
          "container-high": "hsl(var(--surface-container-high))",
          "container-highest": "hsl(var(--surface-container-highest))",
        },
        inverse: {
          surface: "hsl(var(--inverse-surface))",
          "on-surface": "hsl(var(--inverse-on-surface))",
          primary: "hsl(var(--inverse-primary))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "off-white": "rgb(var(--off-white) / <alpha-value>)",
        ink: "hsl(var(--ink) / <alpha-value>)",
        cream: "hsl(var(--cream) / <alpha-value>)",
        "cream-hover": "rgb(var(--cream-hover) / <alpha-value>)",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        //  P21e — pastelli materia domati (i valori vivono in index.css, dual-theme)
        "pastel-terracotta": "hsl(var(--pastel-terracotta))",
        "pastel-polvere": "hsl(var(--pastel-polvere))",
        "pastel-ocra": "hsl(var(--pastel-ocra))",
        "pastel-prugna": "hsl(var(--pastel-prugna))",
        "pastel-crepuscolo": "hsl(var(--pastel-crepuscolo))",
        "pastel-mare": "hsl(var(--pastel-mare))",
        "pastel-violetto": "hsl(var(--pastel-violetto))",
        "pastel-cipria": "hsl(var(--pastel-cipria))",
        "pastel-grafite": "hsl(var(--pastel-grafite))",
        "pastel-miele": "hsl(var(--pastel-miele))",
        "pastel-neutro": "hsl(var(--pastel-neutro))",
        //  P24 — firme del guscio: nav a pillola (neutro) e puntino neutro
        nav: {
          DEFAULT: "hsl(var(--nav-surface))",
          foreground: "hsl(var(--nav-foreground))",
        },
        //  P24 × MONOCROMO — accento dinamico della materia (var CSS)
        "subject-accent": "var(--subject-accent)",
        "subject-accent-foreground": "var(--subject-accent-foreground)",
        "subject-accent-light": "var(--subject-accent-light)",
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        card: "var(--radius-card)",
        button: "var(--radius-button)",
        pill: "var(--radius-pill)",
        dialog: "var(--radius-dialog)",
        media: "var(--radius-media)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        "level-0": "var(--shadow-level-0)",
        "level-1": "var(--shadow-level-1)",
        "level-2": "var(--shadow-level-2)",
        "level-3": "var(--shadow-level-3)",
        "level-4": "var(--shadow-level-4)",
        "level-5": "var(--shadow-level-5)",
        //  P34 — ombre tattili (Home V3): profilo leggero per card/pillole
        // glass e profondità riservata alla card corso attiva.
        // P35 — ombra dell'eroe: goccia decisa per la card percorso su fondo scuro.
        tactile: "var(--shadow-tattile)",
        "card-active": "var(--shadow-card-active)",
        hero: "var(--shadow-hero-card)",
      },
      fontFamily: {
        // Font caricati da Google Fonts nel <link> di index.html, con gamma di pesi
        // completa (Montserrat e Raleway 100–900, Zalando Sans Expanded 200–900):
        // nessun file di font nel repo, nessun @font-face manuale.
        sans: ['Montserrat', 'Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Montserrat', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['Montserrat', 'Plus Jakarta Sans', 'serif'],
        body: ['Montserrat', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['Raleway', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        // Usato SOLO dal messaggio di benvenuto della Home (HomeHeader).
        welcome: ['Zalando Sans Expanded', 'Montserrat', 'system-ui', 'sans-serif'],
        //  P36 — Radja: titoli focali e macro-metriche della card eroe.
        radja: ['Radja', 'Zalando Sans Expanded', 'Montserrat', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      transitionTimingFunction: {
        "m3-emphasized": "cubic-bezier(0.2, 0, 0, 1)",
        "m3-emphasized-decel": "cubic-bezier(0.05, 0.7, 0.1, 1)",
        "m3-emphasized-accel": "cubic-bezier(0.3, 0, 0.8, 0.15)",
        "m3-standard": "cubic-bezier(0.2, 0, 0, 1)",
        "m3-standard-decel": "cubic-bezier(0, 0, 0, 1)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
} satisfies Config;
