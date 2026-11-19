# Local content editing (edit mode)

Edit, delete and add videos from the site itself while running locally. Every change writes straight to `src/environments/*.json`. You then commit the change like any other.

## Use it

```sh
npm run dev:edit        # = PUBLIC_EDIT_MODE=true astro dev
```

An "Edit mode" badge shows top-right. On any speaker or genre page:

- **Edit a title:** hover a row and click **Edit**. The input holds the raw stored title; rows display capitalized only through CSS. **Enter** or **Save** writes it, and **Escape** or **Cancel** discards it.
- **Delete:** hover a row, click **Delete**, then **Yes, delete** (or **No**). Confirmation happens inside the row, with no browser dialog. Deleting the last video in a list is allowed: the page then shows "No lectures yet" and the player skips that list until you add one. Deletion can't be undone from the page. The dev server log prints the deleted ID and title, and git has the previous version.
- **Add:** use the dashed form above the list. Paste a YouTube link (watch, youtu.be, embed, shorts, live, or music.youtube) or an 11-character ID. Leave the title blank to use YouTube's title; for speakers a leading "Speaker Name -" or "Name:" is stripped. Choose top (the default) or bottom (key order is display order) and click **Add**. The server checks the video with YouTube oEmbed first. It refuses videos that are removed, private or not embeddable, and duplicates in the same list. The new row appears in place, without a page reload.

**No page reloads.** Edits, deletes and adds update the page in place, and playback continues. The integration's Vite plugin (`content-editor:skip-browser-reload`) cancels the browser hot update for each file the editor just wrote: one write cancels one update, within 5 s. The server-side (SSR) environment still updates, so the next navigation or reload renders the new data. Changes to the JSON made by hand in a code editor still reload the page as usual. On the client, `editor.ts` updates the row, the in-memory content (the same `speakers`/`music` module objects `player.ts` uses), and then dispatches `content:changed`; the player re-renders the marquee, thumbnail tooltips and active rows. If a link's hash points at a video that was deleted, it falls back to that list's first video.

**Astro 7 allows only one dev server per project** (it keeps a lock file). If `npm run dev` is already running, `dev:edit` prints "Dev server already running" and exits. That running server does *not* have edit mode. Stop it first with `npx astro dev stop`, or run both with `npm run dev:edit -- --port 4400 --ignore-lock`. Don't edit with two edit-mode servers at once: each one rewrites the whole file, so they can overwrite each other.

## How it works

| Piece | File | Role |
|---|---|---|
| Flag | `src/lib/edit-mode.ts` | `EDIT_MODE = import.meta.env.DEV && PUBLIC_EDIT_MODE === 'true'` (used for markup in `Songs.astro`) |
| Backend | `integrations/content-editor.mjs` | Astro integration. Its `astro:server:setup` hook adds `/__editor/*` to the **dev server only**. Registered in `astro.config.mjs` only when `PUBLIC_EDIT_MODE=true`. |
| UI | `src/components/EditorTools.astro` + `src/lib/editor.ts` | Badge, inline edit, delete confirm, add form handling. `Layout.astro` **dynamically imports** EditorTools behind the literal dev-only condition (see Gotchas). |
| Markup | `src/components/Songs.astro` | Per-row Edit/Delete buttons and the add form, only when `EDIT_MODE`. |
| Styles | `src/styles/editor.css` | Imported with `?inline` and injected by `editor.ts` (see Gotchas). |

**Endpoints** (all `POST`, JSON body; `kind` is `"speaker"` or `"music"`, `slug` is the speaker or genre key):

| Route | Body | Does |
|---|---|---|
| `/__editor/title` | `{ kind, slug, id, title }` | Sets `videos[id]` |
| `/__editor/delete` | `{ kind, slug, id }` | Removes `videos[id]` (may empty the list) |
| `/__editor/add` | `{ kind, slug, video, title?, position? }` | Checks oEmbed (only the video ID is sent to YouTube), then inserts at `top` or `bottom` (`bottom` if `position` is omitted; the form always sends it, defaulting to `top`); 409 for a duplicate, 422 if not embeddable |

Every change is logged in the dev server output (title old → new, deleted titles, added titles).

**Safeguards:**
- It only exists on the dev server. Production builds contain no editor markup, script file, styles or endpoint, even when built with `PUBLIC_EDIT_MODE=true`. This was checked by grepping `dist/` and listing `dist/_astro`.
- It requires `Content-Type: application/json`, so a cross-site form post can't reach it, and it rejects a foreign `Origin`.
- The kind must be one of the two files, and the slug and video ID must already exist (checked with `Object.hasOwn`, so `__proto__` is rejected). Titles must be 1–300 characters after trimming and collapsing whitespace. Added IDs must match `[A-Za-z0-9_-]{11}`. The body is capped at 10 KB.
- It writes to a temp file and renames it, so a crash can't leave half-written JSON. It keeps the file's format: the content files are single-line compact JSON, so a change round-trips byte-for-byte apart from the edited video (a delete followed by an add at the same position was verified byte-identical). Because each file is one line, a git diff shows the whole line as changed; use `git diff --word-diff` to see just the edit.

**Gotchas:**
- **Editor styles live in `<body>`, not `<head>`.** On client-side navigation, Astro's `swapHeadElements()` removes head elements the next page doesn't list. The runtime-injected editor `<style>` used to vanish, leaving unstyled Edit/Delete buttons and the add form wrapping under each title until a full reload. Our swap only replaces `[data-page]`, so a `<style>` in the body persists.
- **Restart the dev server after changing `integrations/content-editor.mjs`.** The integration (middleware and Vite plugin) is loaded at startup.
- Every edit-mode element has `[data-editor]`. `player.ts` ignores clicks inside those, so clicking Edit, Delete or an input doesn't play the lecture.
- **Astro's ClientRouter intercepts every `<form>` submit** and turns it into a page navigation (`?video=…`). Its listener runs before ours, so `preventDefault()` in a normal listener is too late. Editor forms carry `data-astro-reload`, which the router skips, and `editor.ts` also listens in the capture phase.
- **Don't statically import `EditorTools.astro`, don't add a `<style>` to it, and don't use a plain CSS import in `editor.ts`.** Astro emits the script and CSS of every statically imported component even when it isn't rendered: the CSS goes into every page and the script becomes an orphan file in `dist/_astro`. That's why the Layout uses `await import()` behind `import.meta.env.DEV && …` and the CSS is imported with `?inline`.
- After changing anything editor-related, run `PUBLIC_EDIT_MODE=true npm run build` and check that `grep -rlE "edit-title|__editor|add-video-form|delete-video" dist` prints nothing and that `ls dist/_astro | grep -i editor` is empty.
