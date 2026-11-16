<!-- Transcribed from Claude Design project 47f83361-62b0-47d0-80ff-bd1d52f7b1e8, file
design_handoff_community_org/README.md (101 lines), read with get_page_text plus PageDown and a
zoomed screenshot for lines 56 to 59 and 100 to 101. Long lines were soft-wrapped by the editor and
are re-joined here. -->

# Handoff: Ezana Community page (organizational version)

## Overview

Route `/community` for council members of one university investment council ("Sample council"). A private social space: council feed, pitches open for feedback, research notes, mentions, inbox, recognition, upcoming events and the council's place across Ezana. Desktop, 1440px wide, dark (default) and light mode. All copy is sample content.

## About the design files

The files in this bundle are **design references created in HTML**: prototypes showing intended look and behavior, not production code to copy. Recreate them in the target codebase (Ezana is Next.js + Tailwind with shadcn-style primitives in `src/components/ui/*`) using its established patterns. Tokens come from `src/app/theme-variables.css` (mirrored in `colors_and_type.css`).

## Fidelity

**High-fidelity.** Final colors, type, spacing and interactions. Recreate pixel-accurately.

## Global rules (Ezana Branding and UI audit)

- Flat sections: no fill, border, shadow or radius. Only dialogs have surface (`--bg-deep`), border (`--border-hover`), shadow (`--shadow-xl`) and radius (`--radius-xl`).
- Content runs x=32 to x=1408 (32px page padding at 1440).
- 64px between side-by-side sections. Vertical rules sit in the middle of that gap (32px clear each side, 24px minimum).
- Tabs, filters, toggles, selectors: text only. Selected = `--emerald`, weight 600. Unselected = `--text-secondary`, 400. No underline bar, pill or track.
- One solid emerald primary button per group; everything else is plain text.
- Search and text fields: borderless, transparent, no outline. Placeholder `--text-faint`.
- No boxes around chips or labels (Sample content, nav badges, tickers).
- Initials avatars: mono text only, no filled circle. Emerald when unread/active, `--text-muted` when read.
- Bootstrap Icons only (`bootstrap-icons@1.11.3`), stroke variants.
- Plus Jakarta Sans for text; JetBrains Mono for every number, date, time and ticker.
- Row hover: title text color changes to `--emerald`; never a wash or accent bar.
- Sentence case, no em dashes (titles use a colon), signed percentages, `N/A` for missing values.

## Layout (1440 × ~2050)

1. **Navigation**, height 72, padding 0 32, bottom hairline `--border-primary`. `justify-content: space-between`.
   - Left (gap 28): logo (`ezana-nav-logo.png`, height 34, mirrored `scaleX(-1)`, left edge x=32), bell `bi-bell` with `9+` (mono 11/600, `--negative`, top -8 left 14), tasks `bi-list-check` with `6/19` (mono 11/600, `--emerald`). No wordmark.
   - Center (gap 28, 14px): Team Hub `bi-grid-1x2`, Research `bi-search` + `bi-chevron-down`, Trading `bi-graph-up` + chevron, **Sonar** filled pill (`--emerald` bg, `--radius-pill`, padding 8 18, 600, `bi-broadcast`), Watchlist `bi-bookmark`, **Community** (`--emerald`, 600, `bi-people`, `aria-current="page"`), Learning Center `bi-stack`.
   - Right (gap 24, 20px icons): `bi-person-circle`, `bi-gear`, `bi-box-arrow-right` in `--negative` (right edge x=1408).
   - No Team Hub sidebar on this page.
2. **Action row**, padding 20 0, flex gap 24: search (`bi-search` + borderless input, flex 1, placeholder "Search council posts, pitches, notes or members..."), "Sample content" (13px muted), 1×20 rule `--border-hover`, "Show council data" + "On"/"Off" (mono 13/600, emerald/muted), Messages, Add event, Announce (text 14px), **New post** (primary).
3. **KPI strip**, top hairline, padding 16 0 20. Grid `repeat(6,1fr) 1px repeat(3,1fr)`, column-gap 32. Label 13px `--text-muted`; value mono 18/500 `--text-primary`, tabular-nums. Members 9 · Active this week 7 · Open for feedback 2 · Upcoming 3 · Unread mentions 2 · Inbox unread 3 | Fund value $240,050.00 · Return +46.73% (`--positive`) · Positions 12.
4. **Executive view line**, hairlines top and bottom, padding 14 0, `bi-info-circle` emerald, 14px.
5. **Columns**: grid `minmax(0,1fr) 1px 400px`, column-gap 32 (64 between sections). The 1px rule (`--border-hover`) spans the full column height. Columns start 28px below the info line.

### Left column

