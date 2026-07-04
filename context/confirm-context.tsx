"use client";

import * as React from "react";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CircleAlert } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ConfirmVariant = "default" | "destructive";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
};

type ConfirmContextType = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

// Default resolves false so calling confirm() outside the provider is a safe
// no-op (mirrors the toast context's no-op default).
const ConfirmContext = createContext<ConfirmContextType>({
  confirm: () => Promise.resolve(false),
});

export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: React.PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  // Resolver for the promise returned by the current confirm() call.
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  // The outcome to resolve with; set true only when the action button is
  // clicked. Reading it from onOpenChange keeps a single resolve site, so the
  // result is correct regardless of how the dialog closes.
  const resultRef = useRef(false);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    resultRef.current = false;
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    // Closing (button, Escape, or overlay click) resolves the pending promise.
    // `options` is intentionally left in state so the text doesn't flash blank
    // while the close animation plays.
    if (!next) {
      resolveRef.current?.(resultRef.current);
      resolveRef.current = null;
    }
  }, []);

  const variant = options?.variant ?? "default";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {variant === "destructive" ? (
                <CircleAlert className="size-5 shrink-0 text-destructive" />
              ) : null}
              {options?.title}
            </AlertDialogTitle>
            {options?.description ? (
              <AlertDialogDescription>
                {options.description}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{options?.cancelText ?? "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              variant={variant}
              onClick={() => {
                resultRef.current = true;
              }}
            >
              {options?.confirmText ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}
