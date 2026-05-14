# Vercel Deployment Guide

This Ezana Finance app is configured for deployment on Vercel with:

- **Next.js 14** (React framework)
- **Server-Side Rendering (SSR)** – All App Router pages are server-rendered by default
- **Tailwind CSS** – Utility-first styling

## Deploy to Vercel

1. Push your code to GitHub.
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
3. Click **Add New Project** and import your repository.
4. Vercel auto-detects Next.js – no extra config needed.
5. Add environment variables (if needed) in Project Settings → Environment Variables:
   - `NEXT_PUBLIC_FMP_API_KEY` – Financial Modeling Prep API key
   - `NEXT_PUBLIC_ALPHA_VANTAGE_KEY` – Alpha Vantage API key
   - Other API keys as used by your app
6. Click **Deploy**.

### Troubleshooting: "No Output Directory named 'public' found"

If you see this error, Vercel is configured for a static site instead of Next.js:

1. Go to your project on Vercel → **Settings** → **Build & Development Settings**
2. Set **Output Directory** to **empty** (clear the field – do not use `public`)
3. Ensure **Framework Preset** is **Next.js**
4. Redeploy

### Troubleshooting: "Configuration Settings differ from Project Settings"

This warning means the last deployment used different config than your current settings:

1. Ensure `vercel.json` only contains `{"framework": "nextjs"}` – no `buildCommand`, `outputDirectory`, or `installCommand` (these can conflict with dashboard settings)
2. In Vercel → **Settings** → **Build & Development Settings**, leave **Build Command**, **Output Directory**, and **Install Command** as default (empty) so Vercel uses Next.js preset
3. **Redeploy** – the warning clears once a new deployment uses the current config

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### HTML/CSS Playground (Legacy Pages)

The original HTML/CSS pages are available for testing and recording:

- **Playground:** [http://localhost:3000/app-legacy/playground.html](http://localhost:3000/app-legacy/playground.html)
- **Main Landing:** [http://localhost:3000/app-legacy/index.html](http://localhost:3000/app-legacy/index.html)
- **Home Dashboard:** [http://localhost:3000/app-legacy/pages/home-dashboard.html](http://localhost:3000/app-legacy/pages/home-dashboard.html)

On Vercel, use the same paths: `https://your-app.vercel.app/app-legacy/playground.html`

## Build

```bash
npm run build
npm start
```

## Project Structure

This project uses Next.js with the `src/` directory:

```
ezana-finance/
├── src/
│   ├── app/
│   │   ├── page.js          ← Homepage
│   │   ├── layout.js        ← Root layout
│   │   ├── globals.css
│   │   ├── signup/page.js
│   │   ├── signin/page.js
│   │   ├── home-dashboard/page.js
│   │   └── ...
│   ├── components/
│   └── lib/
├── app-legacy/              ← Legacy HTML/CSS (copied to public at build)
├── package.json
├── next.config.js
├── vercel.json
└── .gitignore
```

**Vercel Build & Development Settings:**

- Framework Preset: Next.js
- Root Directory: `./` (empty – project root)
- Build Command: (empty – uses `next build` from package.json)
- Output Directory: (empty – uses `.next`)
- Install Command: (empty – uses `npm install`)
