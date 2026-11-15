# Echo Sphere — Vercel setup

This project uses Vercel for the public full-stack site and Supabase PostgreSQL for persistence. The root Express application runs as a Vercel Node.js function; Vite builds the public frontend into `public/`.

## 1. Supabase database

1. Create a Supabase project.
2. Run all of `db/schema.sql` in Supabase SQL Editor.
3. Open Project Settings → Database → Connect and select the Session pooler connection string.
4. Keep the connection string private. Never place it in browser code or GitHub.

## 2. Import to Vercel

1. Sign in to Vercel and choose **Add New → Project**.
2. Import `git-pranav-09/eco-sphere` from GitHub.
3. Keep the project root as the Root Directory.
4. Set Build Command to `npm run build`.
5. Do not set a separate Output Directory. The Vite config builds the static site into `public/`.
6. Deploy once to obtain the Vercel project URL. The app will not fully start until its environment variables are configured.

## 3. Environment variables

In Project → Settings → Environment Variables, add these for Production:

- `DATABASE_URL`: Supabase Session pooler connection string
- `SESSION_SECRET`: random value at least 32 characters long
- `APP_BASE_URL`: exact production URL, e.g. `https://YOUR-PROJECT.vercel.app`
- `GOOGLE_CLIENT_ID`: Google OAuth web client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth web client secret
- `INITIAL_SUPER_ADMIN_EMAIL`: the one administrator account
- `NODE_ENV`: `production`

Redeploy after adding or changing environment variables.

## 4. Google OAuth

1. In Google Cloud Console, configure the OAuth consent screen.
2. Create an OAuth client of type **Web application**.
3. Add the exact Vercel production URL as an authorised JavaScript origin.
4. Add this authorised redirect URI:
   `https://YOUR-PROJECT.vercel.app/auth/google/callback`
5. Add the client ID and secret to Vercel Environment Variables and redeploy.

## 5. Admin access

- Sign in at `https://YOUR-PROJECT.vercel.app/admin/login`.
- Use the Google account matching `INITIAL_SUPER_ADMIN_EMAIL`.
- Dashboard: `https://YOUR-PROJECT.vercel.app/admin/`.

The server inserts the initial super-admin role at startup. Only verified Google accounts with an explicit role in `admin_roles` are authorised. The admin page and admin JavaScript are served through protected Express routes; they are not in the public static directory.

## 6. Test before sharing

- Public homepage loads and the globe renders.
- Submit a test story and confirm it appears as pending in the dashboard.
- Approve it and confirm it appears publicly.
- Reject another test story and confirm it does not appear publicly.
- Sign out and confirm the dashboard redirects to login.
- Try a different Google account and confirm it is denied administrator access.
- Test mobile layout and keyboard navigation.

## Important

- Never share database URLs, Google client secrets or session secrets.
- Do not collect exact locations or sensitive personal information.
- The current insights are descriptive database summaries; AI analysis and translation are not yet active in this migration.
- The new Supabase database does not automatically include data from the former Hatchable database.
- Ask a parent/guardian to help with account setup or any billing-related prompts. Review current provider quotas and plan limits before public promotion.
