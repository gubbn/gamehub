# GameHub

An offline-first family holiday game app built from the shared ChatGPT brief.

## Run locally

Requires Node 22.12+ (Node 24 recommended).

```sh
npm ci
npm run dev
```

To verify and serve the installable offline app:

```sh
npm test
npm run build
npm run preview
```

The production preview serves on http://127.0.0.1:4173. The development server intentionally does not install a service worker.

## Included

- Quick Stop: turn timers, letter and category generation, no-repeat content, typed or spoken answers, elimination, challenges, one-point round winners, configurable target.
- Charades, Who Am I, Higher or Lower, with a shared player list and scoreboard.
- Cards from a real shuffled 52-card deck, 1–3 dice, letters, inclusive random number ranges, and a standalone timer.
- 60 Kids, 70 Family and 80 Adults categories from the brief. Adults and Mixed are opt-in. Built-in pack data is bundled and saved locally, so adding a pack does not need a network request.
- Local session history, avatars, score adjustments, custom categories, and JSON backup export/import.
- Responsive desktop and phone layout, accessible controls, keyboard dialogs, reduced-motion support and an installable PWA.

## Offline architecture

React renders a single IndexedDB state record through Dexie live queries. Every mutation uses a read/write transaction, including turn advancement and winner scoring. Timers store an absolute deadline; timeouts work after a background tab resumes or a page reloads. A timed-out Quick Stop player is eliminated, and the next turn waits for an explicit start so backgrounding the app cannot eliminate the entire crew. The reusable timer also persists.

The service worker precaches the entire app and its local assets. The UI only displays “Offline ready” after the worker finishes installing. Open the app online once, wait for that indicator, and install it before flying. On iOS, use Safari → Share → Add to Home Screen. A new device needs an initial online load. Private hosting can require a ChatGPT sign-in for that first load; later offline launches use the cached app.

Scores and names stay in the browser profile that created them. Export a backup before clearing browser data or switching devices. Updates are offered explicitly rather than reloading an active game.

## Optional Supabase backup

The app is fully playable without Supabase. No remote database has been provisioned or modified by this build.

1. Run `supabase/schema.sql` once in your selected project’s SQL editor.
2. Copy `.env.example` to `.env.local`. Set `VITE_SUPABASE_URL` and the browser-safe `VITE_SUPABASE_PUBLISHABLE_KEY`. Never use a secret or service-role key.
3. Add your deployed app URL to Supabase Auth → URL Configuration redirect allow-list and site URL.
4. Rebuild. Settings → Optional cloud backup supports email magic-link sign-in, automatic backup after local changes and explicit restore.

Each local device snapshot has a separate ID scoped to its authenticated owner. RLS and explicit API grants prevent access to other users’ backups. Automatic backup uploads do not replace local gameplay or merge conflicting devices. Restore is explicit, validates the snapshot and creates a fresh device ID. A failed upload does not block play; retries occur on the next change or reconnect, and “Back up now” permits manual retry. Cloud end-to-end operation requires a configured project and has not been live-tested without one.

Supabase references: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [magic links](https://supabase.com/docs/reference/javascript/auth-signinwithotp), [upsert](https://supabase.com/docs/reference/javascript/upsert).

## Project layout

- `src/engine.ts`: game rules and state transitions.
- `src/db.ts`: atomic local persistence and backup validation.
- `src/data.ts`: bundled packs and game descriptions.
- `src/random.ts`: random tools and shuffled decks.
- `src/cloud.ts`: optional backup, independent of gameplay.
- `src/App.tsx` and `src/styles.css`: responsive app interface.
- `.openai/hosting.json`: static Sites hosting configuration.

## Verification

Unit tests cover winner scoring, challenges, deadline enforcement, repeat prevention, pack separation, deck uniqueness, concurrent IndexedDB writes, persistence after database reopen, and backup restore. Browser QA checks player creation, round play, challenges, score persistence, game tools and responsive views. To check offline behaviour manually, stop the preview server and reload the already-cached app.
