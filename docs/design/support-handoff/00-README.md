# Support centre redesign, handoff package

Everything Claude Code needs to rebuild the two support landing pages on
ezana.world, User Support and Partner Support, to the approved design: one
template, two audiences, two states.

- **Home (resting)**: centred title and Ask AI search, then three columns:
  all categories on the left, the main column (Start here, FAQs, Recently
  updated, help card), trending on the right.
- **Answered**: after a question, the same header with the question in the
  pill, the category rail switching to match counts with relevant categories
  highlighted in emerald, the AI answer with sources and a follow-up, Keep
  reading grouped by category, Related articles ranked by match, Still
  trending, and the help card across the bottom.

The design canvas with the three explored directions and the two FINAL boards
is the Design artifact "Support centre pages", third row.

## Files

| File | What it is |
|---|---|
| `00-README.md` | This index and the prompt to paste |
| `01-BRIEF.md` | What the pages are, what changes, the user/partner split, copy, constraints |
| `02-INTERACTIONS.json` | Search and Ask AI flow, states, the category rail, follow-ups, feedback, URL, keyboard |
| `03-TOKENS.css` | Page-scoped `hc-` custom properties mapped onto the theme variables |
| `04-SPEC.md` | **The measured spec.** Header, three-column grid, every block, type scale, responsive rules, fixture |
| `05-ACCEPTANCE.md` | Ship checklist |
| `06-wireframe-home.html` | The approved home board, User Support, 1440 wide, static HTML |
| `07-wireframe-answered.html` | The approved answered board, same page after a question |

## Read this before building

- **One template, two audiences.** User Support and Partner Support render
  the same component with a different content source (categories, trending,
  FAQs, recently updated, Try chips, eyebrow copy). The wireframes show User;
  Partner differs only in words and article sets.
- **The answer is grounded, and it says so.** Every AI answer shows its
  sources as chips, has a feedback pair and a "check the source" caveat.
  Never render an answer without at least one source; if retrieval returns
  nothing, show the no-answer state, not a generic reply.
- **The category rail is the same component in both states.** Resting it
  lists all categories; answered it shows a match count per category and
  highlights the ones with matches. It is not a second component.
- **Ask AI is not a page navigation.** Asking stays on the page, swaps the
  body in place, and writes `?q=` to the URL so the answered state is
  linkable and Back restores browsing.
- **Emerald is the only accent.** Highlights, tags, icons and links use the
  positive text token or the emerald tint; nothing else is coloured.
- No em dashes in UI copy. Bootstrap Icons only. No new dependencies.

## Prompt to paste

```
Redesign the User Support and Partner Support landing pages to the approved
design in this package: one template, two audiences, with a resting (home)
state and an answered state.

Read all of these first, in order:
  support-handoff/01-BRIEF.md              what the pages are, what changes, user vs partner, copy, constraints
  support-handoff/04-SPEC.md               the measured spec, every number
  support-handoff/02-INTERACTIONS.json     search, Ask AI flow, states, category rail, follow-up, feedback, URL, keyboard
  support-handoff/03-TOKENS.css            page tokens mapped onto theme-variables.css
  support-handoff/05-ACCEPTANCE.md         the ship checklist
  support-handoff/06-wireframe-home.html   the approved home board at 1440
  support-handoff/07-wireframe-answered.html  the approved answered board at 1440

Then survey the codebase before writing anything: read CLAUDE.md,
docs/ENGINEERING.md and EZANA_BRANDING_GUIDE.md; find the current User
Support and Partner Support routes and components, the help-centre data
source (categories, articles, trending, FAQs), the existing Ask AI endpoint
and its response shape (answer text, sources, matched articles per
category), the shared marketing nav, and the existing shimmer/skeleton
pattern.

Deliver in this order and stop after each for me to look:

  1. A short plan naming the files you will touch, the data the page needs
     from the help-centre source and the Ask AI endpoint, and how the two
     audiences share one template.

  2. THE DATA LAYER. A pure module (no React) that shapes what the page
     renders: categories with article counts; matchesByCategory(answer);
     relatedArticles(answer) ranked by match; keepReading(answer) grouped
     by category, excluding the sources already shown; trending and
     recently-updated lists per audience. Tests for each.

  3. THE HOME STATE, STATIC AT 1440. Marketing nav untouched, centred crumb,
     eyebrow, title, subline, the 760x56 Ask AI pill with Try chips, then
     the 268 / 1fr / 300 grid: category rail left, Start here, FAQs,
     Recently updated and the help card in the middle, Trending right.
     hc- prefix, tokens from 03 only. Light and dark mode.

  4. THE ANSWERED STATE. Same header with the question in the pill and
     "Clear and browse" under it; the 232 / 1fr / 320 grid: the category
     rail with match counts and emerald highlights, the answer card
     (AI ANSWER label, answer text, optional numbered steps, source chips,
     caveat and feedback), the follow-up field, Keep reading by category,
     Related articles ranked by match with a best-match tag, Still
     trending, and the help card across the middle and right columns.
     Swap in place, ?q= in the URL, Back restores home.

  5. States (asking skeleton, streaming, no answer, endpoint error, empty
     category), the Partner Support audience wired to its own content,
     responsive at 1200, 1000, 640 and 375 with no horizontal scroll, a11y,
     then lint.

Hard rules:
  - An answer always shows its sources. No sources means the no-answer
    state, never an unsourced reply.
  - The category rail is one component with two modes, resting and matches.
  - Ask AI stays on the page; the answered state is linkable via ?q=.
  - Emerald only, through the tokens in 03. Highlights use the tint, text
    uses the positive token. Nothing red, nothing blue.
  - Mono for counts, read times and labels; Plus Jakarta Sans for words.
  - No em dashes. Bootstrap Icons only. No new dependencies.
  - Do not restyle the marketing nav. Mount it.
```
