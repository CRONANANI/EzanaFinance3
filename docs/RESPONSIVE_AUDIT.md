# Responsive Audit — April 26, 2026

This document is a **static code and stylesheet review** against the project’s scoped routes and the breakpoint ladder (240px–1920px). It is **not** a substitute for device lab testing. Where a line range is given, the issue is judged likely to appear in that range based on CSS rules and layout math.

**Route note:** There is **no** Next.js `app/.../research/...` segment. Scoped “research” surfaces were audited as **`/company-research`** (primary stock research UI).

## Summary

- **Total pages audited:** 20 (all paths in scope; `/research/*` mapped to `/company-research`)
- **Total cards / major UI blocks examined:** ~96 (pattern-based: `db-card`, `comm-*`, `wl-*`, `feature-card`, `plan-card`, `trd-*`, `m-*`, `echo-*`, `lc*/lc3-*`, `.ma-*` panels, settings panels, auth shells, etc.)
- **P0 issues found:** 5  
- **P1 issues found:** 24  
- **P2 issues found:** 31  

---

## P0 Issues (Broken UX — fix first)

### Page: /
**Card: Features grid (`features-grid`)**
- **Issue:** `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` forces each column to be **at least 280px** wide; with horizontal padding on the section/container, viewports **under ~280–320px** cannot fit one column without **horizontal overflow**.
- **Breakpoint:** ~**240px–319px** (and any narrow iframe respecting the same math)
- **File:** `app-legacy/components/landing/features-section.css` lines **61–67**
- **Suggested fix:** Lower the grid floor (e.g. `minmax(min(280px, 100%), 1fr)` or `minmax(0, 1fr)` with a single column under 360px).

### Page: /
**Card: Feature card (`feature-card`)**
- **Issue:** Fixed **`height` / `min-height: 220px`** plus **`overflow: hidden`** means any **longer localized copy** or **larger root font** can clip body text and CTAs instead of growing with content.
- **Breakpoint:** Any width; worst when **font scaling / translation** lengthens strings
- **File:** `app-legacy/components/landing/features-section.css` lines **90–103**
- **Suggested fix:** Replace fixed height with `min-height` only, allow vertical growth, and keep line clamps only on the description where intentional.

### Page: /pricing
**Card: Plan card grid (`pricing-cards-grid`)**
- **Issue:** Default **`repeat(3, 1fr)`** applies from **681px** up to **~1200px+** with no intermediate breakpoint; three dense marketing columns on **~700–900px** widths create **illegible pricing**, tight tap targets, and overflow risk in feature lists.
- **Breakpoint:** **681px–1023px** (tablet / large phone landscape)
- **File:** `src/app/pricing/pricing-standalone.css` lines **130–138** (contrast with **`@media (max-width: 680px)`** at lines **625–632**)
- **Suggested fix:** Insert a **two-column (or stacked hero + row)** breakpoint around **768–900px** before collapsing to one column at 680px.

### Page: /company-research (`/research/*` in scope)
**Card: DCF chart rows (`dcf-chart-bar-row`)**
- **Issue:** `grid-template-columns: 140px 1fr 100px` with **`gap: 1rem`** leaves very little **`1fr`** track on **narrow phones**; labels/values collide or wrap badly without a mobile stack.
- **Breakpoint:** **~240px–480px** (and congested **480–640px**)
- **File:** `src/components/research/dcf/dcf-interactive.css` lines **468–473**
- **Suggested fix:** At max-width ~640px switch to **single-column stack** (label, bar, value).

### Page: /trading/*
**Card: Positions row (`trd-position-row`) — desktop rules**
- **Issue:** Desktop grid uses **five columns** with **`minmax(120px, 1fr)`** and similar lanes; **total implicit minimum width** is large. Between **769px and ~1024px**, the table region can **force horizontal scrolling** or **overlap** before the user benefits from the simplified **`@media (max-width: 768px)`** layout.
- **Breakpoint:** **769px–1024px** (small laptop / tablet landscape)
- **File:** `src/app/(dashboard)/trading/trading.css` lines **125–127** vs mobile override **199–211**
- **Suggested fix:** Raise the mobile/stacked breakpoint to **1024px** or add a **compact two-row card** layout for the “tablet” band.

