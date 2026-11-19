# Yogi FM

Yogi FM (yogifm.com) collects YouTube lectures from spiritual speakers (Alan Watts, Ram Dass, Krishnamurti, …), organizes them by speaker, and plays them with optional background music.

**Stack:** a static **Astro 7** site with no UI framework, SCSS, and one vanilla TS client module for the player. It deploys to GitHub Pages. It was migrated from Create React App in Nov 2026, keeping the same design, assets and data.

## Commands

- `npm run dev`: dev server at http://localhost:4321
- `npm run dev:edit`: dev server with **edit mode** (`PUBLIC_EDIT_MODE=true`), which lets you edit titles, delete videos and add videos (YouTube link) in the page, saved to the JSON. Astro 7 allows one dev server per project; stop the other one first. See `documentation/editing.md`.
- `npm run build`: static build to `dist/`
- `npm run preview`: serves `dist/`. In Astro 7 this runs as a background daemon; stop it with `npx astro preview stop`.
- `npm run check-videos`: checks every video (oEmbed plus the real YouTube player in headless Chrome). It's a dry run by default; `-- --delete` removes unavailable speaker videos (saved to `jobs/removed-videos/` for `--restore`). See `documentation/data.md`.
- `npm run fetch-portraits`: fills in missing speaker photos from freely licensed Wikimedia Commons images, with credit (see `documentation/data.md`).
- `npm run fetch-durations`: saves every video's length to `durations.environment.json` (YouTube Data API; needs `YOUTUBE_API_KEY` in the git-ignored `.env`). See `documentation/data.md`.
- `npm run fetch-bios`: refreshes speaker bios from Wikipedia (uses each speaker's `wikipedia` title; `-- --dry-run --show` to preview). See `documentation/data.md`.
- `npm run update`: YouTube scraper jobs. **Don't run them.** They're broken and overwrite data; see `documentation/data.md`.

Node 24 (`.nvmrc`). Astro 7 needs Node ≥ 22.23.4.

## Documentation

Read the relevant doc before working in an area, and keep it updated when things change:

- `documentation/product.md`: what the product does, features, content
- `documentation/architecture.md`: Astro structure, routing, and how the persistent player works
- `documentation/data.md`: content JSON schemas and update jobs
- `documentation/editing.md`: local edit mode (env flag, dev-only endpoint, safeguards)
- `documentation/deployment.md`: build, CI, GitHub Pages, domain, dependency notes, manual testing
- `documentation/astro-migration.md`: migration decisions and remaining to-dos
- `documentation/history.md`: project timeline, including the abandoned 2021 Prismic rewrite

## Rules for agents

- **Never push to the remote** (no `git push`, no PRs, no opening branches on GitHub). The user pushes.
- **Record what you learn.** When you discover something non-obvious (a quirk, a decision, a gotcha), add it to this file or the right `documentation/` file in the same change.

## Gotchas

- Navigation replaces only `[data-page]` (custom `astro:before-swap` in `src/lib/player.ts`). Never move or re-render the player's iframes, because that stops playback. Page content must live inside the layout's `<slot />`.
- Player state is in the URL hash. Update it with `history.replaceState(history.state, …)` so Astro's router state is kept.
- Edit mode must never reach production. Gate edit UI on `EDIT_MODE` (`src/lib/edit-mode.ts`, which also requires `DEV`), keep server code in `integrations/content-editor.mjs` (dev server only), never statically import `EditorTools.astro` or give it a `<style>`, and keep editor CSS `?inline`. After editor changes, run `PUBLIC_EDIT_MODE=true npm run build` and check that `dist/` has no editor code (commands in `documentation/editing.md`).
- Anything added to `<head>` at runtime is removed on the next client-side navigation (Astro's head swap). Put runtime `<style>`/elements in `<body>` (outside `[data-page]`).
- Astro's ClientRouter turns every `<form>` submit into a navigation, and its listener runs before page scripts. Client-handled forms need `data-astro-reload` (and/or a capture-phase listener).
- The Astro dev toolbar is disabled on purpose. It covers the player controls and blocks their clicks.
- The SCSS is global and its selectors depend on the exact markup copied from the React app. Check the matching `src/styles/*.scss` before changing a component's element structure.

## Conventions

- The site name, tagline and URL live in `src/lib/site.ts`. Never hard-code "Yogi FM" in components.
- Home page groups (`featured.environment.json`) have exactly 3 speakers each, the most prominent ones, and no speaker in two groups; the build fails otherwise. Not every speaker is featured.
- Lecture titles follow the user's Alan Watts style (Title Case, just the topic, no speaker name/years/"full lecture"); see "Lecture title style" in `documentation/data.md`.
- Adding a speaker: follow the checklist in `documentation/data.md` (portraits only from freely licensed Commons images, with credit).
- Content lives in `src/environments/*.json`, keyed by slug. Key order is display order. YouTube playlists on the project's channel are the source of truth for the video lists.
- Pin dependencies to exact versions. Prefer releases at least two weeks old, unless the user asks for a specific or the latest version.
- `CLAUDE.md` is a symlink to this file. Edit `AGENTS.md`.
- Keep this file short and put details in `documentation/`.
