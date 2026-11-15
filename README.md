# Echo Sphere

A human-centered global storytelling experience with an interactive globe, public story discovery, Google-authenticated administration, and human moderation.

## Deployment: Vercel + Supabase PostgreSQL

The frontend is built by Vite into Vercel's `public/` static directory. The root Express app (`server.js`) runs as a Vercel Node.js function. Supabase provides PostgreSQL; Google OAuth controls administrator sign-in.

### Included

- Responsive React + Vite public website and interactive globe
- Public feed shows approved stories only
- Story submissions with consent, validation and rate limiting
- Express API for public stories and administration
- Google OAuth with verified-email checks
- Database-backed super-admin, moderator and analyst roles
- Moderation queue, approve/reject actions, team controls and audit log
- Private admin HTML/JS assets stored outside the public static directory

## Deploy on Vercel

1. Create a Supabase project and run `db/schema.sql` in its SQL Editor.
2. In Supabase **Project Settings → Database → Connect**, choose the **Session pooler** connection string. Keep it private.
3. Open Vercel and import the GitHub repository `git-pranav-09/eco-sphere`.
4. Use the repository root as the project root. Build command: `npm run build`. Do not set a separate output directory; Vite builds into `public/`, which Vercel serves as static assets.
5. Add these Environment Variables for Production (and Preview only if needed):
   - `DATABASE_URL`: Supabase Session pooler connection string
   - `SESSION_SECRET`: a long random secret (at least 32 characters)
   - `APP_BASE_URL`: the exact Vercel production URL, e.g. `https://YOUR-PROJECT.vercel.app`
   - `GOOGLE_CLIENT_ID`: Google OAuth web client ID
   - `GOOGLE_CLIENT_SECRET`: Google OAuth web client secret
   - `INITIAL_SUPER_ADMIN_EMAIL`: the one authorised administrator Google email
   - `NODE_ENV`: `production`
6. In Google Cloud Console, create a Web application OAuth client. Add the exact Vercel URL as an authorised JavaScript origin and this redirect URI:
   `https://YOUR-PROJECT.vercel.app/auth/google/callback`
7. Save the Google credentials in Vercel and redeploy.
8. Open `https://YOUR-PROJECT.vercel.app/admin/login`, sign in with the email configured in `INITIAL_SUPER_ADMIN_EMAIL`, and use `/admin/` for the dashboard.

Vercel automatically detects the root Express server. The app exports its Express instance as the default export. The server creates the schema and initial super-admin role at startup.

## Local development

Requires Node.js 20+.

```bash
npm install
npm run dev
```

For the production Express server, configure the environment variables above and run `npm start`.

## Security and privacy

- Never commit `.env`, OAuth secrets, database passwords or session secrets.
- Keep database credentials server-side in Vercel environment variables.
- Only verified Google accounts with a row in `admin_roles` can access the dashboard.
- Admin HTML and scripts are stored under `private/admin`, not the public static directory.
- Story locations are broad country-level only. Do not collect exact locations or sensitive personal information.
- Review and approve every story before publication.

## Feature status and limitations

- Community insights are descriptive database counts, not psychological conclusions.
- Automatic AI interpretation and translation are not enabled in the current Express/PostgreSQL migration.
- The Supabase database is new; records in the old Hatchable database are not automatically transferred.
- Before broad public promotion, add stronger anti-abuse controls and a documented data-retention/privacy process.