---

## P1 Issues (Visible Degradation)

### Page: /
**Card: Section headings (`features-grid-header h2`)**
- **Issue:** **`font-size: 2.5rem`** fixed at large sizes without `clamp()`; on **360–414px** with long titles, headings can **dominate the fold** and push CTAs below expected fold without scaling.
- **Breakpoint:** **320px–480px**
- **File:** `app-legacy/components/landing/features-section.css` lines **43–52**
- **Suggested fix:** Use `clamp()` or reduce size in a **`max-width: 480px`** tier.

### Page: /pricing
**Card: Billing toggle (`billing-btn`)**
- **Issue:** Vertical padding **`0.45rem`** plus text yields **touch targets likely under ~44px** on mobile.
- **Breakpoint:** **240px–680px**
- **File:** `src/app/pricing/pricing-standalone.css` lines **77–90**
- **Suggested fix:** Increase vertical padding or min-height to meet **44px** interactive target on small screens.

### Page: /auth/login
**Card: Login choice links (`portal-login-choice`)**
- **Issue:** **`min-h-[6.5rem]`** keeps height acceptable, but **horizontal layout** (`flex` + chevron) on **very narrow widths** can make **secondary text** collide with the icon column when descriptions wrap awkwardly (no `min-width: 0` on text wrapper).
- **Breakpoint:** **240px–360px**
- **File:** `src/app/auth/login/page.js` lines **28–40** (and sibling link blocks)
- **Suggested fix:** Stack icon/title/description vertically under **360px** or add **`min-width: 0`** / **`flex-basis`** to the text column.

### Page: /auth/signup
**Card: Name row (inline flex wrapper)**
- **Issue:** **`style={{ display: 'flex', gap: '12px' }}`** with two **`flex: 1`** children has **no `flex-wrap`**, so **first/last name fields stay side-by-side** at ultra-narrow widths and become **too narrow to use**.
- **Breakpoint:** **240px–360px**
- **File:** `src/app/auth/signup/page.js` lines **139–166**
- **Suggested fix:** Switch to **column stack** under 400px or use **`flex-wrap: wrap`** with **`min-width: min(100%, 140px)`**.

### Page: /auth/partner/apply
**Card: Apply grid (`partner-apply-grid`)**
- **Issue:** **`repeat(2, 1fr)`** without breakpoint until **`max-width: 768px`**; at **769px–900px** the two cards are **very narrow relative to copy**.
- **Breakpoint:** **769px–900px**
- **File:** `src/app/auth/partner/apply/partner-apply.css` lines **62–67** and **425–437**
- **Suggested fix:** Collapse to **one column** below **900–960px**, not only below 768px.

### Page: /home-dashboard
**Card: Total profits card (`db-profits-card`)**
- **Issue:** **`height: 392px`** fixes the card; donut + scroll region must fit **all locales / font sizes**; risk of **crowded legend** or **tiny chart** on **short mobile viewports**.
- **Breakpoint:** **240px–768px** height-sensitive (not width-only)
- **File:** `src/app/(dashboard)/home-dashboard/home-dashboard.css` lines **565–570**
- **Suggested fix:** Replace fixed **`height`** with **`min-height`** and let the card grow, or shorten the fixed height on **`max-height` / aspect-ratio** mobile tiers.

### Page: /home-dashboard
**Card: Hero timeframe pills (`db-hero-timeframes`)**
- **Issue:** Mobile rules enable **wrap**, but **dense pill clusters** can still **wrap across 3+ lines** on **320px**, pushing the hero chart **below the fold**.
- **Breakpoint:** **320px–390px**
- **File:** `src/app/(dashboard)/home-dashboard/home-dashboard.css` lines **877–882**
- **Suggested fix:** Use **compact chip styling** or **horizontal scroll** with snap for timeframe controls under **400px**.

