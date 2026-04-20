"use client";

/* ============================================================================
 * Contact Support Dialog — landing-page-consistent surface
 * ----------------------------------------------------------------------------
 * The landing route forces light mode (see src/app/page.js) and its sections
 * are styled by src/app/landing-light-mode.css + src/app/theme-variables.css.
 * This modal inherits the SAME tokens so it feels native to the landing
 * surface rather than a bolted-on generic dialog.
 *
 * Design tokens inherited
 * -----------------------
 *  Page background:     var(--bg-primary)        (light: #ffffff, dark: #0a0e13)
 *  Card surface:        var(--surface-card)       (matches .feature-card / .pc-card)
 *  Card border:         var(--border-primary)     (matches .feature-card border)
 *  Card shadow:         var(--shadow-sm) / --shadow-md
 *  Primary accent:      var(--emerald-text)       (light: #059669, dark: #10b981)
 *                       var(--emerald-bg)         (tinted pill behind icons)
 *                       var(--emerald-bg-subtle)  (focus ring halo)
 *  Text tiers:          --text-primary / --text-muted / --text-faint
 *  Destructive:         #ef4444 (landing-consistent, matches tailwind.config destructive)
 *  Typography:          Plus Jakarta Sans (tailwind.config.js fontFamily.sans)
 *  Border radius:       16px (matches feature cards / pricing cards rounded-2xl)
 *  Spacing rhythm:      1.5rem section padding, 1.25rem field gap
 *  Button CTA style:    emerald fill + white text + emerald/25 glow on hover
 *                       matches landing-page primary CTA pattern
 *
 * Behavior
 * --------
 *  - Centered, max-width 560px on desktop, near-full-width on mobile
 *  - Backdrop: rgba(10,14,19,0.55) + blur(6px), matches global overlay feel
 *  - Escape closes, backdrop-click closes
 *  - Focus moves to first field on open; focus trap keeps Tab inside modal
 *  - Body scroll locked while open
 *  - Inline validation (never a toast); errors in destructive color below field
 *  - POST /api/support/contact on submit; preserves input on failure
 *  - Success state replaces the form body until Close
 * ========================================================================= */

import * as React from "react";
import { createPortal } from "react-dom";
import { Mail, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "billing", label: "Account & billing" },
  { value: "technical", label: "Technical issue" },
  { value: "feature", label: "Feature request" },
  { value: "other", label: "Other" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE = 1000;
const FALLBACK_EMAIL = "support@ezanafinance.com";

// Every token that touches the modal surface goes through these style objects
// rather than raw Tailwind color classes — because tailwind.config.js pins
// `bg-card`, `bg-background`, etc. to the dark-mode values, they would make
// the modal look wrong on the light-mode-forced landing page. CSS variables
// resolve correctly under both themes.
const surfaceStyle = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-primary)",
  color: "var(--text-primary)",
  boxShadow: "var(--shadow-md), 0 20px 48px -12px rgba(0, 0, 0, 0.18)",
};

const dividerStyle = {
  borderBottom: "1px solid var(--border-primary)",
};

const inputBaseStyle = {
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
  border: "1px solid var(--border-input, var(--border-primary))",
  borderRadius: "0.5rem",
  padding: "0.625rem 0.75rem",
  fontSize: "0.875rem",
  width: "100%",
  outline: "none",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
};

const inputInvalidStyle = {
  borderColor: "#ef4444",
};

const labelStyle = {
  color: "var(--text-primary)",
  fontSize: "0.8125rem",
  fontWeight: 600,
  letterSpacing: "0.01em",
};

const mutedTextStyle = { color: "var(--text-muted)" };
const faintTextStyle = { color: "var(--text-faint)" };
const destructiveTextStyle = { color: "#ef4444" };

