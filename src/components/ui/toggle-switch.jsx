"use client";

import React from "react";
import { cn } from "@/lib/utils";
import "./toggle-switch.css";

export function ToggleSwitch({
  id = "toggle-switch",
  checked = false,
  onCheckedChange,
  className,
  ...props
}) {
  return (
    <div className={cn("toggle-switch-wrapper", className)} {...props}>
      <div className="toggle-switch">
        <input
          className="toggle-switch-check"
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          aria-label={checked ? "Annual billing" : "Monthly billing"}
        />
        <label className="toggle-switch-label" htmlFor={id}>
          <span className="sr-only">{checked ? "Annual" : "Monthly"}</span>
          <span className="toggle-switch-thumb" />
        </label>
      </div>
    </div>
  );
}