- Tabs (17px, gap 36): Feed, Pitches open for feedback, Research notes, Mentions, Inbox, Cross-council.
- Filter row (14px, gap 28, padding 20 0, bottom hairline): All council, Financials, Healthcare, Technology, Industrials, Announcements, Questions, Updates.
- Pinned announcement (padding 24 0, bottom hairline): label `bi-pin-angle` "Pinned announcement" muted. Row grid `40px 1fr`, gap 16. Initials DP (mono 14/600 emerald). Name 15/600 primary · time mono 12 muted. Sub 13 muted "Executive announcement · All council". Right actions: Pin (`bi-pin-angle`), Remove (`bi-trash3`), text 14. Title 18/600 "Investment committee agenda: week 13". Body 14/1.6 max-width 740. Bulleted list with mono dates. Reactions `bi-hand-thumbs-up` 12, `bi-trophy` 3.
- This week in the council: title 18/600; 4-column grid gap 64: 2 new pitches shared, 1 research note published, 3 events coming up, 7 members active (icon 18 muted, value mono 18).
- Feed rows (`<article>`, grid `40px 1fr`, padding 24 0, bottom hairline): name · time, type · team, title 17/600 (hover emerald), body 14/1.6, meta row (13 muted labels, mono 12 values; tickers emerald 600; "Votes: 4 of 9" value `--warning`), footer (reactions mono 13 with icons; links emerald 14/500 + `bi-arrow-right`; question shows right-aligned "Replies not available yet" with `bi-info-circle`).
  1. Amara Tesfaye · Mar 25, 14:22 · Pitch for feedback · Technology · "NVDA: add to core holdings" · NVDA, Stage: Cross-desk review, Votes: 4 of 9 · 2 likes, 6 comments, Open pitch.
  2. Elena Rossi · Mar 24, 11:08 · Research note · Healthcare · "HCA: earnings and margin outlook" · HCA, Status: Published, Sector: Healthcare · 14 views, 8 comments, Open note.
  3. Chidi Okoye · Mar 24, 09:37 · Question · Financials · "How are members framing bank NIM risk next quarter?" · 4 likes, 2 ideas.
  4. Ingrid Lindqvist · Mar 23, 16:41 · Update · Technology · "Technology desk coverage update: week 12" · Open note (MSFT), Open pitch (NVDA).
- Analyst view note (grid `20px 1fr`, 14/1.6).

### Right column (400px)

Each section: padding 24 0, bottom hairline; header 18/600 primary with right action (13/500 emerald, `bi-arrow-right` where drawn).

- **Recognition** + View all; "Recent awards" 13 muted; rows grid `24px 1fr auto`: Best pitch (Selam Haile, by Daniel Park, Mar 24), Collaboration `bi-people` (Tomas Alvarez, by Amara Tesfaye, Mar 23), Gold research note (Elena Rossi, by Hana Girma, Mar 22) with title and icon in `--gold`.
- **Coming up** + Add event (opens New event): `bi-calendar3` rows, title 15/600, mono when · team 12 muted. Healthcare stand-up, Pitch memo due, Faculty advisor review.
- **Mentions** + View all: grid `8px 28px 1fr auto`; 6px emerald unread dot (`--radius-pill`), initials, "**Name** mentioned you", sub 12 muted, time mono 12.
- **Council inbox** + View all: same grid plus 16px paperclip column (`bi-paperclip`) and right-aligned mono time.
- **Across Ezana**: `bi-bar-chart` Sample council, "Council rankings: #4 of 18", "Tier: Tier 1" (emerald mono 600). Other councils (read only): 1 Northshore Investment Council +52.18%, 2 Westbridge Capital Forum +48.07% (mono `--positive`). `bi-trophy` Spring stock pitch challenge, "Pitches due Apr 5, 17:00", "Open" emerald, View competitions link.
- **Faculty advisor view** note.

## Dialogs (ds Modal)

Overlay `--bg-overlay` covering the page; dialog 560 wide, padding 28 32, `--bg-deep`, 1px `--border-hover`, `--radius-xl`, `--shadow-xl`. Header title 22/600 + close `bi-x-lg`. Footer right-aligned, gap 28: Cancel (text) + one primary. Closes on Esc, close icon, Cancel and overlay click. `role="dialog" aria-modal="true"`; trap focus and return it to the trigger in production.

