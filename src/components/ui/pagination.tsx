import * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  totalItems?: number;
  pageSize?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  totalItems,
  pageSize,
}: PaginationProps) {
  const renderPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("ellipsis");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }
      pages.push(totalPages);
    }

    return pages.map((page, idx) => {
      if (page === "ellipsis") {
        return (
          <span
            key={`ellipsis-${idx}`}
            className="flex h-8 w-8 items-center justify-center text-[rgb(var(--color-text-tertiary))]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </span>
        );
      }

      const isActive = page === currentPage;
      return (
        <Button
          key={page}
          variant={isActive ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-8 w-8 p-0 text-xs",
            isActive
              ? "bg-[rgb(var(--color-primary))] text-white font-semibold"
              : "text-[rgb(var(--color-text-body))] border-[rgb(var(--color-border-default))]"
          )}
          onClick={() => onPageChange(page)}
          aria-label={`Page ${page}`}
          aria-current={isActive ? "page" : undefined}
        >
          {page}
        </Button>
      );
    });
  };

  const startItem = totalItems !== undefined && pageSize !== undefined
    ? Math.min((currentPage - 1) * pageSize + 1, totalItems)
    : undefined;
  const endItem = totalItems !== undefined && pageSize !== undefined
    ? Math.min(currentPage * pageSize, totalItems)
    : undefined;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 text-xs text-[rgb(var(--color-text-secondary))]",
        className
      )}
    >
      {totalItems !== undefined && (
        <div>
          Showing <span className="font-medium text-[rgb(var(--color-text-heading))]">{startItem}</span> to{" "}
          <span className="font-medium text-[rgb(var(--color-text-heading))]">{endItem}</span> of{" "}
          <span className="font-medium text-[rgb(var(--color-text-heading))]">{totalItems}</span> results
        </div>
      )}
      <div className="flex items-center gap-1.5 ml-auto">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs gap-1 border-[rgb(var(--color-border-default))]"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <div className="flex items-center gap-1">{renderPageNumbers()}</div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs gap-1 border-[rgb(var(--color-border-default))]"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