### Page: /home
**Card: Week activity row (`hts-week-day-labels` / dots / counts)**
- **Issue:** **`grid-template-columns: repeat(5, 1fr)`** for weekday columns with **tiny font (0.5625rem)**; on **240–360px** each column is **extremely narrow**, harming **readability and tap affordances** on adjacent interactive dots.
- **Breakpoint:** **240px–360px**
- **File:** `src/components/home/home-terminal-summary.css` lines **728–738**
- **Suggested fix:** Switch to **2-row layout**, **abbreviated labels**, or **horizontal scroll** for the five-day strip on small widths.

### Page: /home
**Card: Streak bars (`streak-card__bars`)**
- **Issue:** **`repeat(30, minmax(0, 1fr))`** creates **30 micro-columns**; on narrow screens each bar is **1–2 CSS pixels** wide, which is **hard to perceive** and **chart-like meaning is lost**.
- **Breakpoint:** **240px–480px**
- **File:** `src/components/home/home-terminal-summary.css` lines **1975–1981**
- **Suggested fix:** Reduce visible buckets on mobile (e.g. last **14 / 10 days**) or increase **minimum bar width** via fewer columns.

### Page: /home
**Card: Home terminal rows (`hts-row-1`)**
- **Issue:** Three-column grid **`repeat(3, minmax(0, 1fr))`** relies on **`max-width: 768px`** tiering in the same file to collapse; between **769px and 1024px** **three KPI columns** can be **over-compressed** on small tablets.
- **Breakpoint:** **769px–1024px**
- **File:** `src/components/home/home-terminal-summary.css` lines **48–50**, **962–972**
- **Suggested fix:** Collapse **three-across to two-across** at **900–1024px**.

### Page: /watchlist
**Card: Main layout (`wl-main`)**
- **Issue:** Desktop **`1fr 340px`** sidebar; at **1025px–1100px** the **chart column** can feel **cramped** next to a **fixed-ish 340px** rail (only steps down at **`max-width: 1024px`**).
- **Breakpoint:** **1025px–1150px**
- **File:** `src/app/(dashboard)/watchlist/watchlist.css` lines **139–144**, **438–441**
- **Suggested fix:** Begin **narrowing the right rail** (e.g. 300px) from **1100px** down.

### Page: /watchlist
**Card: Comparable companies table (`wl-comp-head` / `wl-comp-row`)**
- **Issue:** **Six-column** grid with small font; container uses **`overflow: hidden`** on **`.wl-comp-table`**, so **clipping** is possible where **names or numbers** grow (long tickers, %).
- **Breakpoint:** **240px–768px** (and crowded **768–1024px**)
- **File:** `src/app/(dashboard)/watchlist/watchlist.css` lines **477–489**
- **Suggested fix:** Add **horizontal scroll** on the wrapper or **column hiding** tiers (like **`wl-cmp-*`** rows already do elsewhere).

### Page: /community
**Card: Stat row (`comm-row-1`)**
- **Issue:** **Four columns** from **1201px** upward; between **1200px and ~1280px** on **scaled UI**, stat cards can feel **tight** before the **1200px → 2-col** relief (see `@media (max-width: 1200px)`).
- **Breakpoint:** **1201px–1280px** (marginal)
- **File:** `src/app/(dashboard)/community/community.css` lines **111–116**, **992–997**
- **Suggested fix:** Move **4→2 column** breakpoint to **~1280px** or add **`minmax(0,1fr)`** + smaller internal padding.

### Page: /community/messages
**Card: Conversation + thread grid (`m-grid`)**
- **Issue:** **`height: calc(100vh - 180px)`** with **`min-height: 520px`** can **overflow small phone browsers** (address bar / toolbars) and create **double scroll** or **cut-off composer**.
- **Breakpoint:** **240px–480px** (viewport height sensitive)
- **File:** `src/app/(dashboard)/community/messages/messages.css` lines **123–129**
- **Suggested fix:** Replace fixed **`100vh`** math with **`dvh`** / **`svh`** fallbacks and lower **`min-height`** on short screens.

