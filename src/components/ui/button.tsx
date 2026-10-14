import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-focus-ring))] disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-[rgb(var(--color-primary))] text-white hover:bg-[rgb(var(--color-primary-hover))] shadow-xs active:translate-y-[0.5px]",
        secondary:
          "bg-[rgb(var(--color-bg-surface-hover))] text-[rgb(var(--color-text-heading))] hover:bg-slate-200/70 border border-[rgb(var(--color-border-default))]",
        outline:
          "border border-[rgb(var(--color-border-default))] bg-white hover:bg-[rgb(var(--color-bg-surface-hover))] text-[rgb(var(--color-text-body))]",
        ghost:
          "text-[rgb(var(--color-text-secondary))] hover:bg-[rgb(var(--color-bg-surface-hover))] hover:text-[rgb(var(--color-text-heading))]",
        destructive:
          "bg-[rgb(var(--color-error))] text-white hover:bg-red-600 shadow-xs",
        subtle:
          "bg-[rgb(var(--color-primary-light))] text-[rgb(var(--color-primary))] hover:bg-blue-100/80 font-medium",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 px-2.5 text-xs rounded-[var(--radius-sm)]",
        lg: "h-10 px-5 text-base",
        icon: "h-9 w-9 p-0",
        "icon-sm": "h-7 w-7 p-0 rounded-[var(--radius-sm)]",
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
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
