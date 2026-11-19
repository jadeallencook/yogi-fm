# Architecture

This is a static Astro site (Astro 7, no UI framework) with no backend. All content comes from JSON at build time (see [data.md](data.md)). The only client-side code is the player script.

## Layout

```
astro.config.mjs        site = https://yogifm.com
public/                 icons, manifest, CNAME, assets/ (yogi-fm-logo.png, images/: speaker photos, banner)
src/layouts/Layout.astro  <head>, ClientRouter, Player + Sidebar + <div data-page><slot/></div>
src/pages/
  index.astro           Home: Banner + Featured (class "Browse")
  speakers/[slug].astro One page per speaker (Songs component)
  music/[slug].astro    One page per genre (Songs component)
src/components/
  Player.astro          Footer player markup + loads src/lib/player.ts
  Sidebar.astro         Logo, Home, Random, speaker + genre links, Support (Buy Me a Coffee) link
  Banner.astro          "You're listening to <speaker> with <genre>..."
  Featured.astro        Curated speaker groups
  Songs.astro           Speaker/genre header + clickable video list
src/lib/data.ts         Typed access to the JSON, defaults, URL helpers
src/lib/site.ts         Brand constants: SITE_NAME, SITE_TAGLINE, SITE_URL, FOUNDED_YEAR
src/lib/player.ts       All client behavior (YouTube players, state, navigation)
src/styles/             SCSS, one file per component + _global.scss (colors/fonts) + index.scss
src/environments/       Content JSON
```

### Logo and icons

The logo is `public/assets/yogi-fm-logo.png` (724×724, transparent). The icons are generated from it (trimmed to the drawing and centered, Pillow, Lanczos): `public/favicon.ico` (16/32/48), `icon-192.png` and `icon-512.png` (manifest and `<link rel="icon">`), and `apple-touch-icon.png` (180px on cream `#F3E9DA`, because iOS fills transparency with black). Regenerate all four if the logo changes. The previous favicon was the 2018 Create React App one.

### Styles

The SCSS was carried over from the React app almost unchanged. Each file is imported by its component and bundled globally, not scoped, so the original selectors (`div.Player >div`, `div.Featured …`) still work. Markup deliberately copies the React DOM; for example, `Player.astro` reproduces react-youtube's wrapper `<div>` › player `<div>`. Things that were clickable `<div>`/`<span>`s are now `<a>`/`<button>`s, and their SCSS resets them to look the same (`.link` in Sidebar.scss). Mobile styles still use `max-device-width: 480px`, and `player.ts` checks the same media query.

The home page Banner (Banner.scss) is a centered flex column with `aspect-ratio: 2/1`, capped at `min(55vh, 600px)`. On phones it uses 16:10. Its text is sized in `cqi` of `.Browse` (`container-type: inline-size`) and capped by `vh`. This replaced the React app's breakpoint heights (40vw, then 20vw above 1300px), which cropped the image to a thin strip. `banner.jpg` is only 960×600, so it looks soft on big screens; a larger source image (≥2400px wide) would fix that. On ultrawide screens (3440px) the cap still crops it to about 5:1.

The sidebar (Sidebar.astro/.scss, redesigned Nov 2026) persists across navigation, so its state is set by player.ts: `markActiveLink()` (on `astro:page-load`) gives the current page's link (`[data-nav-link]` whose `href` matches the path) `.active` + `aria-current="page"` (blue bar on the left), and `render()` marks the speaker/genre loaded in the player (`[data-side-speaker]`, `[data-side-genre]`) `.current`, plus `.playing` to animate its equalizer bars. Links are grey and turn white with a soft highlight on hover; Home and Random have icons; names keep `text-transform: capitalize` (like the home page). Donations: a heart "Support Yogi FM" link to Buy Me a Coffee (https://buymeacoffee.com/jadeallencook, new tab) above the footer; it replaced the PayPal form in Nov 2026.

The home banner (Banner.astro/.scss) shows what's playing: a small uppercase label ("Press play to listen to", or "Now playing" with moving equalizer bars), the speaker name, the lecture title, a music pill, and Play/Pause (`data-control="toggle"` + `[data-banner-toggle]`), Full screen (`data-control="expand"`) and Shuffle (`data-random`) buttons that reuse the player's handlers. `render()` fills the `[data-now]` fields (only writing changed text) and toggles `.Banner.playing`. A radial dark glow (`::before`) keeps the text readable on the photo and the bottom fades into the page color. The buttons are hidden on phones. Because the banner also has a `data-control="toggle"`, look up the footer button as `.Player [data-control="toggle"]`.

