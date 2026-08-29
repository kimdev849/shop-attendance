"use client";

import { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirmation",
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "destructive",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-md">
      <div className="flex gap-3">
        {variant === "destructive" && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
        )}
        <div className="text-sm text-muted-foreground">{message}</div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === "destructive" ? "destructive" : "default"}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "Traitement..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
