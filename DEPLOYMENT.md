# GameHub deployment

GameHub is a static Vite PWA hosted by Vercel. Supabase provides passwordless
authentication and private cloud backups, while GitHub stores the source and
runs the test/build checks.

## Supabase

1. Create or select a Supabase project close to the players.
2. Apply `supabase/schema.sql` to the project.
3. Copy the project URL and publishable key from the API settings.
4. Set the Authentication Site URL to the production Vercel URL.
5. Add redirect URLs for local development and Vercel previews:

   ```text
   http://localhost:8080/**
   http://localhost:5173/**
   https://*-YOUR-VERCEL-TEAM.vercel.app/**
   ```

Replace `YOUR-VERCEL-TEAM` with the Vercel account or team slug. The schema
enables row-level security and gives signed-in users access only to their own
backups.

## GitHub

Use `main` as the default branch. `.github/workflows/ci.yml` runs the tests and
a production build on pushes to `main` and pull requests.

Do not commit `.env` files or Supabase secret/service-role keys. GameHub needs
only a publishable key in the browser.

## Vercel

Import this repository into Vercel. The repository root is the Vercel project
root. Add these variables to Production, Preview and Development:

```text
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR-PUBLISHABLE-KEY
```

Deploy, then add the resulting production and preview URLs to Supabase's Auth
redirect configuration. `vercel.json` configures the Vite build, long-lived
hashed-asset caching, prompt service-worker updates and browser security
headers.

## Production check

1. Open the production URL and wait for `Offline ready`.
2. Request a sign-in link from Settings and return to the production domain.
3. Create a cloud backup, refresh and confirm it appears in the backup list.
4. Confirm sign-in works from a Vercel preview deployment.
5. Take the device offline and confirm the installed PWA still opens.
