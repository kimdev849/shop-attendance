"use client";

import { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onReset?: () => void;
  resetLabel?: string;
}

export function EmptyState({
  icon,
  message,
  actionLabel,
  onAction,
  onReset,
  resetLabel = "Réinitialiser la recherche",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="text-muted-foreground">{icon ?? <Inbox className="h-10 w-10" />}</div>
      <p className="text-sm text-muted-foreground">{message}</p>
      <div className="flex gap-2">
        {onReset && (
          <Button variant="outline" size="sm" onClick={onReset}>
            {resetLabel}
          </Button>
        )}
        {actionLabel && onAction && (
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
