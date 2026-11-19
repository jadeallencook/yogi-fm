# Build & deployment

- **Node**: `.nvmrc` is `24`, and CI reads it. Astro 7 requires Node ≥ 22.23.4.
- **Install**: `npm ci` (npm only; `yarn.lock` was removed).
- **Dev**: `npm run dev` (or `npm start`) starts `astro dev` on http://localhost:4321. Astro 7 keeps a lock file, so a second `astro dev` in the same project exits with "Dev server already running". Use `npx astro dev status`, `stop` and `logs`, or `--port <n> --ignore-lock` to run a second one. `npm run dev:edit` adds edit mode (see [editing.md](editing.md)).
- **Build**: `npm run build` writes static HTML to `dist/`, which is gitignored along with `.astro/`.
- **Preview**: `npm run preview`. In Astro 7, `astro preview` **runs as a background daemon** and returns immediately. Use `npx astro preview status`, `stop` and `logs` to manage it.
- **Hosting**: GitHub Pages through `.github/workflows/deploy.yml` on every push to `master` (or a manual dispatch). It uploads `./dist`. The repo's Pages source must be "GitHub Actions".
- **Domain**: `yogifm.com`. With Actions-based Pages deploys, the custom domain comes from **Settings → Pages → Custom domain**, not from a CNAME file. `public/CNAME` is kept only for reference. `astro.config.mjs` `site` (and `SITE_URL` in `src/lib/site.ts`) sets canonical and `og:url` links.
- **Name history:** the site was briefly renamed **Sloppy Bhaktis** (sloppybhaktis.com) in Nov 2026, then switched back to Yogi FM. No domain move or redirect was set up. If you rename again, change `src/lib/site.ts`, `astro.config.mjs` `site`, `public/CNAME`, `public/manifest.json` and the Pages custom domain. Redirect the old domain with a 301 that keeps the path, since browsers carry the `#speaker/lecture/genre/song` hash across redirects.
- The old `gh-pages` branch from the 2021 deploy method still exists on the remote but is unused.

## Dependency versions

The Astro, Sass, Font Awesome and animate.css versions are pinned exactly. To upgrade Astro, use `npm install --save-exact astro@<version>`, not `npx @astrojs/upgrade`, so the pin stays exact. After an upgrade, re-run the manual player checks below, because the player depends on Astro's swap internals.

- **Astro 7.4.13** (Nov 2026, upgraded at the user's request). `npm audit` is clean. It fixes GHSA-mh32-jxcr-mh9f (patched in 7.4.5) and GHSA-r3h5-4585-7x3w (patched in 7.4.7).
- **Dev toolbar is disabled** in `astro.config.mjs`. It sits bottom-center, right on top of the player controls, and swallows clicks on play/pause. Since 7.4.13 it also appears in `astro preview`. It is never part of `dist/`.

## Testing

There is no automated test suite. To check changes, run `npm run build` and the preview server, then click through in a browser: navigation, play/pause, prev/next, Random, mobile width, and an old `/#speaker/lecture/genre/song` link. Check especially that the player keeps playing across navigation.

## Analytics (Umami)

Umami Cloud (free plan, cookieless, so no consent banner), website ID `31a8630e-1669-4adf-be89-408b66466a11` (public; it's in the page). Chosen in Nov 2026 over Google Analytics (cookies + consent banner, heavy) and Vercel Web Analytics (custom events need Vercel Pro).

- The script is in `Layout.astro`, **production builds only** (`import.meta.env.PROD`), with `data-domains="yogifm.com"` so local previews, edit mode and preview deployments aren't counted.
- `data-auto-track="false"`: the player rewrites the URL hash (`#speaker/lecture/genre/song`) on every track change, which auto-tracking would count as page views. `src/lib/analytics.ts` sends one page view per navigation (`astro:page-load`) with the path and query only, and queues calls until the deferred script has loaded (gives up after 20 s if it's blocked).
- Events (from player.ts): `Play lecture` {speaker, lecture} and `Play music` {genre, track} when a new video actually starts playing (once per video), `Open full screen`, `Random`, `Shuffle speaker` {speaker}. Never send personal data.
- To verify locally, block `cloud.umami.is` and stub `window.umami` in a headless browser (Umami ignores localhost because of `data-domains`).