The speaker page header (Songs.astro, `div.cover` in Songs.scss) was redesigned in Nov 2026: a 4:5 rounded portrait over a blurred, grayscale copy of it (`.backdrop`), the name, "years · N lectures", and buttons handled in player.ts: **Play** (`[data-play-speaker]`, the same handler as the home tiles; its `[data-label]` reads Play/Pause), **Shuffle** (`[data-shuffle-speaker]`, a random lecture from that speaker other than the current one) and **Full screen** (`[data-expand-page]`, opens the full-screen player listing *this page's* speaker). Speakers with no videos show no buttons. The Wikipedia bio is clamped to 4 lines (`line-clamp`) with a "Read more" toggle (`[data-bio-toggle]`), shown by `setupBioToggles()` only when the text is actually cut off. Books have a "BOOKS" label, rounded covers that lift on hover, and 2-line title captions. There is no scrollbar: `updateBookPagers()` shows only as many whole books as fit in the row (recomputed on resize), and the arrow buttons next to the label (`[data-books-page]`) switch to the previous/next set; each arrow is hidden when there is nothing that way. The lecture count is rendered at build time, so edit-mode adds/deletes show up in it after a reload.

The lecture/track list (Songs.astro `div.rows`, Songs.scss) matches the full-screen player's list: a small "LECTURES 21" / "TRACKS 5" label instead of column headers (the redundant Speaker/Genre column is gone), a number from a CSS counter (so edit-mode adds/deletes renumber themselves) that becomes ▶ on hover, blue equalizer bars on the playing row (`.active`; they move only while `.Songs.playing`, set in `render()`), and a soft rounded hover instead of opacity. Each row shows the video's length on the right (`span.length`, `formatDuration()` in data.ts), from `durations.environment.json` (see data.md). Songs.astro imports that file itself for the page lists. The full-screen list (`renderQueue()`) is built in the browser, so player.ts also imports it (~3.5 KB gzipped added to the player script). Rows added in edit mode have no length until the next `npm run fetch-durations` and rebuild; in edit mode the length is hidden while the row's Edit/Delete buttons show (editor.css). Rows are built in two places: Songs.astro and `buildRow()` in `src/lib/editor.ts` (edit mode). Keep them identical.

**Titles are shown exactly as written.** Lecture titles are curated in Title Case (data.md), so there's no `text-transform: capitalize` on them anywhere (list, marquee, banner, full-screen list). Music track titles are raw YouTube titles, so music rows, the music part of the marquee (`.part.music`) and music queue rows still capitalize.

The home page (Featured.astro/.scss) was redesigned in Nov 2026 and no longer follows the React markup: groups are `<section>`s in a responsive grid, each with a quiet header (uppercase, letter-spaced title like the sidebar's "SPEAKERS" label, a one-line `description`, a thin rule). Tiles are 4:5 posters with rounded corners that stretch to fill the column, with the name, years (`formatYears()`: "1915–1973", "1944–Now" for living) and lecture count on a bottom gradient. The photo stays grayscale and zooms on hover/focus (redrawn on `::before` with `background: inherit`, scaled inside the `overflow: hidden` tile). Hover also shows a centered play button (`[data-play-speaker]`) that starts the speaker's first lecture without leaving the page, or plays/pauses if it's already the current speaker; it's hidden for speakers with no videos and on phones. `render()` in player.ts marks the current speaker's tile (`[data-speaker-tile]`, `.current` + blue ring + "Now playing" badge whose equalizer bars move only while `.playing`). No animation under `prefers-reduced-motion`.

Font Awesome 4.7 and animate.css 3.7 come from npm (imported in `Layout.astro`), not a CDN. Fonts are Google Fonts.

## Routing and the persistent player

- Speakers and genres have real URLs (`/speakers/<slug>/`, `/music/<slug>/`).
- `<ClientRouter fallback="swap" />` gives client-side navigation. `player.ts` overrides `astro:before-swap` to **replace only `[data-page]`** (plus head and root attributes). The player and sidebar are never touched, so the YouTube iframes keep playing.
- **Why not plain `transition:persist`?** Astro re-parents persisted elements during the swap. It uses `Element.moveBefore()` where available (Chromium 133+); other browsers detach the iframe, which reloads it and stops playback. `transition:persist` is still on the player and sidebar as a fallback in case `[data-page]` is missing.
- Module scripts run once per full load. Per-page work (marking the active row, the banner text, shuffling books) runs on `astro:page-load`. Clicks use event delegation on `document` (`[data-play]`, `[data-control]`, `[data-random]`).

## Player state (`src/lib/player.ts`)

```
speaker, lecture   current lecture (speaker slug + YouTube ID)
genre, music       current background track
playing            boolean
```

- **Empty lists:** a speaker or genre can have no videos (all removed; new ones get added in edit mode). `hasVideos()` in `data.ts` gates them. The page shows "No lectures yet" / "No tracks yet", Random never picks them, a hash naming one falls back to the defaults, and the defaults themselves fall back to the first speaker or genre that has videos.
- **Missing videos in links:** if the hash names a valid speaker or genre whose video no longer exists (deleted, or never valid), it falls back to that list's first video (`firstVideo()` in `data.ts`). The React app paired it with Ram Dass's default lecture instead, which showed "undefined" in the marquee. The defaults also fall back to the first video if a default lecture or song is deleted.
- **URL hash**: `#<speaker>/<lecture>/<genre>/<song>`, the same format the React app used, so old shared links still work on any page. It's written with `history.replaceState(history.state, …)` (keep `history.state`, because Astro's router stores its data there) and re-applied after every navigation. The validation and fallback rules match the old app: all four parts are required, and invalid parts fall back to the defaults in `data.ts`.
- **YouTube IFrame API**: uses `loadVideoById`, `cueVideoById`, `playVideo`/`pauseVideo` and `setVolume`. The lecture plays at volume 100 and the music at 15.
- On mobile (`max-device-width: 480px`), the lecture player is `#mobile-video` inside the controls, because phones require a tap on the video itself. `#speaker-video` is used only on desktop.
- **Phones play lectures only, with our own controls.** Tested on a real phone (iOS Safari and Firefox, Nov 2026): inline playback works and our play/pause/prev/next can start videos without tapping the video itself, but **only one YouTube video can play sound at a time** (starting the music stopped the lecture). So on phones `createPlayers()` doesn't create the music player at all (every `musicPlayer` use is null-safe), and music UI is hidden (the bar's music line, the banner genre pill). The phone bar: the lecture thumbnail (112×63, `.mobile-thumb`, filled by `setThumb()`) with the real player invisible on top (opacity 0, `pointer-events: none`, still full size so it keeps playing) and a small play/pause badge; tapping the thumbnail plays/pauses (`data-control="video"`); then speaker (link) + lecture title, prev / play-pause / next, and a thin seek bar along the top edge. `.controls` is `display: contents` so its children are cells of the bar's grid. The full-screen player, home tile play buttons and volume sliders are desktop only.
- The lecture player's `onStateChange` keeps the play/pause icon in sync when the YouTube controls are used directly.
- **Prev/next always play.** They load the next lecture with autoplay, and the music keeps going (even if playback was paused). While a lecture is switching, YouTube can report PAUSED for the outgoing video. That event is ignored for `SWITCH_GRACE_MS` or until the new video plays; otherwise it would pause everything.
- **Unavailable videos** (removed, private, embedding disabled, age-restricted) fire `onError`. The player adds the ID to a session `unavailable` set, dims and strikes through that row (`.song.unavailable`), and moves on in the same direction as the last prev/next. `step()` skips known-unavailable IDs instantly. It stops after a full pass if every video in the list fails. See [data.md](data.md) for how many there are.
- **Marquee** (`renderMarquee()`): shows the lecture *and* the music ("🎤 Speaker: title  ♪ Genre: title"). Two identical copies sit in a track animated from 0 to -50%, so it loops with no gap. Short text is repeated inside each copy so one copy is always at least as wide as the box. The duration is set from the width (`MARQUEE_SPEED` px/s), so the speed is the same for any title. It pauses on hover, fades at the edges, honors `prefers-reduced-motion`, and only rebuilds when the text changes, so navigation doesn't restart it. Mobile still shows the "Be patient…" message instead.
- **Footer video boxes** (`.video[data-thumb]`, desktop only): at rest they show the current video's thumbnail (`https://i.ytimg.com/vi/<id>/mqdefault.jpg`, set by `setThumb()` in `render()`) with a mic or music badge, and a `title` tooltip with the video name. Boxes are 16:9 (89×50 at rest, 356×200 on hover; the React app used 50×50 and 35% of the width). On hover the box expands and the iframe fades in, so the user can change the YouTube volume and seek. The iframe is only `opacity: 0` at rest, never `display: none` or moved, so playback continues. On mobile these boxes stay hidden.
- **Desktop player bar** (Player.astro/.scss, `@media (min-device-width: 481px)`, not in full screen): a 5-column grid. Left: lecture thumbnail, then speaker (links to their page), lecture title and the lecture's volume slider; center: controls with a seek bar (`[data-seek]`, 0–1000, polled every 500 ms from `getCurrentTime()`/`getDuration()`, `seekTo()` on `change`, not overwritten while dragging) and elapsed/total time; right, mirrored: genre, track title and the music's volume slider, then the music thumbnail. Each slider (`[data-volume]`) has a speaker-icon mute button (`[data-mute]`, turns red with `fa-volume-off` when muted). The new parts are `<section>`s so the legacy `div.Player > div` rules don't hit them. Thumbnails are absolutely positioned in fixed 89px columns, so hovering (expanding to the live player) doesn't reflow the bar. The marquee is hidden on the desktop bar; phones and full screen still use it (full screen also shows the seek bar).
  - Volumes are applied with `setVolume()` (mute = 0) and remembered in `localStorage` (`yogifm:volume`, wrapped in try/catch; defaults 100/15). Range inputs show their fill through a `--p` custom property set by `setFill()`.
