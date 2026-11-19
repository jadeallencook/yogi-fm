# Astro migration

**Status: done (Nov 2026).** This file records the decisions. How things work now is in [architecture.md](architecture.md).

## Decisions

- **No UI framework.** The pages are `.astro` components. The only client code is a single vanilla TS module (`src/lib/player.ts`).
- **Content stays as the existing JSON** in `src/environments/`, imported through typed helpers in `src/lib/data.ts`, not Astro content collections. This keeps the update jobs and the file format unchanged and preserves key order, which is display order. Content collections are still an option if a schema or loader ever becomes useful.
- **Real routes** for speakers and genres, with player state still in the old URL hash format so shared links keep working.
- **Custom swap instead of relying only on `transition:persist`**, so the iframes never move (see architecture.md).
- **Same design**: SCSS and markup are carried over and only adjusted where elements became links or buttons.
- **Font Awesome and animate.css come from npm** instead of CDNs, at the same versions.
- **GA removed.** If analytics are wanted, ask the user which provider to use.

## Removed

`react-scripts`/React, `public/index.html`, `serviceWorker.js`, `App.test.js`, `logo.svg`, the `Search` stub, `create-component.php`, `jobs/custom-build.js` and `yarn.lock`.

## Still to do

- Replace the YouTube scraper jobs (see [data.md](data.md)).
- Unplayable videos were removed on 2026-11-18 (speakers and music; see data.md). Alan Watts and Eckhart Tolle are now empty; the user will add new videos in edit mode.
- Maybe: show speaker bios, add search, and add volume sliders.
