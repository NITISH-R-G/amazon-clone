"use client";

import { Minus, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  name: string;
  defaultValue?: number;
  min?: number;
  max: number;
  label?: string;
  /** Called with the new value after a step or a committed edit. */
  onCommit?: (value: number) => void;
  disabled?: boolean;
};

export function QuantityStepper({ name, defaultValue = 1, min = 1, max, label = "Quantity", onCommit, disabled }: Props) {
  const id = useId();
  const [value, setValue] = useState(String(defaultValue));

  const clamp = (n: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? Math.trunc(n) : min));
  const commit = (n: number) => {
    const next = clamp(n);
    setValue(String(next));
    onCommit?.(next);
  };

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Decrease quantity"
        disabled={disabled || Number(value) <= min}
        onClick={() => commit(Number(value) - 1)}
      >
        <Minus aria-hidden="true" />
      </Button>
      <Input
        id={id}
        name={name}
        inputMode="numeric"
        autoComplete="off"
        className="h-9 w-14 text-center"
        value={value}
        disabled={disabled}
        aria-describedby={`${id}-max`}
        onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
        onBlur={() => commit(Number(value || min))}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Increase quantity"
        disabled={disabled || Number(value) >= max}
        onClick={() => commit(Number(value) + 1)}
      >
        <Plus aria-hidden="true" />
      </Button>
      <span id={`${id}-max`} className="sr-only">
        Maximum {max}
      </span>
    </div>
  );
}
