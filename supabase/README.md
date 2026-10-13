# Pàdé backend (Supabase)

Nothing here has been run against a real Supabase project yet. The access rules are tested against an in-memory Postgres (`npm test`), which is a strong check but not a substitute for a first real run.

## Set up

1. Create a project at supabase.com (pick a region close to Lagos, e.g. Europe or South Africa).
2. SQL editor: paste and run `migrations/0001_init.sql`.
3. Authentication → Providers: enable **Google** (needs a Google Cloud OAuth client; Supabase shows the callback URL to paste there) and **Email** (magic link / one-time code).
4. Authentication → URL configuration: set the Site URL and add the app's address (local: `http://localhost:5173/`) to Redirect URLs.
5. Project settings → API: copy the **Project URL** and the **anon public key** into `.env.local`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Never put the `service_role` key in the app or in git. It is only for the server job that creates matches.

Without those two variables the app runs in local mode: everything stays on the device and the People screen shows labelled samples.

## What the rules guarantee

- A person's contact handle and photo are readable only by them and by people they have been matched with.
- The app cannot create matches or sessions; only the server (service role) writes matches. `ensure_session` is the one allowed door for sessions, and only for Friday 9pm Lagos.
- RSVPs are private to each person.
