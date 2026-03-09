"use client";

import React from "react";
import { cn } from "@/lib/utils";

function TestimonialCard({ testimonial }) {
  return (
    <div className="flex-shrink-0 w-[350px] mx-3 p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <img
          src={testimonial.author.avatar}
          alt={testimonial.author.name}
          className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/30"
        />
        <div>
          <p className="font-semibold text-white">{testimonial.author.name}</p>
          <p className="text-sm text-emerald-400">{testimonial.author.handle}</p>
        </div>
      </div>
      <p className="text-zinc-300 text-sm leading-relaxed">{testimonial.text}</p>
    </div>
  );
}

function Marquee({ children, reverse = false, pauseOnHover = true, className }) {
  return (
    <div
      className={cn(
        "group flex overflow-hidden [--duration:40s] [--gap:1.5rem]",
        className
      )}
    >
      <div
        className={cn(
          "flex gap-[--gap] animate-marquee shrink-0",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
          reverse && "[animation-direction:reverse]"
        )}
      >
        {children}
        {children}
      </div>
    </div>
  );
}

export function TestimonialsSection({
  title,
  description,
  testimonials,
  className,
}) {
  const midpoint = Math.ceil(testimonials.length / 2);
  const firstRow = testimonials.slice(0, midpoint);
  const secondRow = testimonials.slice(midpoint);

  return (
    <section className={cn("py-16 overflow-hidden", className)}>
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-4">{title}</h2>
        <p className="text-zinc-400 max-w-2xl mx-auto">{description}</p>
      </div>

      <div className="flex flex-col gap-6">
        <Marquee pauseOnHover>
          {firstRow.map((testimonial, index) => (
            <TestimonialCard key={`row1-${index}`} testimonial={testimonial} />
          ))}
        </Marquee>

        <Marquee reverse pauseOnHover>
          {secondRow.map((testimonial, index) => (
            <TestimonialCard key={`row2-${index}`} testimonial={testimonial} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}
