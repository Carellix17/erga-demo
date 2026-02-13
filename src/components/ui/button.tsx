import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium relative overflow-hidden transition-all duration-300 ease-m3-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-38 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-level-0 hover:shadow-level-1 rounded-full state-layer",
        destructive:
          "bg-destructive text-destructive-foreground shadow-level-0 hover:shadow-level-1 rounded-full state-layer",
        outline:
          "border border-outline bg-transparent text-primary hover:bg-primary/[0.08] rounded-full",
        secondary:
          "bg-secondary-container text-secondary-foreground shadow-level-0 hover:shadow-level-1 rounded-full state-layer",
        ghost:
          "text-foreground hover:bg-foreground/[0.08] rounded-full",
        link:
          "text-primary underline-offset-4 hover:underline",
        tonal:
          "bg-secondary-container text-secondary-foreground hover:shadow-level-1 rounded-full state-layer",
        fab:
          "bg-primary-container text-primary shadow-level-3 hover:shadow-level-4 rounded-lg state-layer",
        "fab-secondary":
          "bg-secondary-container text-secondary shadow-level-3 hover:shadow-level-4 rounded-lg state-layer",
        "fab-tertiary":
          "bg-tertiary-container text-tertiary shadow-level-3 hover:shadow-level-4 rounded-lg state-layer",
        elevated:
          "bg-surface-container-low text-primary shadow-level-1 hover:shadow-level-2 rounded-full state-layer",
      },
      size: {
        default: "h-10 px-6",
        sm: "h-8 px-4 text-xs",
        lg: "h-14 px-8 text-base",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
        fab: "h-14 w-14",
        "fab-extended": "h-14 px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