const eyebrowStyle = {
  color: "var(--emerald-text)",
  fontSize: "0.6875rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

// Focusable selector used by the trap to find first/last focusable elements.
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ContactSupportDialog({ open, onOpenChange }) {
  const [phase, setPhase] = React.useState("form");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [topic, setTopic] = React.useState("general");
  const [message, setMessage] = React.useState("");
  const [errors, setErrors] = React.useState({});
  const [errorBanner, setErrorBanner] = React.useState(null);

  const dialogRef = React.useRef(null);
  const firstFieldRef = React.useRef(null);

  const close = React.useCallback(() => {
    onOpenChange?.(false);
  }, [onOpenChange]);

  // Reset transient state whenever the dialog closes so re-opening is clean.
  React.useEffect(() => {
    if (!open) {
      setPhase("form");
      setErrors({});
      setErrorBanner(null);
    }
  }, [open]);

  // Keyboard handling: Escape closes; Tab is trapped to cycle inside the
  // dialog so keyboard users can't accidentally focus the page behind the
  // overlay.
  React.useEffect(() => {
    if (!open) return;
    const handleKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const container = dialogRef.current;
      if (!container) return;
      const focusables = Array.from(container.querySelectorAll(FOCUSABLE)).filter(
        (el) => !el.hasAttribute("aria-hidden") && el.offsetParent !== null,
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, close]);

  // Lock body scroll while the modal is open.
  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Move focus into the dialog on open (after paint so the <input> is mounted).
  React.useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      firstFieldRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  const validate = () => {
    const next = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) next.name = "Please enter your name.";
    if (!trimmedEmail) next.email = "Please enter your email.";
    else if (!EMAIL_RE.test(trimmedEmail))
      next.email = "That doesn't look like a valid email.";
    if (!trimmedMessage) next.message = "Please tell us what's going on.";
    else if (trimmedMessage.length > MAX_MESSAGE)
      next.message = `Please keep messages under ${MAX_MESSAGE} characters.`;

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (phase === "sending") return;
    if (!validate()) return;
    setErrorBanner(null);
    setPhase("sending");
    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          topic,
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      setPhase("sent");
    } catch (err) {
      console.error("[contact-support-dialog] submit failed:", err);
      setPhase("form");
      setErrorBanner(
        `Couldn't send right now — please try again, or email us directly at ${FALLBACK_EMAIL}.`,
      );
    }
  };

  const resetAndClose = () => {
    // Reset content on close so a re-open starts fresh.
    setName("");
    setEmail("");
    setTopic("general");
    setMessage("");
    setPhase("form");
    setErrors({});
    setErrorBanner(null);
    close();
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const titleId = "contact-support-title";
  const descId = "contact-support-desc";
  const disabled = phase === "sending";

  const dialogContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in-0 duration-150"
      style={{
        background: "rgba(10, 14, 19, 0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-[560px] max-h-[90vh] overflow-hidden rounded-2xl animate-in fade-in-0 zoom-in-95 duration-200"
        style={surfaceStyle}
      >
        <button
          type="button"
          onClick={close}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
          style={{
            color: "var(--text-muted)",
            background: "transparent",
            border: "1px solid var(--border-primary)",
          }}
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <div className="overflow-y-auto max-h-[90vh]">
          <header
            className="px-6 pt-6 pb-5 lg:px-7 lg:pt-7 lg:pb-5"
            style={dividerStyle}
          >
            <div className="flex items-center gap-2 mb-2" style={eyebrowStyle}>
              <span
                className="inline-flex items-center justify-center h-5 w-5 rounded-full"
                style={{
                  background: "var(--emerald-bg)",
                  color: "var(--emerald-text)",
                }}
              >
                <Mail size={11} strokeWidth={2.5} />
              </span>
              Contact support
            </div>
            <h2
              id={titleId}
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              How can we help?
            </h2>
            <p id={descId} className="mt-1.5 text-sm leading-relaxed" style={mutedTextStyle}>
              Send us a note and we&apos;ll reply within 24 hours. For urgent billing or
              account issues, include as much detail as you can.
            </p>
          </header>

          {phase === "sent" ? (
            <SuccessState onClose={resetAndClose} />
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="px-6 py-6 lg:px-7 lg:py-7 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    id="support-name"
                    label="Name"
                    error={errors.name}
                  >
                    <input
                      id="support-name"
                      ref={firstFieldRef}
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                      style={{
                        ...inputBaseStyle,
                        ...(errors.name ? inputInvalidStyle : null),
                      }}
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? "support-name-error" : undefined}
                      disabled={disabled}
                    />
                  </Field>

                  <Field id="support-email" label="Email" error={errors.email}>
                    <input
                      id="support-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      style={{
                        ...inputBaseStyle,
                        ...(errors.email ? inputInvalidStyle : null),
                      }}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? "support-email-error" : undefined}
                      disabled={disabled}
                    />
                  </Field>
                </div>

                <Field id="support-topic" label="Topic">
                  <select
                    id="support-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    style={{
                      ...inputBaseStyle,
                      // subtle chevron via background SVG (emerald) so the
                      // native arrow matches the landing palette
                      paddingRight: "2rem",
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      backgroundImage:
                        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23059669' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 0.75rem center",
                    }}
                    disabled={disabled}
                  >
                    {TOPICS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field id="support-message" label="Message" error={errors.message}>
                  <textarea
                    id="support-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="What's going on?"
                    rows={5}
                    maxLength={MAX_MESSAGE}
                    style={{
                      ...inputBaseStyle,
                      resize: "vertical",
                      minHeight: "120px",
                      lineHeight: 1.55,
                      ...(errors.message ? inputInvalidStyle : null),
                    }}
                    aria-invalid={!!errors.message}
                    aria-describedby={
                      errors.message ? "support-message-error" : undefined
                    }
                    disabled={disabled}
                  />
                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="text-xs min-h-[1rem]" style={destructiveTextStyle}>
                      {errors.message && (
                        <span id="support-message-error">{errors.message}</span>
                      )}
                    </div>
                    <div className="text-[11px] tabular-nums" style={faintTextStyle}>
                      {message.length}/{MAX_MESSAGE}
                    </div>
                  </div>
                </Field>

                {errorBanner && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-lg p-3 text-xs"
                    style={{
                      background: "rgba(239, 68, 68, 0.06)",
                      border: "1px solid rgba(239, 68, 68, 0.35)",
                      color: "#b91c1c",
                    }}
                  >
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <div className="leading-relaxed">{errorBanner}</div>
                  </div>
                )}
              </div>

              <div
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 pb-6 pt-0 lg:px-7 lg:pb-7"
                style={{ borderTop: "1px solid var(--border-primary)", paddingTop: "1.25rem" }}
              >
                <div
                  className="flex items-center gap-1.5 text-[11px]"
                  style={faintTextStyle}
                >
                  <ShieldCheck size={12} />
                  Typically responds within 24 hours
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <SecondaryButton
                    type="button"
                    onClick={resetAndClose}
                    disabled={disabled}
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </SecondaryButton>
                  <PrimaryButton
                    type="submit"
                    disabled={disabled}
                    className="flex-1 sm:flex-none"
                  >
                    {disabled ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Sending…
                      </>
                    ) : (
                      "Send message"
                    )}
                  </PrimaryButton>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}

