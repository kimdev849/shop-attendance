"use client";

import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableHeadProps {
  label: string;
  field: string;
  currentSort?: string;
  currentOrder?: "asc" | "desc";
  onSort: (field: string, order: "asc" | "desc") => void;
  className?: string;
}

export function SortableHead({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
  className,
}: SortableHeadProps) {
  const isActive = currentSort === field;

  function handleClick() {
    if (isActive && currentOrder === "asc") {
      onSort(field, "desc");
    } else if (isActive && currentOrder === "desc") {
      onSort("", "asc"); // reset
    } else {
      onSort(field, "asc");
    }
  }

  return (
    <th
      onClick={handleClick}
      className={cn(
        "h-10 cursor-pointer select-none px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground",
        isActive && "text-foreground",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          currentOrder === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}
