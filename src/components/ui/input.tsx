import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-[rgb(var(--color-text-tertiary))]">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-9 w-full rounded-[var(--radius-md)] border bg-white px-3 py-1 text-sm text-[rgb(var(--color-text-heading))] placeholder:text-[rgb(var(--color-text-tertiary))] transition-colors shadow-xs",
            "border-[rgb(var(--color-border-default))]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-focus-ring))] focus-visible:border-[rgb(var(--color-primary))]",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
            error &&
              "border-[rgb(var(--color-error))] focus-visible:ring-[rgb(var(--color-error))] focus-visible:border-[rgb(var(--color-error))]",
            className,
            leftIcon && "pl-9",
            rightIcon && "pr-9"
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 flex items-center text-[rgb(var(--color-text-tertiary))]">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