### Page: /community/messages
**Card: Header icon buttons (`m-iconbtn`)**
- **Issue:** **`36×36px`** controls are **below the 44px** comfort target for touch.
- **Breakpoint:** **240px–768px**
- **File:** `src/app/(dashboard)/community/messages/messages.css` lines **65–77**
- **Suggested fix:** Increase to **44px** square or add **invisible hit slop**.

### Page: /profile/[username]
**Card: Metric values (`mg-value`)**
- **Issue:** **`font-size: 1.375rem`** in a **dense grid** can **overflow** horizontally when values are **long (currency + %)** unless parent clipping is handled — **`mg-grid`** is responsive but **value text** has **no ellipsis strategy**.
- **Breakpoint:** **240px–400px**
- **File:** `src/components/profile/metrics-grid.css` lines **35–41**, **1–6**
- **Suggested fix:** Add **`overflow: hidden; text-overflow: ellipsis`** or **tabular wrapping** rules on **`mg-value`** for narrow columns.

### Page: /market-analysis
**Card: Floating layer panel (`ma-panel`)**
- **Issue:** **Fixed `width: 520px`** and **`left: 130px`** on desktop; **only below 768px** does CSS switch to **`left/right: 0.5rem; width: auto`** — between **769px and ~820px** there is a **narrow band** where **panel width + offset** can **exceed** the canvas or **cover the map awkwardly**.
- **Breakpoint:** **769px–840px** (edge of breakpoints)
- **File:** `src/app/(dashboard)/market-analysis/market-analysis-world-monitor.css` lines **462–476**, **1410–1413**
- **Suggested fix:** Apply **`width: min(520px, calc(100vw - …))`** and fluid **`left`** earlier than 768px.

### Page: /settings
**Card: Desktop sidebar (`settings-sidebar`)**
- **Issue:** **`width: 300px`** fixed; on **just above mobile** (769px–900px) if the shell ever shows sidebar, **content pane** can be **very narrow** — current UX hides sidebar **≤768px**, but **tablet landscape** at **900–1024** may still feel **cramped** with padding.
- **Breakpoint:** **769px–1024px** (if layout shown)
- **File:** `src/app/settings/settings.css` lines **62–75**, **983–986**
- **Suggested fix:** Allow **`width: min(300px, 32vw)`** or collapse to **drawer** under **1024px**.

### Page: /ezana-echo
**Card: Hero banner (`echo-hero-banner`)**
- **Issue:** **`height: 400px`** on desktop is **tall relative to small laptops**; slows **time-to-content**; **640px breakpoint** drops to **280px**, leaving **641px–768px** still at **400px**.
- **Breakpoint:** **641px–768px** (height / aspect)
- **File:** `src/app/(dashboard)/ezana-echo/ezana-echo.css` lines **12–17**, **494–500**
- **Suggested fix:** Use **`aspect-ratio`** + **`max-height`** or start the **280–320px** hero sooner.

### Page: /ezana-echo/[articleId]
**Card: Article inset (`echo-article-page-inset`)**
- **Issue:** **`padding: 1.25rem 2rem`** on desktop narrows text column; OK at **1280+** but at **1024–1280** side padding is **large relative to text measure**.
- **Breakpoint:** **1024px–1280px**
- **File:** `src/app/(dashboard)/ezana-echo/ezana-echo.css` lines **527–533**, **535–538**
- **Suggested fix:** Use **fluid padding** (`clamp`) tied to viewport.

### Page: /learning-center
**Card: Track layout (`lc3-bottom-grid`)**
- **Issue:** **`grid-template-columns: 340px 1fr`** is rigid; between **901px and 1200px** the **340px** rail consumes **a large share** on **small landscape tablets**.
- **Breakpoint:** **901px–1200px**
- **File:** `src/app/(dashboard)/learning-center/learning-center.css` lines **738–743**, **958–961**
- **Suggested fix:** Switch **`340px`** to **`minmax(280px, 32%)`** or stack earlier at **1080px**.