- **New post** (New post, Announce): type tabs Discussion / Question / Update / Announcement; Team text selector (All council, Financials, Healthcare, Technology, Industrials); "Share context (optional)" with text selector `bi-file-earmark-text` "Attach a pitch" `bi-chevron-down`; borderless textarea (128 high, 15/1.6); text toggles "Pin this post" `bi-pin-angle` and "Post as announcement" `bi-megaphone` (emerald 600 when on); info "Analysts cannot create announcements or pin posts."; Cancel / **Post**. Announce opens with Announcement, both toggles on and the sample draft; New post opens as Discussion with empty draft. Pin and announcement toggles render for executives and faculty advisor only.
- **New event** (Add event): Title; Type Meeting / Presentation / Deadline / Review / Other; Date, Start, End (mono); Team; Description; Cancel / **Add event**.
- **Remove post** (executives, from Remove on a post): confirmation copy; Cancel / **Remove post**. Confirming removes the post from the feed.
- **Delete my post** (authors, from their own post's overflow): confirmation copy; Cancel / **Delete post**.

## States (per section, independent)

Sections: KPI strip, feed, digest, recognition, coming up, mentions, inbox, across Ezana.

- **Loading**: skeleton bars in the final layout, fill `--emerald-bg`, no radius (KPI values 22px tall; feed rows initials block + 5 bars; side rows 2 bars each). Inbox also shows "Loading council inbox...".
- **Empty**: one line in `--text-muted` + one text action in emerald 600. Feed: "Sample council has no posts yet." / Start a discussion. Filtered feed: "No posts yet in Industrials." / New post. Digest: "Nothing has been shared this week." / Share a pitch. Recognition: "No awards given yet." / Give an award. Coming up: "No meetings or deadlines scheduled." / Add event. Mentions: "No one has mentioned you yet." / Start a discussion. Inbox: "Your council inbox is empty." / New message. Across Ezana: "Rankings appear after the first month of trading." / View competitions. KPI values show 0 and `N/A` for fund value, return and positions.
- **Error**: inline line `bi-exclamation-circle` in `--negative` + message + Retry (emerald 600). Retry sets that section to loading, then ready.

## Interactions

- Tabs: Feed shows all; Pitches and Research notes filter by kind; Mentions, Inbox, Cross-council list those rows in the main column.
- Filters: team filters by `team`; Announcements shows the pinned post only; Questions and Updates filter by kind. Pinned shows on All council and Announcements; digest on All council.
- Show council data Off: every section shows its empty state.
- Hover: text buttons and titles change to `--emerald`; primary buttons go to `--emerald-deep`. No transforms or washes.

## State

`tab`, `filter`, `showData`, per-section `status` (`loading|ready|empty|error`), `modal` (`none|post|event|remove|del`), composer fields (`postType`, `postTeam`, `pin`, `announce`, `draft`), event fields (`title`, `type`, `date`, `start`, `end`, `team`, `description`), `removedPostIds`. Role (`analyst|executive|advisor`) gates Announce, Pin, Remove, Add event.

## Design tokens (dark / light)

- `--bg-primary` #0a0e13 / #ffffff · `--bg-deep` #0f1419 / #ffffff · `--bg-overlay` rgba(0,0,0,0.6)
- `--text-primary` #f0f6fc / #0f172a · `--text-secondary` #e2e8f0 / #1e293b · `--text-muted` #8b949e / #64748b · `--text-faint` #6b7280 / #94a3b8
- `--emerald` #10b981 / #059669 · `--emerald-hover` #34d399 / #047857 · `--emerald-deep` #059669 · `--emerald-bg` rgba(16,185,129,0.08) / 0.06
- `--border-primary` rgba(16,185,129,0.08) / rgba(0,0,0,0.08) · `--border-hover` rgba(16,185,129,0.20) / 0.25
- `--positive` #10b981 / #059669 · `--negative` #ef4444 / #dc2626 · `--warning` #fbbf24 / #d97706 · `--gold` #d4a853
- `--radius-md` 8px (buttons) · `--radius-xl` 16px (dialogs) · `--radius-pill` (Sonar, unread dot)
- `--shadow-xl` 0 20px 60px rgba(0,0,0,0.45) / 0 16px 48px rgba(0,0,0,0.10)
- Fonts: `--font-sans` Plus Jakarta Sans, `--font-mono` JetBrains Mono. Sizes used: 11, 12, 13, 14, 15, 17, 18, 22.
- Spacing: 4-base; 24 row padding, 32 page padding, 64 between side-by-side sections.
- **Missing token**: there is no primary button foreground token. The prototype uses `var(--bg-primary)` for text on emerald. Add `--primary-foreground` (dark #0a0e13, light #ffffff) and use it on primary buttons and the Sonar pill.

## Assets

- `assets/ezana-nav-logo.png` from the Ezana design system (pegasus mark). The brief calls for the Walia ibex logo; swap in that asset when available, left edge at x=32.
- Bootstrap Icons 1.11.3 via CDN: bell, list-check, grid-1x2, search, graph-up, chevron-down, broadcast, bookmark, people, stack, person-circle, gear, box-arrow-right, info-circle, pin-angle, trash3, hand-thumbs-up, trophy, chat, eye, lightbulb, arrow-right, file-earmark-text, journal-text, calendar3, paperclip, bar-chart, exclamation-circle, x-lg, megaphone.

## Files

- `Community Page.dc.html`: the page (template + logic). Props: `theme` (dark|light), `view` (ready|loading|empty|error), `modal`, `locked`, `modalTop`.
- `Community.dc.html`: canvas with dark and light pages, the four dialogs, section states and the audit list.
- `colors_and_type.css`: tokens (light scope extended to a `.light-mode` wrapper).
- `support.js`: runtime needed to open the `.dc.html` files in a browser.
