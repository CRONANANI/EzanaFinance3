PAGE: [page name, e.g. Watchlist]
VERSION: [retail / partner / org]
WHAT I WANT FROM THE REDESIGN: [goals, complaints, ideas, or "open brief"]
KEEP OR DROP: [anything that must stay, anything I already know I want removed]

We are redesigning this page. Write me a description of it as it exists today, in one
.md file, that I will give to ChatGPT so it can design the new version. ChatGPT cannot
see our code, so the file has to stand on its own.

How to work:

- Clone the repo fresh and read the actual code for this page: the page file, its
  components, hooks, lib helpers, API routes, CSS and database migrations. Do not write
  from memory, from older descriptions or from docs.
- Read the current Ezana branding guide in the project docs and apply it.
- Describe what the code does, not what it was meant to do. If you did not run the page,
  say so at the top. State the commit you read.
- Plain language. A designer is the reader, not an engineer. No em dashes.

The file must have these sections, in this order:

1. SUMMARY
   What the page is for, who uses it, how they get to it, and what they do after it.

2. WHAT IS ON THE PAGE TODAY
   Every section from top to bottom: its title, what it shows, every control, and what
   each control does. Include dialogs, menus, toasts, and the loading, empty and error
   states. Describe desktop first, then what changes on tablet and phone.

3. WHAT THE USER CAN DO
   Every action as a short list (add, remove, sort, filter, export and so on), including
   ones that are easy to miss. Mark any action that exists in the code but has no button.

4. DATA WE HAVE
   A table of every piece of information the page can show today: the field, what it
   means, where it comes from in public terms (never vendor or database names), how
   fresh it is, and which asset types or cases it is missing for.

5. DATA WE DO NOT HAVE
   Things a designer is likely to draw that the product cannot fill today (for example
   analyst ratings, percent ownership, real-time ticks, news, scores). Be specific to
   this page. Say plainly: do not design around these.

6. MUST KEEP WORKING
   Functionality, links to other pages, onboarding steps, permissions and URL behaviour
   that the redesign cannot break, even if the new design does not show them.

7. PROBLEMS WITH THE CURRENT PAGE
   What is weak, cluttered, duplicated, confusing or broken today, from the code and
   from my notes above. Separate "design problems" from "bugs". These are what the
   redesign should solve.

8. DESIGN RULES THE MOCK MUST FOLLOW
   The Ezana branding rules, written as instructions to the designer, with the ones
   outside tools get wrong most often first: flat cards with no borders, fills, shadows
   or rounded panels; content aligned from the logo's left edge to the logout icon's
   right edge; tabs, toggles and time selectors as text only with emerald for selected;
   no outlined buttons; borderless search; no page title block; Bootstrap Icons only;
   the two typefaces; sentence case; no em dashes; descriptive wording, never advice;
   dark mode first and light mode must work. Include colours as names and hex.

9. OPEN QUESTIONS FOR ME
   Decisions only I can make before the design starts. Keep it short.

10. PROMPT TO PASTE INTO CHATGPT
    A ready-to-paste instruction, in a code block, that tells ChatGPT to: read the file,
    design one full-page desktop mock at 1440px wide in dark mode, follow section 8
    exactly, use only data from section 4, draw nothing from section 5, label all
    numbers and names as sample content, show the key loading and empty states, and
    finish with a written list of every section it drew, every design decision I may
    want to reverse, and anything it drew that is not in section 4.

Rules for the whole file:

- No invented facts. If something is unclear in the code, say it is unclear.
- No code blocks, file paths, table names or API routes in sections 1 to 9. If I also
  want the technical detail (code structure, API routing, data architecture), I will
  ask for it as a second file.
- Keep it as short as it can be while staying complete. Tables over paragraphs where
  the content is a list of things.