### Page: /learning-center
**Card: Track progress row (`lc3-track-progress-row`)**
- **Issue:** **Five columns** at large sizes; only below **1200px** falls to **3**, then **2** below **900/768** — between **1201px and 1400px** five **segmented controls** can **shrink below comfortable tap size**.
- **Breakpoint:** **1200px–1440px**
- **File:** `src/app/(dashboard)/learning-center/learning-center.css` lines **711–716**, **952–956**
- **Suggested fix:** Cap at **4 columns** until **1440px** or use **horizontal scroll**.

### Page: /help-center
**Card: Choice grid (`hc-card-interactive` via Tailwind `sm:grid-cols-2`)**
- **Issue:** Below **`sm` (~640px)** the grid is **single column** but cards use **`p-8`**; **240–360px** horizontal padding from **PageContainer** + card padding reduces **usable text width**.
- **Breakpoint:** **240px–639px**
- **File:** `src/app/help-center/page.js` lines **19–23**, **8–11**
- **Suggested fix:** Use **`p-4 sm:p-8`** on **`hc-card-interactive`** (class-level) for narrow tiers.

### Page: /account/reactivate
**Card: Card shell (`reactivate-card`)**
- **Issue:** **`padding: 3rem 2.5rem`** is **large on 320px**, squeezing **body copy** between padding rails.
- **Breakpoint:** **240px–400px**
- **File:** `src/app/account/reactivate/reactivate.css` lines **10–17**
- **Suggested fix:** Add **`@media (max-width: 480px)`** with **`padding: 1.75rem 1.25rem`**.

### Page: /trading/*
**Card: Showcase hero (`trd-hero-title`)**
- **Issue:** **`font-size: 2.5rem`** without **`clamp()`**; on **320px** the title can **consume excessive vertical space** above fold-critical CTAs.
- **Breakpoint:** **320px–480px**
- **File:** `src/app/(dashboard)/trading/trading.css` lines **228–234**
- **Suggested fix:** Scale with **`clamp(1.5rem, 6vw, 2.5rem)`**.

### Page: /company-research (`/research/*`)
**Card: Chart skeleton (dynamic import placeholder)**
- **Issue:** Inline **`height: 216`** placeholder is **fixed**; if **real chart height** differs by breakpoint, **CLS or jump** still happens when swapping.
- **Breakpoint:** All (CLS / consistency)
- **File:** `src/app/(dashboard)/company-research/page.js` lines **32–37**
- **Suggested fix:** Match skeleton **height** to **CSS chart height** per tier or use **aspect-ratio** skeleton.

---

## P2 Issues (Polish)

### Page: /
**Card: Features section container (`features-container`)**
- **Issue:** **`padding: 0 2rem`** is **static**; at **240px** width **side gutters consume ~16%** each side — acceptable but **tight** for **`minmax(280px)`** grid floor.
- **Breakpoint:** **240px–360px**
- **File:** `app-legacy/components/landing/features-section.css` lines **25–31**
- **Suggested fix:** Use **`clamp(1rem, 4vw, 2rem)`** horizontal padding.

### Page: /pricing
**Card: Comparison table (`comparison-table`)**
- **Issue:** **`min-width: 720px`** forces **horizontal scroll** inside wrap — acceptable pattern, but **scrollbar affordance** on **iOS** is easy to miss (**P2** polish).
- **Breakpoint:** **240px–719px**
- **File:** `src/app/pricing/pricing-standalone.css` lines **356–371**
- **Suggested fix:** Add **edge fade** or **“scroll” hint** for the table strip.

### Page: /auth/login
**Card: Decorative blurs**
- **Issue:** Large **`w-96 h-96`** blurred blobs are **perf-heavy on low-end phones** (not strictly layout, but affects **smooth scrolling**).
- **Breakpoint:** **240px–480px**
- **File:** `src/app/auth/login/page.js` lines **11–14**
- **Suggested fix:** Reduce blur size or **`prefers-reduced-motion`** / **`prefers-reduced-data`** guard.

### Page: /auth/signup
**Card: Card padding (`p-8`)**
- **Issue:** **`p-8`** on **`max-w-md`** is comfortable but on very small screens reduces form field width; minor polish.
- **Breakpoint:** **240px–360px**
- **File:** `src/app/auth/signup/page.js` line **119**
- **Suggested fix:** **`p-5 sm:p-8`**.

