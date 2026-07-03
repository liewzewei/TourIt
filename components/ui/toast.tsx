"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function ToastViewport({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "fixed right-0 bottom-0 z-100 flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-sm",
        className
      )}
      {...props}
    />
  )
}

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-md border bg-popover p-4 pr-8 text-popover-foreground shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-10 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-right-10",
  {
    variants: {
      variant: {
        default: "border-l-4 border-l-foreground/40",
        success: "border-l-4 border-l-green-600",
        destructive: "border-l-4 border-l-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Toast({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Root> &
  VariantProps<typeof toastVariants>) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
}

function ToastTitle({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Title>) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  )
}

function ToastDescription({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function ToastClose({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      className={cn(
        "absolute top-2 right-2 rounded-md p-1 text-muted-foreground/70 opacity-70 transition hover:text-foreground hover:opacity-100 focus:ring-1 focus:ring-ring focus:outline-none",
        className
      )}
      {...props}
    >
      <XIcon className="size-4" />
      <span className="sr-only">Close</span>
    </ToastPrimitive.Close>
  )
}

export {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
  toastVariants,
}
