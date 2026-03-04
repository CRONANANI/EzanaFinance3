"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FloatingInput({
  label = "Email",
  type = "email",
  icon = <Mail size={18} />,
  value: controlledValue,
  onChange: controlledOnChange,
  disabled,
  required,
  id: providedId,
  ...inputProps
}) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const [internalValue, setInternalValue] = useState("");
  const [focused, setFocused] = useState(false);

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;
  const isFloating = focused || (value && value.length > 0);

  const handleChange = (e) => {
    if (isControlled && controlledOnChange) {
      controlledOnChange(e);
    } else {
      setInternalValue(e.target.value);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors z-10 pointer-events-none">
          {icon}
        </span>
      )}

      <Input
        id={id}
        type={type}
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder=" "
        disabled={disabled}
        required={required}
        className={cn(
          "h-12 rounded-2xl ps-12 pt-4 border-2 border-input",
          "bg-background shadow-sm transition-all",
          "focus:border-primary focus:ring-2 focus:ring-primary/30",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
        {...inputProps}
      />

      <Label
        htmlFor={id}
        className={cn(
          "absolute left-9 text-muted-foreground text-base transition-all pointer-events-none z-10",
          isFloating
            ? "top-1 text-xs text-primary"
            : "top-1/2 -translate-y-1/2 text-base text-muted-foreground"
        )}
      >
        {label}
      </Label>

      <div
        className={cn(
          "absolute inset-x-2 -bottom-2 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent transition-opacity pointer-events-none",
          focused ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
