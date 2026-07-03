"use client";

import * as React from "react";
import { createContext, useCallback, useContext, useState } from "react";
import { Toast as ToastPrimitive } from "radix-ui";
import { CircleAlert, CircleCheck, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

type ToastVariant = "default" | "success" | "destructive";

type ToastOptions = {
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastItem = ToastOptions & { id: number; open: boolean };

type ToastContextType = {
  toast: (options: ToastOptions) => void;
};

// Default no-op so consuming a toast outside the provider never throws.
const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

const VARIANT_ICON: Record<
  ToastVariant,
  React.ComponentType<{ className?: string }>
> = {
  default: Info,
  success: CircleCheck,
  destructive: CircleAlert,
};

const VARIANT_ICON_COLOR: Record<ToastVariant, string> = {
  default: "text-muted-foreground",
  success: "text-green-600",
  destructive: "text-destructive",
};

// Monotonic id so React keys stay stable across re-renders.
let nextToastId = 0;

export function ToastProvider({ children }: React.PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((options: ToastOptions) => {
    setToasts((prev) => [
      ...prev,
      { variant: "default", ...options, id: ++nextToastId, open: true },
    ]);
  }, []);

  const handleOpenChange = useCallback((id: number, open: boolean) => {
    if (open) return;
    // Flip `open` to false so Radix can play the exit animation, then drop
    // the toast from state once the animation has had time to finish.
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {toasts.map(({ id, title, description, variant = "default", duration, open }) => {
          const Icon = VARIANT_ICON[variant];
          return (
            <Toast
              key={id}
              variant={variant}
              open={open}
              duration={duration}
              onOpenChange={(next) => handleOpenChange(id, next)}
            >
              <Icon className={cn("mt-0.5 size-4 shrink-0", VARIANT_ICON_COLOR[variant])} />
              <div className="grid gap-1">
                {title ? <ToastTitle>{title}</ToastTitle> : null}
                <ToastDescription>{description}</ToastDescription>
              </div>
              <ToastClose />
            </Toast>
          );
        })}
        <ToastViewport />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
