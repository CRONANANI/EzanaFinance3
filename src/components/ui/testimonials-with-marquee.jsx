"use client";

import "@/components/ui/testimonials.css";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

function Marquee({ children, pauseOnHover = true, direction = "left", speed = 40, className }) {
  const [duration, setDuration] = useState(40);
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.scrollWidth / 2;
      setDuration(containerWidth / speed);
    }
  }, [speed, children]);

  return (
    <div className={cn("group flex overflow-hidden [--gap:1rem] gap-[var(--gap)]", className)}>
      <div
        ref={containerRef}
        className={cn(
          "flex shrink-0 gap-[var(--gap)] min-w-full justify-around animate-marquee",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
          direction === "right" && "[animation-direction:reverse]"
        )}
        style={{ animationDuration: `${duration}s` }}
      >
        {children}
      </div>
      <div
        className={cn(
          "flex shrink-0 gap-[var(--gap)] min-w-full justify-around animate-marquee",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
          direction === "right" && "[animation-direction:reverse]"
        )}
        style={{ animationDuration: `${duration}s` }}
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  );
}

function TestimonialCard({ author, text }) {
  return (
    <div className="testimonial-card">
      <div className="testimonial-content">
        <p className="testimonial-text">{text}</p>
      </div>
      <div className="testimonial-author">
        {author?.avatar && (
          <img src={author.avatar} alt={author.name} className="author-avatar" />
        )}
        <div className="author-info">
          <span className="author-name">{author?.name}</span>
          <span className="author-handle">{author?.handle}</span>
        </div>
        {author?.socials && (
          <div className="author-socials">
            {author.socials.twitter && (
              <a href={author.socials.twitter} target="_blank" rel="noopener noreferrer" className="social-link">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
            )}
            {author.socials.instagram && (
              <a href={author.socials.instagram} target="_blank" rel="noopener noreferrer" className="social-link">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" /></svg>
              </a>
            )}
            {author.socials.tiktok && (
              <a href={author.socials.tiktok} target="_blank" rel="noopener noreferrer" className="social-link">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" /></svg>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function TestimonialsSection({
  title = "Trusted by Industry Leaders",
  description = "Join thousands of investors who use Ezana to track congressional trades, institutional holdings, and market intelligence.",
  testimonials = [],
  className,
  reversed = false,
}) {
  if (reversed) {
    return (
      <section className={cn("testimonials-section reversed", className)}>
        <div className="testimonials-container">
          <div className="testimonials-carousel">
            <Marquee pauseOnHover speed={30}>
              {testimonials.map((t, i) => (
                <TestimonialCard key={i} author={t.author} text={t.text} />
              ))}
            </Marquee>
          </div>
          <div className="testimonials-header">
            <h2 className="testimonials-title">{title}</h2>
            <p className="testimonials-description">{description}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("testimonials-section", className)}>
      <div className="testimonials-container">
        <div className="testimonials-header">
          <h2 className="testimonials-title">{title}</h2>
          <p className="testimonials-description">{description}</p>
        </div>
        <div className="testimonials-carousel">
          <Marquee pauseOnHover speed={30}>
            {testimonials.map((t, i) => (
              <TestimonialCard key={i} author={t.author} text={t.text} />
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}

export default TestimonialsSection;
