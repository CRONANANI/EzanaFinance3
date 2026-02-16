# Next.js + React Migration

## Overview

Ezana Finance is being migrated from a vanilla HTML/CSS/JS static site to **Next.js 14** with **React 18**.

## Current Structure

```
EzanaFinance3/
├── app/                    # LEGACY: Original static HTML site (reference)
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── layout.js       # Root layout, theme, nav
│   │   ├── page.js         # Landing page
│   │   ├── globals.css     # Theme variables
│   │   ├── signin/
│   │   ├── signup/
│   │   ├── home-dashboard/
│   │   ├── market-analysis/
│   │   └── ...             # All route pages
│   └── components/
│       ├── ThemeProvider.js
│       ├── Layout/
│       │   └── Navbar.js
│       └── landing/
│           ├── LandingHero.js
│           ├── FeaturesSection.js
│           └── FAQSection.js
├── next.config.js
├── package.json
└── jsconfig.json
```

## Running the App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

- **Framework Preset:** Next.js (auto-detected)
- **Build Command:** `next build`
- **Output Directory:** `.next`

## Migration Status

### Completed
- [x] Next.js scaffold and config
- [x] Theme provider (dark/light)
- [x] Global layout with Navbar
- [x] Landing page (hero, features, FAQ)
- [x] Route placeholders for all main pages

### In Progress
- [ ] Full content migration for each page
- [ ] Antigravity background, CardSwap, Cursor Reveal
- [ ] Notifications sidebar
- [ ] Chart.js integrations (home dashboard, market analysis)

### Legacy App
The original `app/` folder remains for:
- CSS reference (imported by Next.js pages)
- Asset files (images, etc.)
- Gradual migration reference

## Coexistence

During migration, both can run:
- **Next.js:** `npm run dev` → localhost:3000
- **Legacy:** Serve `app/` with any static server if needed

Once migration is complete, the `app/` folder can be archived or removed.
