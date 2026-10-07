# The shared dimension nav

The top navigation bar is identical on every dimension hub page and every
dataset page. Redesigns change what is below it, never the bar. This page
mounts it and sets Capitol Watch as the active dimension; nothing else.

## Contract

| Part | Spec (as live today) |
|---|---|
| Bar | 52px tall, full width, the existing dark-to-bright green gradient, white text, Plus Jakarta Sans 13 to 13.5px / 600 |
| Left | `Home` with a back arrow |
| Dimensions | Capitol Watch, Titans Shadow, Eyes Above, Consumer Whispers, The Hive, Global Empire Lighthouse, Regulatory Winds; each an icon plus label, with its dropdown |
| Active | the current dimension sits in a pill at 14% white with a 7px radius |
| Right | `Log in` outline pill (1px white at 50%) and `Join the waitlist` solid green pill |
| Never | page-specific colours, extra items, a second row, or per-page restyling |

## On phones (below 1000px)

Back arrow, the active dimension as a pill with a chevron that opens the
dimension menu, `Join`, and a menu button. Same gradient and height. See
`reference/mobile-pattern.html`.

## Implementation rule

If the nav is currently written inline on each page, extract it once into a
shared component that takes only the active dimension as a prop, mount it on
the Capitol Watch hub, and confirm the other pages that already use it are
visually unchanged. Grep the hub's styles for any selector that targets the
nav: there must be none.

Note: the House disclosures and Government Contracts packages define a
darker 44px dimension bar plus a 32px ticker for their dataset pages. If the
codebase has both bars today, flag it in your plan and ask which one is the
canonical shared nav before changing either. The Capitol Watch hub uses the
52px bar shown in the wireframe, which matches the live page.
