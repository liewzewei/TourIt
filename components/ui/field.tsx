"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

// The plumbing every form field repeats: a label bound to its control, optional
// help text, an optional error, and the aria wiring that ties them together.
//
// A render prop hands the control the ids it needs, so `aria-describedby` and
// `aria-invalid` are always correct instead of being retyped -- or, as in the
// pre-overhaul forms, omitted -- at each call site. The presence of `error` is
// what marks the field invalid; there is no separate `invalid` flag to keep in
// sync with the message. An error message replaces the help text rather than
// stacking under it, so `aria-describedby` only ever points at an element that
// is actually rendered.
//
// This is intentionally NOT the shadcn `field` registry item: that one is a
// composition kit (FieldSet/FieldLegend/orientation variants) that still leaves
// the id and aria wiring to the caller, which is the exact boilerplate this
// wrapper exists to remove.

type FieldRenderProps = {
  id: string
  "aria-describedby": string | undefined
  "aria-invalid": true | undefined
}

type FieldProps = {
  label: React.ReactNode
  children: (field: FieldRenderProps) => React.ReactNode
  description?: React.ReactNode
  error?: string | null
  required?: boolean
  className?: string
}

function Field({
  label,
  children,
  description,
  error,
  required,
  className,
}: FieldProps) {
  const id = React.useId()

  // Only the element that is rendered gets an id, so the described-by list never
  // references a missing node.
  const showDescription = Boolean(description) && !error
  const descriptionId = showDescription ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined

  return (
    <div data-slot="field" className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id} className="gap-1">
        {label}
        {required && (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        )}
      </Label>

      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}

      {showDescription && (
        <p
          id={descriptionId}
          data-slot="field-description"
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          data-slot="field-error"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  )
}

export { Field }
export type { FieldRenderProps }
