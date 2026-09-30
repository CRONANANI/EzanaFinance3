# Support centre pages, build brief

## 1. What these pages are

Two landing pages under the Help Center: **User Support** for people using
Ezana as investors or students, and **Partner Support** for organisations
(SMIF programmes, partners, teams). Both sit under the public marketing nav.
Each answers two questions: "where do I find help about X" (browse) and
"what is the answer to my question" (ask).

They are one template. The audience decides the content source: which
categories exist, which articles trend, which FAQs show, which "Try" chips
appear, and the eyebrow (`HELP CENTER · USER SUPPORT` /
`HELP CENTER · PARTNER SUPPORT`). Nothing in the layout differs.

Tone: calm, plain, factual. The help centre is where trust is built; nothing
here sells.

## 2. What changes from today

| Today | Approved |
|---|---|
| Title, search, then a 3-column category grid with trending in a right card | Centred title and search, then three columns: category rail left, content middle, trending right |
| Twelve identical category cards dominate the page | Categories become a compact list; the middle column leads with Start here (three cards), FAQs, Recently updated |
| Ask AI drops an answer card above the grid; the grid becomes "Matching categories (6)" | Ask AI swaps the body in place: answer card, follow-up, Keep reading by category, Related articles ranked by match; the category rail shows match counts and highlights matching categories |
| Sources as chips, no feedback | Sources as chips, feedback pair, caveat line, follow-up field |
| Trending in a card on the right of the grid | Trending in the right rail (home) and as "Still trending" under Related articles (answered) |
| Help card centred at the bottom | Help card in the middle column (home) and across middle and right (answered) |

## 3. What stays

- The marketing nav (logo, Features, Pricing, Datasets, Ezana Echo, FAQ,
  Help Center, Login, Become a Partner). Mounted, not restyled.
- "Back to Help Center" crumb; the page title "User Support" / "Partner
  Support".
- The Ask AI endpoint and the help-centre content source; the redesign adds
  derived shapes (matches per category, related, keep reading) as pure
  functions over what already comes back.
- Category and article URLs.

## 4. The design, as approved

### Home

Centred header: crumb `Back to Help Center / User Support`, mono eyebrow,
34px title, one subline, a 760 x 56 pill with a search icon, the placeholder
"Ask anything, e.g. How do I connect my brokerage?" and a tinted **Ask AI**
button, and a row of four "Try:" chips.

Below, three columns:

- **Left rail (268)**: `ALL CATEGORIES` with the count, then every category
  as a row (icon tile, name, chevron). A hairline on its right.
- **Middle**: **Start here** (the three most-opened categories as cards with
  icon, name, description, "View articles"), **Frequently asked questions**
  (four, in two columns), **Recently updated** (five rows: title, category,
  relative date, chevron, with an "All updates" link), and the **Still need
  help?** card as one row with Contact Support and Back to Help Center.
- **Right rail (300)**: `TRENDING THIS WEEK` with six numbered articles
  (title, category) and an "All popular articles" link. A hairline on its
  left.

### Answered

Same header, the question inside the pill (emerald border and halo, solid
Ask AI button), and a "Clear and browse" link beneath.

Three columns:

- **Left rail (232)**: the same category list in *matches* mode: header
  `ALL CATEGORIES / MATCHES`; a category with matching articles gets the
  emerald tint background and its count in emerald mono on the right; a
  category without matches fades to 50% with a middle dot. A one-line note
  under the list: "Highlighted categories hold at least one article relevant
  to your question."
- **Middle**: the **answer card** (mono `AI ANSWER` label with the spark
  mark, "from N help articles", the answer text at 15px, an optional
  numbered step list when the answer has steps, `SOURCES` chips, and a
  footer with the caveat "AI-generated from Ezana help articles. Check the
  source before acting on account changes." and "Was this helpful?" with
  thumbs), then the **follow-up** row (label, pill field, Ask button), then
  **Keep reading** (three category cards, each with icon, name, match count,
  up to three matching articles not already shown as sources, and "All
  {category} articles").
- **Right rail (320)**: **Related articles, ranked by match** in a card
  (icon tile, title, category, read time, `BEST MATCH` tag on the first,
  "See all N results"), then `STILL TRENDING` with three articles.
- **Bottom, across middle and right**: the help card as one row.

## 5. Copy

```
Crumb          Back to Help Center / User Support        (Partner Support for partners)
Eyebrow        HELP CENTER · USER SUPPORT                 (HELP CENTER · PARTNER SUPPORT)
Title          User Support                               (Partner Support)
Subline        Search the help centre or ask the assistant. Answers cite the articles they come from.
Pill           Ask anything, e.g. How do I connect my brokerage?      Ask AI
Try chips      Connect a brokerage · Export my portfolio · Congressional data · Cancel my plan
               (Partner: Invite team members · Seats and roles · SSO setup · Billing for organisations)
Rail head      ALL CATEGORIES  12                         answered: ALL CATEGORIES  MATCHES
Rail note      Highlighted categories hold at least one article relevant to your question.
Start here     Start here   the three most-opened categories
FAQ head       Frequently asked questions
Updated head   Recently updated   articles changed in the last 30 days     All updates
Trending head  TRENDING THIS WEEK                          All popular articles
Help card      Still need help?  Our support team is here for you. Reach out and we'll get back to you as soon as possible.
               Contact Support · Back to Help Center
Clear link     Clear and browse
Answer label   AI ANSWER   from N help articles
Sources        SOURCES
Caveat         AI-generated from Ezana help articles. Check the source before acting on account changes.
Feedback       Was this helpful?
Follow-up      Ask a follow-up   e.g. Which brokerages support SnapTrade?   Ask
Keep reading   Keep reading   N more articles match, grouped by category
Related        Related articles   ranked by match          BEST MATCH        See all N results
Still trending STILL TRENDING
No answer      We could not find an answer in the help centre. Try different words, browse a category, or contact support.
Error          The assistant is unavailable right now. Browse a category or try again in a moment.
```

No em dashes. Counts, read times and dates are mono.

## 6. User vs Partner

| | User Support | Partner Support |
|---|---|---|
| Categories | the twelve on the current page | the partner set from the help-centre source (Teams & Organizations first) |
| Start here | Getting Started, Portfolio & Trading, Inside the Capitol | the three most-opened partner categories |
| Trending, FAQs, Recently updated | user article set | partner article set |
| Try chips | see copy | see copy |
| Ask AI scope | user articles | partner articles (fall back to user articles when no partner match, and say "from the user help centre" in the answer label) |
| Help card CTA | Contact Support | Contact partner support (same component, different target) |

## 7. Hard constraints

- **Grounded answers only.** No sources, no answer. The no-answer state is a
  real state, not an empty card.
- **The rail is one component.** Resting and matches are modes of the same
  list; counts and highlights come from `matchesByCategory(answer)`.
- **In-place swap with a URL.** Ask AI writes `?q=`; Back restores home;
  loading `?q=` directly renders the answered state.
- **Tokens only** through the `hc-` properties in `03-TOKENS.css`. Dark and
  light both checked.
- **Emerald only.** Highlight tint, positive text, spark mark. No red, no
  blue, no gradients.
- Plus Jakarta Sans for words, JetBrains Mono for counts, read times, dates
  and mono-caps labels. Bootstrap Icons only. No em dashes. No new
  dependencies. Page prefix `hc-`.
- Responsive to 375 with no horizontal scroll (rules in `04-SPEC.md`).
