# Echo Sphere — setup guide

Echo Sphere is a React + Three.js + Supabase application with a Gemini-powered Edge Function. The included sample stories are clearly marked as demo data. Real submissions are stored as `pending` and do not appear publicly until an administrator approves them.

## 0. What you need

- Windows 10/11
- Node.js 20 LTS or newer
- A code editor (VS Code recommended)
- Free-tier Supabase project
- Google AI Studio API key (check the current Gemini API terms and free-tier limits)

No payment details are required by this source code. Provider availability, free-tier quotas and eligibility can change.

## 1. Run the website locally (Windows quick start)

1. Extract the ZIP.
2. Install Node.js 20 LTS or newer from https://nodejs.org/ if it is not already installed.
3. Open the extracted `echo-sphere` folder and double-click `START_ECHO_SPHERE.bat`.
4. The helper checks Node.js, installs dependencies, starts Vite and opens `http://localhost:5173`. Keep the server window open while using the site.

If Windows blocks the batch file, right-click it and choose **Open**. You can also use VS Code Terminal and run `npm install` followed by `npm run dev`.

Without Supabase configuration, the site runs in clearly labelled preview mode with sample stories. Story submission and translation need the backend setup below.

## 2. Create Supabase project

1. Create a project at https://supabase.com.
2. In Project Settings → API, copy the Project URL and anon/publishable key.
3. Copy `.env.example` to `.env.local`.
4. Put your values in:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

These are browser-side public credentials. Never put a service-role key or Gemini key in `.env.local`.

5. Restart Vite after changing environment variables.

## 3. Create the database

1. In Supabase, open SQL Editor.
2. Open `supabase/migrations/001_echo_sphere.sql` from this project.
3. Paste the complete SQL into the editor and run it.
4. Confirm that `stories` and `profiles` tables exist.

The SQL enables Row Level Security. Public visitors can only read approved stories. The Edge Function uses a server-side service key to create pending submissions.

## 4. Configure the real AI function

1. Create an API key in Google AI Studio: https://aistudio.google.com/app/apikey
2. In Supabase, open Edge Functions → Secrets.
3. Add:
   - `GEMINI_API_KEY` = your Google AI Studio key
   - `GEMINI_MODEL` = `gemini-3.8-flash` (change to a currently available model in your AI Studio account if needed)
   - `SUPABASE_SERVICE_ROLE_KEY` = the server-side service-role key from Supabase Project Settings → API

Never paste these secrets into frontend files, screenshots, public GitHub repositories or messages. Do not share the keys with anyone.

4. Install the Supabase CLI and sign in, then link your project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

5. Deploy the Edge Function:

```bash
supabase functions deploy story-ai --no-verify-jwt
```

The function is intentionally callable by visitors, so it validates the input and uses a server-side key. For a public launch, add a CAPTCHA/anti-bot check and persistent rate limiting before inviting broad traffic. Keep Gemini usage quotas low and monitor usage.

## 5. Create an administrator

1. In Supabase Dashboard → Authentication → Users, invite or create the administrator account using an email you control.
2. Verify the account.
3. Copy that user's UUID.
4. In SQL Editor, run this, replacing the UUID:

```sql
insert into public.profiles (id, role)
values ('YOUR_AUTH_USER_UUID', 'admin')
on conflict (id) do update set role = 'admin';
```

5. In the website, select Admin in the footer.
6. Enter the administrator email and use the sign-in link delivered by Supabase.
7. Pending stories will appear in the moderation panel. Approve or reject them.

Do not grant admin access to public users. The profiles table intentionally has no self-promotion policy.

## 6. Deploy the frontend free-tier

### Vercel

1. Push the project to a private GitHub repository.
2. Import the repository into Vercel.
3. Set Framework Preset to Vite (or let Vercel detect it).
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Project Settings → Environment Variables.
5. Deploy.

The included `vercel.json` supports client-side routes. Add your production domain to Supabase Authentication → URL Configuration (Site URL and Redirect URLs).

## 7. Test checklist

- [ ] Homepage loads on desktop and mobile.
- [ ] Globe rotates and sample markers can be selected.
- [ ] Stories tab and theme search work.
- [ ] Insights reflect the currently displayed dataset.
- [ ] Supabase connection replaces sample stories with approved records.
- [ ] A submitted story is analysed by Gemini and saved as `pending`.
- [ ] Pending stories do not appear in the public story list.
- [ ] Admin can approve or reject stories.
- [ ] Translation calls the Edge Function and returns translated text.
- [ ] No secret keys appear in browser source or Git history.

## Important production notes

This is a working starter release, not a fully audited production social network. Before inviting the public:
- Add CAPTCHA and database-backed rate limiting to the public submission endpoint.
- Add a report/appeal process and a documented moderation policy.
- Add retention/deletion controls for submissions.
- Review legal, privacy and child-safety requirements for your intended audience and countries.
- Consider disabling public story submissions until moderation coverage is ready.
- Gemini free-tier terms and quotas can change; verify current terms in Google AI Studio.
- Sample globe locations are illustrative country-level coordinates, not actual contributor locations.
