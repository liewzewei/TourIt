"use client";

import * as React from "react";

import { ClockIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { fieldTriggerClass } from "@/components/ui/field-trigger";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useCoarsePointer from "@/hooks/useCoarsePointer";
import { formatTime12, generateTimeOptions } from "@/lib/time-options";

type TimeFieldProps = {
  /** 24h "HH:MM", or "" when unset. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  disabled?: boolean;
  placeholder?: string;
  /** Interval between options in the list (default 15). */
  minuteStep?: number;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * Time field: a Popover with a list of times (the registry has no time picker)
 * on pointer devices, and the native `<input type="time">` on touch. The value
 * is a plain 24h "HH:MM" string; a hidden input mirrors it for plain <form>
 * submission. Odd stored values (not on the step grid) still display, and are
 * snapped to the grid only when the user picks a new one.
 */
export default function TimeField({
  value,
  onChange,
  id,
  name,
  disabled,
  placeholder = "Select time",
  minuteStep = 15,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedby,
}: TimeFieldProps) {
  const coarse = useCoarsePointer();
  const [open, setOpen] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const options = React.useMemo(
    () => generateTimeOptions(minuteStep),
    [minuteStep]
  );

  // Bring the selected option into view when the list opens.
  React.useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector('[data-selected="true"]')
      ?.scrollIntoView({ block: "center" });
  }, [open]);

  if (coarse) {
    return (
      <Input
        type="time"
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
            {value ? formatTime12(value) : placeholder}
          </span>
          <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-1"
        >
          <div
            ref={listRef}
            role="listbox"
            className="max-h-60 overflow-y-auto"
          >
            {options.map((opt) => {
              const isSelected = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-selected={isSelected}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground"
                >
                  {formatTime12(opt)}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
