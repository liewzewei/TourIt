"use client";

import { cn } from "@/lib/utils";
import TimeField from "@/components/ui/time-field";
import { isValidTimeRange } from "@/lib/time-constraints";

type TimeRangeFieldProps = {
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  startLabel?: string;
  endLabel?: string;
  startName?: string;
  endName?: string;
  startId?: string;
  endId?: string;
  disabled?: boolean;
  minuteStep?: number;
  /** Message shown when start is not strictly before end. */
  error?: string;
  className?: string;
};

/**
 * Two composed TimeFields with an inline "start must be before end" error, using
 * the shared isValidTimeRange helper. This is presentational only -- the
 * authoritative operating-hours and overlap checks stay in the submit handlers
 * and the DB constraints.
 */
export default function TimeRangeField({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  startLabel = "From",
  endLabel = "To",
  startName,
  endName,
  startId,
  endId,
  disabled,
  minuteStep,
  error = "End time must be after start time.",
  className,
}: TimeRangeFieldProps) {
  const invalid =
    !disabled &&
    startValue !== "" &&
    endValue !== "" &&
    !isValidTimeRange(startValue, endValue);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          {startLabel && (
            <label htmlFor={startId} className="text-sm font-medium">
              {startLabel}
            </label>
          )}
          <TimeField
            id={startId}
            name={startName}
            value={startValue}
            onChange={onStartChange}
            disabled={disabled}
            minuteStep={minuteStep}
            aria-invalid={invalid || undefined}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          {endLabel && (
            <label htmlFor={endId} className="text-sm font-medium">
              {endLabel}
            </label>
          )}
          <TimeField
            id={endId}
            name={endName}
            value={endValue}
            onChange={onEndChange}
            disabled={disabled}
            minuteStep={minuteStep}
            aria-invalid={invalid || undefined}
          />
        </div>
      </div>
      {invalid && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
