# Ship checklist, support centre pages

Every box is checkable without asking the designer. Numbers come from
`04-SPEC.md`; behaviour from `02-INTERACTIONS.json`.

## One template, two audiences

- [ ] User Support and Partner Support render the same component; only the
      audience prop and its content source differ.
- [ ] Eyebrow, title, Try chips, categories, Start here, FAQs, Recently
      updated and Trending all come from the audience's source. No user
      content leaks onto the partner page or the reverse.
- [ ] Partner Ask AI scopes to partner articles and says "from the user help
      centre" when it falls back.

## Header

- [ ] Marketing nav is the shared component, untouched.
- [ ] Crumb, eyebrow, 34px title, subline, 760 x 56 pill, Try chips: sizes
      per spec, centred.
- [ ] Ask AI is tinted at rest and solid emerald once a question is present;
      the pill takes the emerald border and halo in the answered state.
- [ ] "Clear and browse" appears only in the answered state and restores home.

## Home layout at 1440

- [ ] Grid `268px 1fr 300px`, gap 32; hairline on the right of the left rail
      and the left of the right rail.
- [ ] Category rail lists every category in canonical order with icon tile,
      name, chevron; header shows the total.
- [ ] Middle: Start here (3 cards), FAQs (2 x 2), Recently updated (5 rows,
      All updates), help card as one row with both buttons on one line.
- [ ] Right rail: TRENDING THIS WEEK, six numbered rows, All popular articles.

## Answered layout at 1440

- [ ] Grid `232px 1fr 320px`, gap 28; left rail spans both rows; help card
      spans columns 2 to 4 in row 2.
- [ ] Category rail is the same component in matches mode: MATCHES header,
      highlighted rows with emerald counts, dimmed rows with a middle dot,
      the one-line note under the list, canonical order kept.
- [ ] Answer card: label row, answer text, steps only when the payload has
      them, source chips, caveat and feedback footer.
- [ ] Follow-up row under the card with its own Ask button.
- [ ] Keep reading: three category cards, counts, up to three articles each
      excluding sources, "All {category} articles".
- [ ] Related articles card: six rows, BEST MATCH tag under the first title,
      "See all N results" expands in place.
- [ ] Still trending: three rows, none duplicating sources or related.

## Ask flow

- [ ] Enter and Ask AI both submit; minimum 3 characters.
- [ ] Try chips and FAQ rows submit as questions.
- [ ] The body swaps in place; the header stays; focus lands on AI ANSWER.
- [ ] `?q=` is written on Ask, replaced on follow-up, removed on Clear.
- [ ] Back from the answered state returns to home with an empty pill.
- [ ] Loading `?q=` directly renders the answered state.
- [ ] No sources → the no-answer state. There is no code path that renders
      answer text with zero sources.
- [ ] Endpoint error → the error card with Try again.
- [ ] Feedback thumbs record once, disable, and thumbs-down reveals the
      optional comment field.

## States

- [ ] Home loading: skeletons for cards, rows and rail; nav and header
      render immediately.
- [ ] Asking: answer, Keep reading and Related skeletons; rail names stay
      visible with count placeholders.
- [ ] Empty lists hide their block; no empty headings.
- [ ] `prefers-reduced-motion` removes shimmer travel and transitions.

## Responsive

- [ ] 1200: narrower rails per spec, nothing wraps in the help card.
- [ ] 1000: rails collapse (category strip under the header, trending under
      the middle), Related and Still trending under the answer.
- [ ] 640: single column, pill full width, Try chips scroll, cards stack.
- [ ] 375: Ask AI icon-only with `aria-label`, help card buttons stack, tap
      targets 44, no horizontal page scroll.

## Theme and typography

- [ ] Tokens only through `hc-` properties; no hard-coded hex in page CSS.
- [ ] Dark and light both screenshotted for both states; highlighted rail
      rows separate from the ground at 3:1 in dark.
- [ ] Emerald is the only accent: no red, no blue, no gradient anywhere.
- [ ] Counts, dates, read times and mono-caps labels are JetBrains Mono
      with `tabular-nums`; labels carry .14em to .18em tracking.
- [ ] `grep -n "—"` across the page and its copy returns nothing.

## Accessibility

- [ ] Category rail is a `nav` labelled Categories; counts have visually
      hidden "N matching articles" text.
- [ ] Cards and rows that navigate are real links; Ask, Try chips, thumbs
      and See all are real buttons; icon-only controls have `aria-label`.
- [ ] The answer card is a region labelled "AI answer" and receives focus on
      arrival.
- [ ] Focus is visible on both grounds; Tab order matches 02-INTERACTIONS.
- [ ] Sources and Related titles read fully to screen readers even when
      visually clamped.

## Cleanup

- [ ] The old "Matching categories" grid and the old trending card are
      removed, along with their CSS.
- [ ] Lint passes on the support-centre components and the pure module.
