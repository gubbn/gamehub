# GameHub

An offline-first family holiday game app built from the shared ChatGPT brief.

## Docker

The app includes a production `Dockerfile`, `.dockerignore` and Nginx configuration. From the workspace root (two directories above this app), run:

```sh
docker compose up --build -d --wait
```

Then open http://localhost:8080. See [the workspace Docker instructions](../../README.md) for configuration, logs, shutdown and offline behaviour. Node and app dependencies are needed only inside the build stage; the running container serves static files as a non-root user.

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
- Would You Rather with 60 Kids and 60 Adults questions, group voting and no-repeat question changes.
- Hangman with themed word packs, keyboard controls, hints and private custom-word handoff.
- Offline Trivia Quiz with five question packs, 5/10-question rounds, answer explanations and results.
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

## Mobile interface

Phones use a fixed Home / Games / Tools / Scores / More bar, a sticky header, and safe-area spacing for home indicators and camera cutouts. Controls are at least 44px tall and form text is 16px to avoid automatic input zoom. Dialogs become scrollable bottom sheets and trap focus while keeping the background still. Tools have quick-jump shortcuts; scoreboard cards keep all point adjustments available on small screens. Quick Stop defaults to spoken answers on all screen sizes: tap ✓ Survived for a valid spoken answer, or ✕ Out to eliminate the current player. Choose Type answers under Answer controls in setup or during play to record answers and check their letter and repeats. The choice is saved across reloads and backups; existing backups remain compatible. Spoken-answer validation remains the group's responsibility. Timers and challenges still apply.

## Eli Zone

Open **Eli Zone** from Home, All games, or the navigation menu. Its dictionary starts with 30 Montessori-inspired pictures in Animals, Food, Things, Shapes and Nature: 24 realistic painted subjects on plain warm-white backgrounds and six solid, precise SVG shapes. Card colours offer Sage, Sand, Rose and Sky; the chosen palette is saved locally and included in Eli backups. Palette changes affect surrounds only, keeping natural subject colours recognisable. **Find it** offers five untimed recognition rounds with 2–10 tiles and gentle retries. Choose the count under **Make it just right → Tiles to choose from**; it is saved locally and included in Eli backups. Smaller groups use only their available pictures, without duplicates. Phones keep two columns for clear pictures and large tap targets. **Name it** shows one picture at a time, with a parent-controlled word reveal. **Match Pair** deals three picture pairs for an untimed memory game. **Yes or No** asks five picture questions with gentle retry feedback, and **Find the Colour** runs five rounds using the exact solid swatches in the Colours pack. Category filters, optional word labels and picture inclusion make practice adjustable without affecting the family scoreboard. Picture IDs and words are retained across the artwork rebuild, so existing exclusions and custom photos remain intact.

The Picture library accepts named JPG, PNG or WebP images (up to 8 MB each, 100 personal pictures). Images are re-encoded as JPEG at up to 512px, stripping original photo metadata. Personal pictures can be renamed or left out of games without deleting them. All pictures and preferences are stored in a separate `gamehub-eli-v1` IndexedDB database, survive container rebuilds, and are **not sent to optional Supabase cloud backup**. Use **Export pictures** inside Eli Zone for a separate JSON backup. Import validates the file, previews it, and adds new pictures without replacing existing pictures or settings; duplicate IDs and words are skipped. Keep exported files private because they contain the images.

Spoken prompts use an available English **local device voice** only, when the parent taps Hear the word. No microphone, speech recognition, network voice service or automatic narration is used. If the device has no suitable voice, the app prompts the parent to read aloud. Offline speech availability depends on installed device voices. Object illustrations were created with built-in ImageGen; the final prompts are recorded in `artwork/eli/prompts.json`. Optimised 512px WebP assets live in `public/eli-art`; all are precached with the app for offline play. The six shapes are native SVG in `src/EliPicture.tsx`. Original generated images remain in the local Codex image folder. `scripts/prepare-eli-art.mjs` can re-encode a JSON source map (`id: absolute PNG path`) using Sharp, passed as an optional second argument, and produce an optional contact sheet at the third argument. No image-generation API key or external image service is needed to play.

## Eli expansion packs

Eli Zone → **Expansion packs** offers six opt-in sets: Animals (24 cards), Shapes (10), Letters (26, A–Z with uppercase and lowercase together), Numbers (21, 0–20 with counting dots for 0–10), Colours (11) and **100 basic words** (100 familiar pictureable nouns: animals, food, things and nature, not a sight-word curriculum). Letters practise letter names, not phonics. The 100-word set shares the animal and starter illustrations rather than duplicating them; enabling all packs gives 168 distinct built-in cards. Starter pictures remain available when an expansion is left out.

**Add to play** enables a pack without replacing existing preferences. **Practise this pack** enables it and selects it for the picture games; **Practice pack** switches between a single set, the starter library or all enabled pictures. Categories and individual exclusions still apply. Find the Colour always uses the bundled colour swatches. A personal picture takes precedence if an expansion introduces the same word, so recognition choices are unambiguous. Pack selections persist and are included in Eli backup exports; older backups default to no expansions. Import continues to add personal pictures only and preserves existing settings.

The 76 new Montessori-style illustrations are generated with built-in ImageGen and committed as optimised 512px WebP files under `public/eli-art`. All 100 illustrated vocabulary cards are precached, including disabled packs; switching packs requires no image service, GitHub API, login or network download. Native SVG handles precise shapes, letters, digits/counting dots and colour swatches. The existing Sage/Sand/Rose/Sky card palettes do not recolour the learning subjects. Generation prompts are in `artwork/eli/expansion-prompts.json`.

## Uno variants

Open **Uno variants** from Home, All games or the navigation menu. **Two-player solitaire** deals a separate face-down 2×5 board to each player, with target slots 0–9. Draw a number, place it in its matching slot and continue with the card revealed underneath. A drawn or revealed number whose slot is already complete is discarded and ends the turn. A handoff screen hides the next player's board until they are ready. The first completed board wins. **Solo practice** uses the same rules, with duplicates starting a new turn instead of changing players.

This is a house-rule variant, not official Uno gameplay. The bundled number-only deck has 76 cards (one zero and two of each 1–9 per colour); colours do not affect placement, and action/wild cards are omitted. Discards are reshuffled only when the draw pile runs out. Card art is original HTML/CSS, with no external image dependencies. The game, including face-down cards and a pending swap, is saved atomically in the main IndexedDB state and included in Settings backup export/import. Existing backups without Uno games remain compatible. It does not change the family scoreboard. Hidden cards are concealed in the interface, not encrypted against someone inspecting browser storage.

## Verification

Unit tests cover winner scoring, challenges, deadline enforcement, repeat prevention, pack separation, deck uniqueness, concurrent IndexedDB writes, persistence after database reopen, and backup restore. Browser QA checks player creation, round play, challenges, score persistence, game tools and responsive views. To check offline behaviour manually, stop the preview server and reload the already-cached app.
