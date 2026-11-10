# Echo Sphere 🌍

**One Planet. Billions of Stories.**

A human-centered AI storytelling experience with an interactive 3D globe, AI-assisted story analysis, multilingual translation, global discovery and admin moderation.

## Stack
- React + Vite
- Three.js through `react-globe.gl`
- Supabase (Postgres, Auth, Edge Functions)
- Google Gemini API
- Vercel deployment

## Quick start
See [SETUP.md](./SETUP.md) for the full Windows setup and deployment guide.

```bash
npm install
npm run dev
```

The app starts in preview mode with sample stories until Supabase is configured.

## Privacy by design
- Country-level locations only; no exact GPS coordinates.
- Public users can only read approved stories.
- New stories are pending until human approval.
- AI is assistive, not the final publication decision.
- Never expose Gemini or Supabase service-role secrets in frontend code.

## Project status
Starter release source code. Real AI and database features become active after you configure and deploy the Supabase Edge Function using `SETUP.md`.
