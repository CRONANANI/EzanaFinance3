"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Facebook, Instagram, Linkedin, Send } from "lucide-react";

export function FooterSection({ onContactClick }) {
  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    // Placeholder - wire to your newsletter API
  };

  return (
    <footer className="relative border-t border-border bg-background text-foreground transition-colors duration-300">
      <div className="container mx-auto px-4 py-12 md:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
          <div className="relative">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">Stay Connected</h2>
            <p className="mb-6 text-muted-foreground">
              Join our newsletter for the latest updates and exclusive offers.
            </p>
            <form className="relative" onSubmit={handleNewsletterSubmit}>
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                placeholder="Enter your email"
                autoComplete="email"
                className="footer-newsletter-input flex h-10 w-full rounded-full border border-border bg-transparent px-4 pr-12 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8 rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Subscribe</span>
              </Button>
            </form>
            <div className="absolute -right-4 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold">Quick Links</h3>
            <nav className="space-y-2 text-sm">
              <a href="#heroSection" className="block transition-colors hover:text-primary">
                Home
              </a>
              <a href="#features" className="block transition-colors hover:text-primary">
                Features
              </a>
              <Link href="/pricing" className="block transition-colors hover:text-primary">
                Pricing
              </Link>
              <a href="#faq" className="block transition-colors hover:text-primary">
                FAQ
              </a>
              <Link
                href="/help-center"
                className="block transition-colors hover:text-primary"
              >
                Help Center
              </Link>
              <a
                href="#"
                className="block transition-colors hover:text-primary"
                data-support-trigger
                onClick={(e) => {
                  if (onContactClick) {
                    e.preventDefault();
                    onContactClick();
                  }
                }}
              >
                Contact
              </a>
            </nav>
          </div>
          <div className="relative">
            <h3 className="mb-4 text-lg font-semibold">Follow Us</h3>
            <div className="mb-6 flex space-x-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full" asChild>
                      <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                        <Facebook className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Follow us on Facebook</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full" asChild>
                      <a href="https://x.com/EzanaWorld" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
                        <i className="bi bi-twitter-x" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Follow us on X</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full" asChild>
                      <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                        <Instagram className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Follow us on Instagram</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full" asChild>
                      <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                        <Linkedin className="h-4 w-4" />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Connect with us on LinkedIn</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-center md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Ezana Finance. All rights reserved.
          </p>
          <nav className="flex flex-wrap justify-center gap-4 text-sm md:justify-end">
            <Link href="/help-center" className="transition-colors hover:text-primary">
              Help Center
            </Link>
            <Link href="/privacy-policy" className="transition-colors hover:text-primary">
              Privacy Policy
            </Link>
            <a href="#" className="transition-colors hover:text-primary">
              Terms of Service
            </a>
            <a href="#" className="transition-colors hover:text-primary">
              Cookie Settings
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
