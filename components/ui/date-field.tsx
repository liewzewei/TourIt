"use client";

import * as React from "react";

import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { fieldTriggerClass } from "@/components/ui/field-trigger";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useCoarsePointer from "@/hooks/useCoarsePointer";

type DateFieldProps = {
  /** ISO date "YYYY-MM-DD", or "" when unset. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  placeholder?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * Date field: a Popover + Calendar on pointer devices, and the native
 * `<input type="date">` on touch so mobile keeps its wheel UX. The value stays a
 * plain "YYYY-MM-DD" string either way; a hidden input mirrors it so the field
 * works inside a plain <form>.
 */
export default function DateField({
  value,
  onChange,
  id,
  name,
  disabled,
  placeholder = "Pick a date",
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
}: DateFieldProps) {
  const coarse = useCoarsePointer();
  const [open, setOpen] = React.useState(false);

  if (coarse) {
    return (
      <Input
        type="date"
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedby}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  // parseISO reads a date-only string as local midnight, and format() writes it
  // back from local components -- so the calendar never drifts a day by timezone.
  const selected = value ? parseISO(value) : undefined;

  return (
    <>
      {name && <input type="hidden" name={name} value={value} />}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          className={cn(fieldTriggerClass, !value && "text-muted-foreground")}
        >
          <span className="truncate">
            {selected ? format(selected, "PP") : placeholder}
          </span>
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto p-0"
          // Flatten the lift geometry for the subtree: calendar day/nav buttons
          // are our Button (which carries `lift`), and a -6px hop per cell reads
          // as jitter in a grid. Press feedback is left intact.
          style={
            {
              "--lift-y": "0px",
              "--lift-scale": "1",
              "--shadow-lifted": "none",
            } as React.CSSProperties
          }
        >
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            autoFocus
            onSelect={(date) => {
              onChange(date ? format(date, "yyyy-MM-dd") : "");
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
