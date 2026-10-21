# Datasets hub console rail, build brief

## 1. What this page is

`/datasets`, the Sonar floor: the search bar over the green band ground and
globe, the isometric sonar deck ("everything below feeds Ezana Sonar"), and
the seven dataset dimensions that feed it. Sending a ping replaces the scene
with the loader and results; this change does not touch that flow.

Audience: first-time visitors deciding whether Ezana's data is real, and
returning users jumping into a dimension. Tone: Bloomberg/FT, instrument-like,
no hype.

## 2. What the redesign changes

| Today                                                                  | V1.1                                                                                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| News belt: white-tinted pills with a 1px white inset ring (`.dsnb-card`) | One dark glass band; items separated by mint hairlines; no pills, no ring                              |
| Dimension marks drawn around and above the deck by `OrbitalMap` (cubes, glow dots, chip row) | A console rail of seven channel strips docked BELOW the deck, one per dimension, in taxonomy order     |
| Dimension state readable only from the chips' captions                  | Each strip shows its hue, name, an ambient waveform, one tick per dataset (filled live, hollow roadmap), the live count and LIVE/ROADMAP |
| The link between dimensions and deck is implicit                        | A feed line drains from the deck's base into a bus hairline; a stem in each dimension's hue rises into its strip |

## 3. What stays exactly as it is

- The sonar deck: geometry, rings, sweep, blips, hover cards, everything
  `OrbitalMap`/`Radar` draw for the deck itself.
- The search pill, placeholder copy ("Try a person, a bank, a policy, a
  ticker…"), the Ping button, the ping loader and results.
- `GlobeBackground`, the band-green ground, the light-lock.
- The selection model: `SonarSelection`, `?dimension=` URL state, and the
  panels that open for a selected dimension. Strips become the new triggers
  for the same state.
- `NewsBelt.jsx` mechanics: marquee loop, `useTickerSpeed`, hover pause, the
  reduced-motion hand-scroll fallback, and both mounts (`DatasetChrome` and
  `OrbitalNewsTicker`). Only `.dsnb-*` presentation changes.
- `buildNewsItems` content and order. No new feed work.

## 4. Copy

| Where             | Copy                                                              |
| ----------------- | ----------------------------------------------------------------- |
| Status line       | `7 DIMENSIONS · {live} OF {total} DATASETS LIVE · {pinging} STREAMING` (counts from `taxonomyCounts`, mono, never hardcoded) |
| Strip status      | `LIVE` / `ROADMAP`                                                |
| Strip count       | `{liveCount}/{items.length}` in mono                              |
| Rail aria label   | `The seven dataset dimensions that feed Ezana Sonar` (keep today's) |
| Strip aria label  | `{label}, {liveCount} of {total} datasets live`                   |
| Deck caption      | None. The mock's "SONAR DECK · EXISTING COMPONENT, UNCHANGED" tag is a canvas annotation, not UI copy |

## 5. Honesty rules

- Counts, ticks and status derive from `DATASET_TAXONOMY` via the existing
  `ORBIT_DIMS` mapping. A dimension is ROADMAP when `liveCount === 0`.
- The waveform is an ambient mark: `aria-hidden`, no axes, no tooltip, no
  implied series. Amplitude scales with `liveCount / total`; roadmap strips
  draw a flat dashed line. If anyone asks it to show real activity later,
  that is a new feature with a real source, not this build.
- Nothing on the rail animates data it does not have. A slow idle drift on
  the waveform is fine; it stops under `prefers-reduced-motion`.

## 6. Constraints

- Page-scoped `dcr-` classes and the tokens in `03-TOKENS.css` only. The
  seven dimension hues are the fixed shared-chrome dot colours and live once
  as tokens; `lint:branding` and `lint:css` must stay green.
- This route is light-locked: it must render identically with the app in
  light and dark mode (the band tokens already guarantee this; do not
  introduce `--bg-primary`-relative colours that flip).
- Bootstrap Icons only; decorative icons `aria-hidden`. No new dependencies.
- No em dashes in UI copy. Numbers mono tabular; names sans.
- Delete the dimension marks the rail replaces and their dead CSS in the same
  change; `lint:dead` should not regress.
