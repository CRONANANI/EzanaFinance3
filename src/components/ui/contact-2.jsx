"use client";

import React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function Contact2({
  title = "Contact Us",
  description = "We are available for questions, feedback, or collaboration opportunities. Let us know how we can help!",
  phone = "Contact us for support",
  email = "support@ezana.world",
  web = { label: "ezana.world", url: "https://ezana.world" },
  onSubmit,
  className,
  compact = false,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      firstname: form.firstname?.value,
      lastname: form.lastname?.value,
      email: form.email?.value,
      subject: form.subject?.value,
      message: form.message?.value,
    };
    onSubmit?.(data, form);
  };

  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-8 lg:flex-row lg:gap-12",
        compact && "gap-6 lg:gap-8",
        className
      )}
    >
      <div className="flex max-w-sm flex-col justify-between gap-6 lg:gap-8">
        <div className="text-center lg:text-left">
          <h1
            className={cn(
              "mb-2 font-semibold text-foreground lg:mb-1",
              compact ? "text-3xl lg:text-4xl" : "text-5xl lg:text-6xl"
            )}
          >
            {title}
          </h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="mx-auto w-fit lg:mx-0">
          <h3 className="mb-4 text-center text-xl font-semibold text-foreground lg:text-left">
            Contact Details
          </h3>
          <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
            <li>
              <span className="font-bold text-foreground">Phone: </span>
              {phone}
            </li>
            <li>
              <span className="font-bold text-foreground">Email: </span>
              <a href={`mailto:${email}`} className="underline hover:text-primary">
                {email}
              </a>
            </li>
            <li>
              <span className="font-bold text-foreground">Web: </span>
              <a href={web.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                {web.label}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex flex-col gap-4 rounded-lg border border-zinc-600/20 p-6",
          compact ? "p-6" : "p-8"
        )}
      >
        <div className="flex gap-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="firstname" className="text-foreground">
              First Name
            </Label>
            <Input type="text" id="firstname" name="firstname" placeholder="First Name" required className={inputClassName} />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="lastname" className="text-foreground">
              Last Name
            </Label>
            <Input type="text" id="lastname" name="lastname" placeholder="Last Name" required className={inputClassName} />
          </div>
        </div>
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="email" className="text-foreground">
            Email
          </Label>
          <Input type="email" id="email" name="email" placeholder="Email" required className={inputClassName} />
        </div>
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="subject" className="text-foreground">
            Subject
          </Label>
          <Input type="text" id="subject" name="subject" placeholder="Subject" className={inputClassName} />
        </div>
        <div className="grid w-full gap-1.5">
          <Label htmlFor="message" className="text-foreground">
            Message
          </Label>
          <Textarea placeholder="Type your message here." id="message" name="message" rows={5} required className={inputClassName} />
        </div>
        <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
          Send Message
        </Button>
      </form>
    </div>
  );
}
