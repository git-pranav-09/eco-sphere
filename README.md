# Echo Sphere

A human-centered global storytelling experience with an interactive globe and a migrated moderator/admin workspace.

## Render deployment (recommended)

This branch, `render-migration`, contains the Render full-stack migration:
- React + Vite public frontend
- Express API replacing the Hatchable API handlers
- Render PostgreSQL schema for stories, admin roles and moderation logs
- Google OAuth login with verified-email checks and database-backed roles
- Original Hatchable admin dashboard interface and role model

### Deploy with Render Blueprint

1. Push/merge this branch to the repository's default branch, or select this branch when connecting the repository.
2. In Render, choose **New → Blueprint** and select this repository. Render reads `render.yaml` and provisions the web service and PostgreSQL database.
3. In the web service environment, set:
   - `APP_BASE_URL`: your Render service URL, e.g. `https://your-service.onrender.com`
   - `INITIAL_SUPER_ADMIN_EMAIL`: the Google account email that should receive initial super-admin access (use the project owner's intended admin email).
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: create OAuth credentials in Google Cloud Console.
4. In Google Cloud Console, configure an OAuth consent screen and add the exact callback URL:
   `https://YOUR-RENDER-SERVICE.onrender.com/auth/google/callback`
   Add your service URL as an authorized JavaScript origin where requested.
5. Deploy/redeploy. The server applies `db/schema.sql` on startup and creates the initial super-admin row if the configured email is not already present.
6. Visit `/admin/login`, choose Google sign-in with the configured initial super-admin account, then open `/admin/`.

### Local development

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and fill in the database URL, session secret, Google OAuth credentials and callback URL.
3. Create a PostgreSQL database and run:
   `psql "$DATABASE_URL" -f db/schema.sql`
4. Run `npm install`, `npm run dev` for the Vite frontend, and `npm start` for the Express server (the Vite dev server proxies are not configured in this migration yet; use the production server to test the full login/API flow).

## Admin roles

- **super_admin**: dashboard, moderation, team administration and audit logs
- **moderator**: dashboard and story moderation
- **analyst**: dashboard and aggregated insights only

Only verified Google accounts already present in `admin_roles` can enter the workspace. Sign-in alone never grants admin rights. The initial super-admin email is configured in Render, not hard-coded into client code.

## Database

The schema preserves the original Hatchable tables and role model:
- `stories` with pending/approved/rejected moderation state
- `admin_roles` with super_admin/moderator/analyst roles
- `moderation_logs` for moderation and administrator actions

This migration creates the schema in a new Render database. It does **not** automatically copy historical Hatchable production records; if there are existing stories/admins to preserve, export them from Hatchable and import them into Render PostgreSQL before switching the public domain.

## Security and launch checklist

- Use a long, unique `SESSION_SECRET`; keep all credentials in Render environment variables, never Git.
- Restrict the Google OAuth client to the production callback URL.
- Keep the database private and use Render's internal connection string.
- Configure a custom domain and HTTPS if desired.
- Test login, logout, each role, approve/reject, team changes, audit logs and public story submission.
- Add CAPTCHA and stronger abuse prevention before inviting broad public traffic. The submission endpoint has basic IP rate limiting and privacy-field checks, not a full anti-abuse system.
- Back up the database and verify the retention/backup policy of the selected Render PostgreSQL plan.

## Important status note

The Render configuration and migration code are prepared in this branch. A live Render service, OAuth credentials and a populated production database are not created until the repository is connected to your Render account and the environment values are configured.
