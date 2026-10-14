import * as React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function Breadcrumbs({
  items,
  showHome = true,
  className,
}: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center space-x-1.5 text-xs text-[rgb(var(--color-text-tertiary))]", className)}
    >
      {showHome && (
        <Link
          href="/"
          className="flex items-center hover:text-[rgb(var(--color-primary))] transition-colors"
          aria-label="Home"
        >
          <Home className="h-3.5 w-3.5" />
        </Link>
      )}

      {showHome && items.length > 0 && (
        <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
      )}

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-[rgb(var(--color-primary))] transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  isLast
                    ? "font-medium text-[rgb(var(--color-text-secondary))]"
                    : "text-[rgb(var(--color-text-tertiary))]"
                )}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}

            {!isLast && (
              <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
