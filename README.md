# Echo Sphere

A human-centered global storytelling experience with an interactive globe, public story discovery, Google-authenticated administration, and human moderation.

## Recommended free-first deployment: Render + Supabase PostgreSQL

This repository contains the React/Vite frontend and Express backend. Render hosts both the public website and its API on one public URL; Supabase supplies PostgreSQL. The application uses Google OAuth and grants dashboard access only to email addresses present in the `admin_roles` table.

### Included features

- Responsive React + Vite public website and interactive globe
- Public feed that displays approved stories only
- Story submission with consent, input checks and rate limiting
- Express API for public stories and admin operations
- Google OAuth with verified-email checks
- Database-backed super-admin, moderator and analyst roles
- Moderation queue, approve/reject actions, team controls and audit log
- PostgreSQL schema and persistent login sessions

## Deploy

1. Create a Supabase project. In **Project Settings → Database → Connect**, select the **Session pooler** connection string. Keep the database password private.
2. In Supabase **SQL Editor**, run the contents of `db/schema.sql`.
3. In Render, choose **New → Blueprint**, connect this GitHub repository and let Render read `render.yaml`. The Blueprint creates a free web service; the database is external and is not created by Render.
4. In the Render web service's **Environment** settings, add:
   - `DATABASE_URL`: Supabase Session pooler connection string
   - `APP_BASE_URL`: the public Render URL, e.g. `https://echo-sphere.onrender.com`
   - `GOOGLE_CLIENT_ID`: Google OAuth web client ID
   - `GOOGLE_CLIENT_SECRET`: Google OAuth web client secret
   - `INITIAL_SUPER_ADMIN_EMAIL`: the one administrator Google email
   - `SESSION_SECRET`: a long random value of at least 32 characters (Render Blueprint generates one automatically)
   - `NODE_ENV`: `production` (set by Blueprint)
5. In Google Cloud Console, configure an OAuth consent screen and create an OAuth client of type **Web application**. Add the Render URL as an authorized JavaScript origin and add this authorized redirect URI:
   `https://YOUR-RENDER-SERVICE.onrender.com/auth/google/callback`
6. Save the Google client ID and secret in Render, then redeploy.
7. Open `https://YOUR-RENDER-SERVICE.onrender.com/admin/login` and sign in with the exact Google account configured in `INITIAL_SUPER_ADMIN_EMAIL`. Open `/admin/` for the dashboard.

The server applies `db/schema.sql` on startup and creates the initial super-admin role if it does not already exist. Sign-in alone never grants administrator access.

## Free-tier limitations

- Render Free web services spin down after inactivity; the first visit after sleeping can take around a minute to wake.
- Supabase Free projects can pause after a period of inactivity and have quotas. Check current limits before launch.
- This is suitable for a school project, prototype and small demonstration, not a guaranteed always-on production service. Do not collect sensitive personal information.
- Before inviting broad public traffic, add CAPTCHA and stronger persistent abuse controls, review privacy/retention requirements, and arrange a backup plan.

## Local development

Requires Node.js 20+.

```bash
npm install
npm run build
npm start
```

Set the required environment variables in a local `.env` file (never commit it). Run the SQL in `db/schema.sql` against a PostgreSQL database first.

## Security notes

- Never commit `.env`, OAuth secrets, database passwords or session secrets.
- Keep the Supabase database connection string server-side in Render environment variables only.
- The public client does not receive database credentials.
- Only verified Google accounts with a row in `admin_roles` can access the admin workspace.
- Country-level story locations are used; do not collect exact contributor locations.
- Review and approve every story before publication.

## Existing data

This migration uses a new PostgreSQL database. It does not automatically transfer records from the Hatchable-hosted database. Export/import any stories you intend to preserve before switching users to the new site.
