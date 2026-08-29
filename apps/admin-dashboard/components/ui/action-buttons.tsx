"use client";

import { Eye, Pencil, Trash2, Power, PowerOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  className?: string;
}

function IconBtn({
  icon: Icon,
  label,
  onClick,
  className,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function ActionButtons({
  onView,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  className,
}: ActionButtonsProps) {
  return (
    <div className={cn("flex items-center justify-end gap-0.5", className)}>
      {onView && <IconBtn icon={Eye} label="Visualiser" onClick={onView} />}
      {onEdit && <IconBtn icon={Pencil} label="Modifier" onClick={onEdit} />}
      {onActivate && (
        <IconBtn icon={Power} label="Activer" onClick={onActivate} className="hover:text-success" />
      )}
      {onDeactivate && (
        <IconBtn
          icon={PowerOff}
          label="Désactiver"
          onClick={onDeactivate}
          className="hover:text-warning"
        />
      )}
      {onDelete && (
        <IconBtn
          icon={Trash2}
          label="Supprimer"
          onClick={onDelete}
          className="hover:text-destructive"
        />
      )}
    </div>
  );
}
