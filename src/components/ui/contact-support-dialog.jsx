"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { Contact2 } from "@/components/ui/contact-2";
import { cn } from "@/lib/utils";

export function ContactSupportDialog({ open, onOpenChange }) {
  const [success, setSuccess] = React.useState(false);
  const formRef = React.useRef(null);

  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") onOpenChange?.(false);
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  const handleSubmit = (data, form) => {
    const bodyText = `Name: ${data.firstname} ${data.lastname}\nEmail: ${data.email}\nSubject: ${data.subject || "Support"}\n\nMessage:\n${data.message}`;
    const mailto = `mailto:support@ezana.world?subject=${encodeURIComponent(data.subject || "Support Request")}&body=${encodeURIComponent(bodyText)}`;
    window.location.href = mailto;
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      form?.reset();
      onOpenChange?.(false);
    }, 2500);
  };

  if (!open) return null;

  const dialogContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-dialog-title"
      onClick={(e) => e.target === e.currentTarget && onOpenChange?.(false)}
    >
      <div
        className={cn(
          "relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl p-6",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          "bg-gradient-to-b from-zinc-900/90 via-[#0a0a0a] to-black",
          "border border-zinc-600/30"
        )}
        style={{
          boxShadow: "0 0 0 1px rgba(255,255,255,0.08) inset, 0 1px 0 rgba(255,255,255,0.06) inset, 0 25px 50px -12px rgba(0,0,0,0.9)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onOpenChange?.(false)}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-300 transition-colors hover:bg-primary hover:text-primary-foreground border border-zinc-600/30"
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        {success ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-100">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-bold text-zinc-100">Message Sent Successfully!</h3>
            <p className="max-w-md text-zinc-400">
              Thank you for contacting us. We&apos;ll respond within 24 hours at the email address you provided.
            </p>
          </div>
        ) : (
          <Contact2
            id="contact-dialog-title"
            title="Contact Us"
            description="We are available for questions, feedback, or collaboration opportunities. Let us know how we can help!"
            phone="Contact us for support"
            email="support@ezana.world"
            web={{ label: "ezana.world", url: "https://ezana.world" }}
            onSubmit={handleSubmit}
            compact
            className="[&_h1]:text-zinc-100 [&_h3]:text-zinc-100 [&_p]:text-zinc-400 [&_label]:text-zinc-300 [&_li]:text-zinc-400 [&_a]:text-primary [&_span]:text-zinc-300"
            inputClassName="bg-transparent border-zinc-600/40 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-zinc-500 focus-visible:ring-zinc-500/20"
          />
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(dialogContent, document.body)
    : null;
}
