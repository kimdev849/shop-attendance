"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Toast {
  id: number;
  message: string;
  variant: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, variant?: Toast["variant"]) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: Toast["variant"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm shadow-lg",
              t.variant === "success" && "border-success/30",
              t.variant === "error" && "border-destructive/30",
            )}
          >
            {t.variant === "success" && <CheckCircle2 className="h-4 w-4 text-success" />}
            {t.variant === "error" && <XCircle className="h-4 w-4 text-destructive" />}
            {t.variant === "info" && <Info className="h-4 w-4 text-primary" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
