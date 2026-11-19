// @ts-check
import { defineConfig } from 'astro/config';
import contentEditor from './integrations/content-editor.mjs';

// `npm run dev:edit` sets this. The editor only runs on the dev server, never in builds.
const editMode = process.env.PUBLIC_EDIT_MODE === 'true';

export default defineConfig({
  site: 'https://yogifm.com',
  trailingSlash: 'ignore',
  // Renamed genre pages (keep in sync with genreAliases in src/lib/data.ts, which covers
  // the #… player links). Static builds emit a small redirect page for each.
  redirects: {
    '/music/indian': '/music/sitar',
    '/music/trance': '/music/house',
  },
  // The toolbar sits bottom-center, on top of the player controls, and swallows their
  // clicks (since 7.4.13 it also shows in `astro preview`). Never in production builds.
  devToolbar: { enabled: false },
  integrations: editMode ? [contentEditor()] : [],
});