- **Full-screen player** (desktop only): the small up-arrow tab above play/pause (`[data-control="expand"]`) toggles `.Player.expanded`. It's pure CSS on the same elements (Player.scss), so the iframes are never moved and keep playing. The player then covers the page beside the 200px sidebar: the lecture video large and centered on the left (fits both width and height, 16:9), controls and marquee under it, and on the right the music video above a lecture list (`aside[data-queue]`, an `<aside>` so the bar's legacy `> div` rules don't hit it). Sizes are CSS custom properties (`--side`, `--lw`, `--lh`, `--top`) computed from `vw`/`vh`. Escape or the down arrow closes it.
  - The list is built by `renderQueue()` with the same `data-collection`/`data-kind`/`data-play` attributes as the page's list, so `activate()` plays rows and `render()` marks the active/unavailable ones without extra code. It rebuilds only when the list's content changes (keeps the scroll position), and its top/bottom edges fade (mask) only when there.s more to scroll that way (`fadeEdges()`) and also on `content:changed` from edit mode.
  - **Two sections, one open at a time** (`openSection` in player.ts): **Lectures** (a speaker's lectures) and **Music** (genre buttons, then that genre's tracks). Each section header is a button (`[data-queue-section]`); opening one collapses the other to a one-line header, animated: both sections stay in the DOM (`applyOpenSection()` only toggles classes and `inert`, no rebuild, so each list keeps its scroll position), the panel is a grid whose `grid-template-rows` animates between `auto 1fr auto 0fr` and `auto 0fr auto 1fr` (`aside.queue[data-open]`), the closing body fades, and the header padding/count shrink. Instant under `prefers-reduced-motion`. Genre buttons (`[data-queue-genre]`) only *browse* (`musicTarget`); clicking a track plays it. The selected genre is white, and the playing genre has a blue dot. Both lists show video lengths.
  - On open it shows the **playing** speaker Sidebar links still navigate underneath; while expanded, `followPage()` switches to that page's speaker (opens Lectures) or genre (opens Music) (Random goes back to the playing speaker). The sidebar title and Home link close the full-screen player and go to the home page; playback continues. Closing shows the page you navigated to.
  - The marquee is rebuilt on open/close because its box width changes (otherwise the loop can show a gap).

### Behavior changes from the React app

- Pause actually pauses. Before, it reloaded the iframes and restarted the video.
- Clicking a lecture or track starts playback. Before, it only queued the video unless something was already playing.
- When a lecture ends, the next one in that speaker's list starts. When a music track ends, the next one in that genre starts.
- The Random button and the home Banner work as before. The Banner text is filled in on the client.
- The sidebar footer reads "Yogi FM 2018-<build year>" (it used to say "Yogi FM | Copyright 2019"). 2018 is when the repo was created (2018-03-30).
- The site name, tagline and URL are in `src/lib/site.ts`; don't hard-code them in components.
- The Google Analytics UA tag was removed, because Universal Analytics no longer works.
