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

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Project Structure

- `src/app/` – Next.js App Router pages (SSR by default)
- `src/components/` – React components
- `app/` – Legacy static assets (CSS, images) used by the Next.js app
- `tailwind.config.js` – Tailwind configuration
- `vercel.json` – Vercel framework detection
