"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Twitter, Instagram } from "lucide-react";

function TikTokIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="16"
      height="16"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

function TestimonialCard({ testimonial }) {
  return (
    <div className="flex-shrink-0 w-[350px] mx-3 p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      <div className="flex items-start gap-3 mb-4">
        <img
          src={testimonial.author.avatar}
          alt={testimonial.author.name}
          className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/30"
        />
        <div className="flex-1">
          <p className="font-semibold text-white">{testimonial.author.name}</p>
          <p className="text-sm text-emerald-400">{testimonial.author.handle}</p>

          <div className="flex items-center gap-3 mt-2">
            {testimonial.author.socials?.twitter && (
              <a
                href={testimonial.author.socials.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-emerald-400 transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
            )}
            {testimonial.author.socials?.instagram && (
              <a
                href={testimonial.author.socials.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-emerald-400 transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {testimonial.author.socials?.tiktok && (
              <a
                href={testimonial.author.socials.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-emerald-400 transition-colors"
                aria-label="TikTok"
              >
                <TikTokIcon className="w-4 h-4" />
              </a>
            )}
          </div>
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
        "group flex overflow-hidden [--duration:50s] [--gap:1.5rem]",
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
  return (
    <section className={cn("py-16 overflow-hidden", className)}>
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-4">{title}</h2>
        <p className="text-zinc-400 max-w-2xl mx-auto">{description}</p>
      </div>

      <Marquee pauseOnHover>
        {testimonials.map((testimonial, index) => (
          <TestimonialCard key={`testimonial-${index}`} testimonial={testimonial} />
        ))}
      </Marquee>
    </section>
  );
}