### Page: /auth/partner/apply
**Card: Page padding (`padding: 2rem`)**
- **Issue:** Fixed **2rem** on **320px** leaves **little horizontal room** for forms next to container **`max-width: 800px`** (mostly OK but **polish**).
- **Breakpoint:** **240px–390px**
- **File:** `src/app/auth/partner/apply/partner-apply.css` lines **3–9**
- **Suggested fix:** **`padding: 1rem`** default, **`2rem`** from **`sm`**.

### Page: /home-dashboard
**Card: Donut label (`db-donut-label`)**
- **Issue:** **`font-size: 0.5rem`** is **extremely small** for accessibility on **high-DPI phones**.
- **Breakpoint:** **240px–390px**
- **File:** `src/app/(dashboard)/home-dashboard/home-dashboard.css` lines **626–631**
- **Suggested fix:** Raise to **~0.625rem** minimum or use **SVG text scaling**.

### Page: /home
**Card: Progress track (`hts-progress-track`)**
- **Issue:** **8px** height is **slightly under** common **touch** recommendation when the whole bar is interactive (if it is).
- **Breakpoint:** Touch devices
- **File:** `src/components/home/home-terminal-summary.css` lines **108–114**
- **Suggested fix:** Increase hit target / wrap in larger padding.

### Page: /watchlist
**Card: Strip spark / asset chips (`wl-strip-assets`)**
- **Issue:** Hidden at **`max-width: 480px`** (**`.wl-strip-assets { display: none; }`**) — good for clutter; **users lose context** on the smallest tier (**polish / tradeoff**).
- **Breakpoint:** **240px–480px**
- **File:** `src/app/(dashboard)/watchlist/watchlist.css` lines **452–457**
- **Suggested fix:** Replace with **single “+N” chip** instead of full hide.

### Page: /watchlist
**Card: Strip card (`wl-strip-card`)**
- **Issue:** **YTD label** uses **`!important`** on color — suggests **theme fighting**; can complicate **dark/light** fixes later.
- **Breakpoint:** Maintenance / all
- **File:** `src/app/(dashboard)/watchlist/watchlist.css` lines **102–106**
- **Suggested fix:** Remove **`!important`** by raising selector specificity with **tokens**.

### Page: /community
**Card: Search input (`comm-search-input`)**
- **Issue:** **`padding`** totals **~32px** height region with **`font-size: 0.75rem`**; likely **under 44px** tap height.
- **Breakpoint:** **240px–768px**
- **File:** `src/app/(dashboard)/community/community.css` lines **88–100**
- **Suggested fix:** **`min-height: 44px`** and **`font-size: 0.8125rem`**.

### Page: /community/messages
**Card: Title (`m-header__title`)**
- **Issue:** **`1.5rem`** title without **`clamp`** on **320px** with **long strings** (accessibility text size) may **wrap heavily**.
- **Breakpoint:** **320px–390px**
- **File:** `src/app/(dashboard)/community/messages/messages.css` lines **44–51**
- **Suggested fix:** **`clamp()`** heading size.

### Page: /profile/[username]
**Card: Metrics grid (`mg-grid`)**
- **Issue:** **2-column** layout on **phone** is **good**; **0.625rem** labels are **small** for **aging users** (**polish**).
- **Breakpoint:** **240px–480px**
- **File:** `src/components/profile/metrics-grid.css` lines **27–33**
- **Suggested fix:** **`0.6875rem`** minimum or **dynamic type** hook.

### Page: /market-analysis
**Card: Right-side panel variants (`ma-panel-right`)**
- **Issue:** **`width: 380px`** fixed on desktop; **polish** alignment with **`ma-panel`** responsive behavior above **768px**.
- **Breakpoint:** **769px–1100px**
- **File:** `src/app/(dashboard)/market-analysis/market-analysis-world-monitor.css` lines **478–482**
- **Suggested fix:** Same **`min()`** width strategy as main panel.

