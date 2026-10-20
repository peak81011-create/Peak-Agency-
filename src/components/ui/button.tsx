import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border border-transparent font-semibold leading-tight no-underline transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        accent: "bg-accent text-accent-foreground hover:bg-accent-hover",
        secondary: "bg-card text-primary border-border-strong hover:bg-sage-50 hover:border-forest-500",
        ghost: "bg-transparent text-forest-800 hover:bg-muted",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive-hover",
        "destructive-ghost": "bg-card text-destructive border-t-red-bg hover:bg-t-red-bg",
        "on-dark": "bg-transparent text-sage-100 border-forest-600 hover:bg-forest-800",
      },
      size: {
        sm: "min-h-11 md:min-h-9 px-3 py-1.5 text-[13px]",
        md: "min-h-11 px-[18px] py-2.5 text-sm",
        lg: "min-h-13 px-6 py-3.5 text-base",
        icon: "min-h-11 min-w-11 p-2.5",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, block, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}
