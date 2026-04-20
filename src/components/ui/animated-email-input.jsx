"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const containerVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const letterVariants = {
  initial: {
    y: 0,
    color: "inherit",
  },
  animate: {
    y: "-120%",
    color: "rgb(113 113 122)",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
};

export function AnimatedEmailInput({
  label = "email",
  className = "",
  value,
  type = "email",
  disabled,
  required,
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);
  const showLabel = isFocused || (value && value.length > 0);

  return (
    <div className={cn("relative w-full max-w-md", className)}>
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-zinc-900 dark:text-zinc-100 text-center"
        variants={containerVariants}
        initial="initial"
        animate={showLabel ? "animate" : "initial"}
      >
        {label.split("").map((char, index) => (
          <motion.span
            key={index}
            className="inline-block text-sm"
            variants={letterVariants}
            style={{ willChange: "transform" }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.div>

      <input
        type={type}
        value={value}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        required={required}
        placeholder=" "
        className={cn(
          "outline-none border-b-2 py-2 w-full text-base font-medium bg-transparent placeholder-transparent",
          "border-zinc-900 dark:border-zinc-400 text-zinc-900 dark:text-zinc-100",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "focus:border-primary focus:ring-0"
        )}
        {...props}
      />
    </div>
  );
}