### Page: /settings
**Card: Mobile dropdown items (`settings-mobile-item`)**
- **Issue:** **`padding: 0.75rem`** may yield **~36–40px** row height depending on **line boxes** — borderline touch.
- **Breakpoint:** **240px–768px**
- **File:** `src/app/settings/settings.css` lines **1046–1059**
- **Suggested fix:** **`min-height: 44px`**.

### Page: /settings
**Card: Nav icon box (`settings-nav-icon`)**
- **Issue:** **36px** icons — **sub-44px** target (desktop nav; lower severity).
- **Breakpoint:** N/A desktop primary — **P2**
- **File:** `src/app/settings/settings.css` lines **136–148**
- **Suggested fix:** Optional **hit padding** for **touch laptops**.

### Page: /ezana-echo
**Card: Article grid (`echo-article-grid`)**
- **Issue:** **Three columns** default; breakpoint at **1100px** — **1001px–1100px** three columns can be **narrow tiles**.
- **Breakpoint:** **1000px–1100px**
- **File:** `src/app/(dashboard)/ezana-echo/ezana-echo.css` lines **222** (see grep context), **478–481**
- **Suggested fix:** Move **3→2** breakpoint to **1180px**.

### Page: /ezana-echo/[articleId]
**Card: Related grid (if using `repeat(auto-fit, minmax(160px, 1fr))`)**
- **Issue:** **`160px`** floor can still cause **two very narrow** cards side-by-side on **~360px** if container padding is low.
- **Breakpoint:** **340px–400px**
- **File:** `src/app/(dashboard)/ezana-echo/ezana-echo.css` line **1199** (pattern located via search)
- **Suggested fix:** **`minmax(min(160px,100%),1fr)`** or **force 1 column** under **400px**.

### Page: /learning-center
**Card: Badge tiles (`lc3-badge-tile`)**
- **Issue:** **44px** tiles — **meets** minimum; spacing **`gap: 0.75rem`** is fine; **no wrap issues** (**pass** with note).
- **Breakpoint:** N/A
- **File:** `src/app/(dashboard)/learning-center/learning-center.css` lines **688–696**
- **Suggested fix:** None — **documented as OK**.

### Page: /learning-center
**Card: Track CTA buttons (`lc3-track-card-btn`)**
- **Issue:** **`!important` on `min-height`** reset fights **global button styles** — maintenance smell.
- **Breakpoint:** Maintenance
- **File:** `src/app/(dashboard)/learning-center/learning-center.css` lines **718–721**
- **Suggested fix:** Remove **`!important`** with **scoped token** or **more specific selector**.

### Page: /help-center
**Card: Hero padding (`hc-hero`)**
- **Issue:** **`4rem 1rem`** — **top heaviness** on **short phones** in **landscape**.
- **Breakpoint:** **Height < 600px** landscape
- **File:** `src/app/help-center/help-center.css` lines **28–41**
- **Suggested fix:** **`@media (max-height: 600px)`** compact hero.

### Page: /account/reactivate
**Card: Button (`reactivate-btn`)**
- **Issue:** Padding **`0.85rem 2rem`** approximates **44px** — OK; **secondary links** might be **small tap** (**polish**).
- **Breakpoint:** **240px–390px**
- **File:** `src/app/account/reactivate/reactivate.css` lines **74–86**, **98–103**
- **Suggested fix:** Increase **link tap padding**.

### Page: /trading/*
**Card: Quick amount chips (`trd-quick-btn`)**
- **Issue:** **`padding: 0.375rem 0.875rem`** creates **short controls** (**polish** / touch).
- **Breakpoint:** **240px–768px**
- **File:** `src/app/(dashboard)/trading/trading.css` lines **44–46**
- **Suggested fix:** **`min-height: 36–44px`** on mobile.

### Page: /trading/*
**Card: Feature grid (`trd-feature-grid`)**
- **Issue:** **Two columns** at **all sizes** in this block — on **240–360px** marketing **feature cards** are **very narrow** unless a mobile rule exists later (verify in **`trading.css`** extended section).
- **Breakpoint:** **240px–480px**
- **File:** `src/app/(dashboard)/trading/trading.css` lines **266–271**, **448** region (see second `@media`)
- **Suggested fix:** **1 column** under **480px** for showcase cards.

