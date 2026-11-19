# History

- **Mar 2018**: Started as an Angular app with an admin dashboard (login, upload). It was soon rebuilt in React.
- **2018–2019**: Most development happened here: speakers, music genres, books, Krishnamurti and more Ram Dass lectures (emoji-prefixed commit messages).
- **May 2020**: Last content update. The Astro site still uses this data and design.
- **Dec 2021 – Jan 2022**: A rewrite moved content to the **Prismic** headless CMS (`src/prismic.js`) and added React Router 6, React context (`AppContext`), a `MobileMenu`, and `gh-pages` deploys. To see it, check out `411c6bb` (Jan 2022).
- **Oct 2026**: That rewrite was dropped. The May 2020 version was restored as `master` (PR #40, branch `interview-demo`). Dependencies were bumped to `react-scripts` 5 and `sass` so it builds on Node 18, and deploys moved to GitHub Actions Pages.
- **Nov 2026**: Migrated to Astro 7 with the same design, assets and data (see [astro-migration.md](astro-migration.md)).
- **Nov 2026**: Briefly renamed **Sloppy Bhaktis** (sloppybhaktis.com), then switched back to **Yogi FM** (yogifm.com). No domain change was made.

Several stale dependabot branches still exist on the remote.