function Field({ id, label, error, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs" style={destructiveTextStyle}>
          {error}
        </p>
      )}
    </div>
  );
}

function PrimaryButton({ children, className = "", style, disabled, ...rest }) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold text-sm transition-all ${className}`}
      style={{
        height: "2.5rem",
        padding: "0 1.125rem",
        background: "var(--emerald-text)",
        color: "#ffffff",
        border: "1px solid var(--emerald-text)",
        boxShadow: disabled
          ? "none"
          : "0 6px 18px -6px rgba(16, 185, 129, 0.45), inset 0 1px 0 rgba(255,255,255,0.12)",
        opacity: disabled ? 0.65 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children, className = "", disabled, ...rest }) {
  return (
    <button
      {...rest}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg font-medium text-sm transition-colors ${className}`}
      style={{
        height: "2.5rem",
        padding: "0 1rem",
        background: "transparent",
        color: "var(--text-primary)",
        border: "1px solid var(--border-primary)",
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function SuccessState({ onClose }) {
  return (
    <div className="px-6 py-8 lg:px-7 lg:py-10 text-center space-y-5">
      <div
        className="mx-auto h-14 w-14 rounded-full flex items-center justify-center"
        style={{
          background: "var(--emerald-bg)",
          color: "var(--emerald-text)",
        }}
      >
        <CheckCircle2 size={28} strokeWidth={2.25} />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Message sent
        </h3>
        <p
          className="text-sm leading-relaxed max-w-sm mx-auto"
          style={{ color: "var(--text-muted)" }}
        >
          Thanks for reaching out — we&apos;ll reply within 24 hours. Keep an eye on
          your inbox (and spam folder, just in case).
        </p>
      </div>
      <div>
        <PrimaryButton type="button" onClick={onClose}>
          Close
        </PrimaryButton>
      </div>
    </div>
  );
}