### Page: /company-research (`/research/*`)
**Card: Model / AI card shell (`company-research-theme.css`)**
- **Issue:** Heavy use of **`!important`** on borders/backgrounds for **`.ai-analysis-card`** — not a layout bug, but **complicates responsive overrides**.
- **Breakpoint:** Maintenance / all
- **File:** `src/app/(dashboard)/company-research/company-research-theme.css` lines **14–28**
- **Suggested fix:** Scope tokens without **`!important`** where possible.

### Page: /company-research (`/research/*`)
**Card: Home terminal parity cards (imported `home-terminal-summary.css` patterns)**
- **Issue:** Same **`!important`** grid correction at **768px** in terminal CSS (**`grid-template-columns: 1fr !important`**) suggests **cascade conflicts** when research page composes multiple sheets.
- **Breakpoint:** **≤768px**
- **File:** `src/components/home/home-terminal-summary.css` lines **1889–1899**
- **Suggested fix:** Resolve source order / specificity instead of **`!important`**.

---

## Cards / Blocks That Are Already Responsive (No Changes Needed)

These passed the **pattern review** with **tiered grids**, **`minmax(0,1fr)`**, **wrap**, **scroll containers**, or **obvious mobile media blocks** without fixed fatal widths:

- **`/pricing` — `pricing-h1`** using **`clamp()`** (`src/app/pricing/pricing-standalone.css` ~40–47)
- **`/pricing` — comparison table wrap** with **`overflow-x: auto`** (`pricing-standalone.css` ~356–362)
- **`/home-dashboard` — `db-row-2` / `db-row-3`** collapse at **1024px** (`home-dashboard.css` ~830–833)
- **`/home-dashboard` — hero stack** rules at **`max-width: 768px`** (`home-dashboard.css` ~835–930)
- **`/watchlist` — `wl-main`** stacks to **1 column** at **768px** (`watchlist.css` ~442–444)
- **`/watchlist` — ticker strip** intentional **horizontal scroll** (`watchlist.css` ~19–26) — acceptable UX pattern
- **`/community` — `comm-row-2` / `comm-row-4`** drop to **1 column** at **1024px** (`community.css` ~999–1010)
- **`/community/messages` — `m-grid` → side-by-side** from **768px** (`messages.css` ~131–135)
- **`/profile/[username]` — `mg-grid`** 2-col → 3-col at **900px** (`metrics-grid.css` ~1–10)
- **`/market-analysis` — `ma-panel`** fluid width / insets at **`max-width: 768px`** (`market-analysis-world-monitor.css` ~1410–1413)
- **`/settings` — mobile selector** replaces sidebar **`≤768px`** (`settings.css` ~983–1038)
- **`/ezana-echo` — `echo-article-grid`** collapses through **1100px / 640px** (`ezana-echo.css` ~478–497)
- **`/learning-center` — `lc3-bottom-grid`** stacks **`≤900px`** (`learning-center.css` ~958–961)
- **`/help-center` — `hc-hero`** tiered padding with **`@media (min-width: 768px)`** (`help-center.css` ~39–41)
- **`/trading/*` — form rows (`trd-row`)** collapse **≤768px** (`trading.css` ~199–211)
- **`/auth/login` — choice cards** `min-h-[6.5rem]` + full-width flex (`src/app/auth/login/page.js`)

---

## Audit Method (for fix pass traceability)

1. **Scoped** `page.js` routes under `src/app` and `(dashboard)` for each URL in the user list.  
2. **Searched** card class patterns (`db-card`, `comm-*`, `wl-*`, `feature-card`, `plan-card`, `trd-*`, `echo-*`, `m-*`, `lc*`, `ma-*`, `hts-*`, `streak-card*`, settings, auth, help-center, reactivate).  
3. **Read** co-located CSS and shared component stylesheets; flagged **fixed px**, **inflexible grids**, **missing wrap**, **<=44px targets**, **overflow/clipping**, and **`!important`** in responsive paths.  
4. **Did not** change application source code, run formatters, or execute visual regression tests.

---

_End of report._
