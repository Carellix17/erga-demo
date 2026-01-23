import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-soft-sm hover:shadow-soft-md hover:brightness-110 rounded-2xl",
        destructive:
          "bg-destructive text-destructive-foreground shadow-soft-sm hover:shadow-soft-md hover:brightness-110 rounded-2xl",
        outline:
          "border-2 border-primary bg-transparent text-primary hover:bg-primary/10 rounded-2xl",
        secondary:
          "bg-secondary text-secondary-foreground shadow-soft-sm hover:shadow-soft-md hover:brightness-95 rounded-2xl",
        ghost: 
          "text-foreground hover:bg-muted rounded-2xl",
        link: 
          "text-primary underline-offset-4 hover:underline",
        tonal:
          "bg-primary/15 text-primary hover:bg-primary/25 rounded-2xl",
        fab:
          "bg-primary text-primary-foreground shadow-soft-lg hover:shadow-soft-xl hover:brightness-110 rounded-xl",
        "fab-secondary":
          "bg-secondary text-secondary-foreground shadow-soft-lg hover:shadow-soft-xl rounded-xl",
        "fab-tertiary":
          "bg-tertiary text-tertiary-foreground shadow-soft-lg hover:shadow-soft-xl hover:brightness-110 rounded-xl",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-10 px-4 text-xs",
        lg: "h-14 px-8 text-base",
        icon: "h-12 w-12",
        "icon-sm": "h-10 w-10",
        "icon-lg": "h-14 w-14",
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
