"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function formatNumber(value, step = 1) {
  const numValue = Number(value);
  if (isNaN(numValue)) return String(value);
  const decimalPlaces = step.toString().split(".")[1]?.length || 0;
  if (decimalPlaces === 0 && Number.isInteger(numValue)) return numValue.toString();
  return numValue.toFixed(decimalPlaces);
}

const SnappySlider = React.forwardRef(
  (
    {
      values,
      defaultValue,
      value: controlledValue,
      snapping = true,
      min: providedMin,
      max: providedMax,
      step,
      onChange,
      config = {},
      label,
      prefix,
      suffix,
      className,
      ...props
    },
    ref
  ) => {
    const sliderRef = React.useRef(null);
    const { snappingThreshold = 1 } = config;

    const defaultValueArray = [...new Set([...values, defaultValue])].sort((a, b) => a - b);
    const inputMin = providedMin ?? Math.min(...defaultValueArray);
    const inputMax = providedMax ?? Math.max(...defaultValueArray);
    const sliderValues =
      providedMin !== undefined && providedMax !== undefined
        ? defaultValueArray.filter((v) => v >= providedMin && v <= providedMax)
        : defaultValueArray;
    const sliderMin = Math.min(...sliderValues);
    const sliderMax = Math.max(...sliderValues);
    const computedStep = step ?? 0.1;

    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const currentValue = controlledValue ?? internalValue;
    const [inputValue, setInputValue] = React.useState(formatNumber(currentValue, computedStep));

    const isOutOfBounds = currentValue < sliderMin || currentValue > sliderMax;
    const sliderPercentage =
      ((Math.min(Math.max(currentValue, sliderMin), sliderMax) - sliderMin) / (sliderMax - sliderMin)) * 100;

    React.useEffect(() => {
      if (controlledValue !== undefined) {
        setInternalValue(controlledValue);
        setInputValue(formatNumber(controlledValue, computedStep));
      }
    }, [controlledValue, computedStep]);

    const handleValueChange = (newValue) => {
      setInternalValue(newValue);
      setInputValue(formatNumber(newValue, computedStep));
      onChange?.(newValue);
    };

    const handleInputChange = (e) => setInputValue(e.target.value);

    const handleInputBlur = () => {
      const newValue = Number(inputValue);
      if (isNaN(newValue)) {
        setInputValue(formatNumber(currentValue, computedStep));
      } else {
        const clampedValue = Math.max(inputMin, Math.min(inputMax, newValue));
        const steppedValue = Math.round(clampedValue / computedStep) * computedStep;
        setInputValue(formatNumber(steppedValue, computedStep));
        handleValueChange(steppedValue);
      }
    };

    const handleInteraction = React.useCallback(
      (clientX) => {
        const slider = sliderRef.current;
        if (!slider) return;
        const rect = slider.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const rawValue = percentage * (sliderMax - sliderMin) + sliderMin;

        if (snapping) {
          const snapPoints = [...new Set([...defaultValueArray, currentValue])].sort((a, b) => a - b);
          const closestValue = snapPoints.reduce((prev, curr) =>
            Math.abs(curr - rawValue) < Math.abs(prev - rawValue) ? curr : prev
          );
          if (Math.abs(closestValue - rawValue) <= snappingThreshold) {
            handleValueChange(closestValue);
            return;
          }
        }

        const steppedValue = Math.round(rawValue / computedStep) * computedStep;
        const clampedValue = Math.max(sliderMin, Math.min(sliderMax, steppedValue));
        handleValueChange(clampedValue);
      },
      [sliderMin, sliderMax, defaultValueArray, currentValue, computedStep, snapping, snappingThreshold]
    );

    React.useEffect(() => {
      const slider = sliderRef.current;
      if (!slider) return;

      const handleMouseDown = (e) => {
        e.preventDefault();
        handleInteraction(e.clientX);
        document.body.style.userSelect = "none";
        const handleMouseMove = (e) => handleInteraction(e.clientX);
        const handleMouseUp = () => {
          document.removeEventListener("mousemove", handleMouseMove);
          document.body.style.userSelect = "";
        };
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp, { once: true });
      };

      const handleTouchStart = (e) => {
        e.preventDefault();
        handleInteraction(e.touches[0].clientX);
        const handleTouchMove = (e) => handleInteraction(e.touches[0].clientX);
        document.addEventListener("touchmove", handleTouchMove, { passive: false });
        document.addEventListener(
          "touchend",
          () => document.removeEventListener("touchmove", handleTouchMove),
          { once: true }
        );
      };

      slider.addEventListener("mousedown", handleMouseDown);
      slider.addEventListener("touchstart", handleTouchStart, { passive: false });
      return () => {
        slider.removeEventListener("mousedown", handleMouseDown);
        slider.removeEventListener("touchstart", handleTouchStart);
        document.body.style.userSelect = "";
      };
    }, [handleInteraction]);

    React.useEffect(() => {
      const slider = sliderRef.current;
      if (!slider) return;
      const handleDoubleClick = () => handleValueChange(defaultValue);
      slider.addEventListener("dblclick", handleDoubleClick);
      return () => slider.removeEventListener("dblclick", handleDoubleClick);
    }, [defaultValue]);

    const handleKeyDown = (e) => {
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const num = Number(inputValue);
        if (isNaN(num)) return;
        const newValue = num + (e.key === "ArrowUp" ? computedStep : -computedStep);
        const clamped = Math.max(sliderMin, Math.min(sliderMax, newValue));
        setInputValue(formatNumber(clamped, computedStep));
        handleValueChange(clamped);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "[--mark-slider-gap:0.25rem] [--mark-slider-height:0.5rem] [--mark-slider-track-height:0.375rem] [--mark-slider-marker-width:1px]",
          "flex flex-col gap-[--mark-slider-gap] pb-7",
          className
        )}
        {...props}
      >
        <div className="flex justify-between items-center mb-0.5">
          <label className="text-xs font-medium text-primary/50">{label}</label>
          <div
            className={cn(
              "group inline-flex items-center bg-primary/5 rounded px-0.5 focus-within:ring-1 focus-within:ring-primary cursor-text w-20",
              isOutOfBounds && "opacity-75"
            )}
          >
            {prefix && <span className="text-xs text-primary/75 select-none shrink-0">{prefix}</span>}
            <input
              type="number"
              inputMode="decimal"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              className={cn(
                "w-full min-w-0 text-right text-xs bg-transparent border-none focus:outline-none",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                "tabular-nums text-primary",
                isOutOfBounds && "opacity-75"
              )}
            />
            {suffix && <span className="text-xs text-primary/75 select-none shrink-0">{suffix}</span>}
          </div>
        </div>
        <div className="relative h-[--mark-slider-height]">
          <div ref={sliderRef} className="absolute inset-0 cursor-pointer">
            <div className="absolute top-1/2 -translate-y-1/2 w-full h-[--mark-slider-track-height] bg-primary/10 rounded-sm overflow-hidden">
              <div
                className="absolute top-0 h-full z-[1] bg-primary"
                style={{ width: `${sliderPercentage}%` }}
              />
              {sliderValues.map((mark, index) => {
                if (mark === 0) return null;
                const markPercentage = ((mark - sliderMin) / (sliderMax - sliderMin)) * 100;
                if (markPercentage < 0 || markPercentage > 100) return null;
                return (
                  <div
                    key={`${mark}-${index}`}
                    className="absolute top-0 w-[--mark-slider-marker-width] z-[2] h-full -translate-x-[calc(var(--mark-slider-marker-width)/2)] bg-white/90 dark:bg-black/90"
                    style={{ left: `${markPercentage}%` }}
                  />
                );
              })}
            </div>
            {sliderValues.includes(0) && (
              <div
                className="absolute top-1/2 -translate-y-1/2 z-20"
                style={{ left: `${((0 - sliderMin) / (sliderMax - sliderMin)) * 100}%` }}
              >
                <div className="h-3 w-[--mark-slider-marker-width] bg-red-600 -translate-x-[calc(var(--mark-slider-marker-width)/2)]" />
              </div>
            )}
            <div
              className={cn(
                "absolute z-30 top-1/2 -translate-y-[35%] -translate-x-1/2 cursor-grab active:cursor-grabbing",
                isOutOfBounds && "opacity-75"
              )}
              style={{ left: `${sliderPercentage}%` }}
            >
              <div
                className={cn(
                  "w-0 h-0 border-[5px] border-transparent border-b-primary mt-2",
                  isOutOfBounds && "border-b-primary/20"
                )}
              />
              <div className={cn("w-[10px] h-[10px]", isOutOfBounds ? "bg-primary/20" : "bg-primary")} />
              <div className="absolute top-[22px] left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className={cn("text-xs font-medium", isOutOfBounds && "opacity-75")}>
                  {isOutOfBounds
                    ? currentValue < sliderMin
                      ? `<${formatNumber(sliderMin, computedStep)}`
                      : `>${formatNumber(sliderMax, computedStep)}`
                    : formatNumber(currentValue, computedStep)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
SnappySlider.displayName = "SnappySlider";

export { SnappySlider };
