"use client";

import { cn } from "@/lib/utils";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 6, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex gap-4 border-b border-border bg-secondary/60 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={`h-${i}`}
            className={cn("h-3 rounded bg-muted-foreground/15", i === 0 ? "w-24" : "w-20")}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`r-${r}`} className="flex gap-4 border-b border-border px-4 py-4">
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={`r-${r}-c-${c}`}
              className={cn(
                "h-3 rounded bg-muted-foreground/10",
                c === 0 ? "w-28" : c === columns - 1 ? "w-16" : "w-20",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
