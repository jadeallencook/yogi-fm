# Product

Yogi FM (https://yogifm.com, tagline "Broadcasting Awareness") collects lectures by spiritual and philosophical speakers from YouTube and organizes them by speaker. You can play a lecture with a quiet background music track underneath it.

## What a user can do

- **Browse speakers** from the sidebar, or from the home page's groups (Self Discovery, Drugs & Psychedelics, Far East, Visionaries, Mind & Body, Relationships; 3 speakers each). Hovering a tile shows a play button that starts that speaker right away, and the playing speaker's tile is marked "Now playing".
- **Open a speaker page**, which shows a portrait, life years, lecture count, Play/Shuffle/Full screen buttons, a short Wikipedia bio ("Read more" for the rest), a Wikiquote quote under it (random each visit, arrows to browse), Amazon affiliate books (in the order they were added, with titles), and the lecture list.
- **Open a music genre** (Classical, Jazz, Lofi, House, Tibetan, etc.) and pick a background track.
- **Play both at once.** Two hidden YouTube players run side by side: the lecture at volume 100 and the music at volume 15.
- **Use the footer player controls** (previous, play/pause, next) to step through the current speaker's lectures. A marquee shows the speaker and lecture title. The arrow above play/pause opens a **full-screen player** (desktop): both videos large, the controls, a rotating quote by the playing speaker, and the lecture list of the playing speaker; clicking a speaker in the sidebar shows theirs.
- **Use the home banner**, which shows the playing speaker, lecture and music with Play/Pause, Full screen and Shuffle buttons.
- **Press Random** to pick a random speaker, lecture, genre and song.
- **Share a link.** Each speaker and genre has its own page. The current selection lives in the URL hash (`#speaker/lecture/genre/song`), so a link reopens the same lecture and music.
- **Donate** through the "Support Yogi FM" link (Buy Me a Coffee) at the bottom of the sidebar. The sidebar highlights the page you're on and shows equalizer bars next to the speaker and genre that are playing.

## Content (as of the 2020 data snapshot)

- 16 speakers and about 360 lectures. Krishnamurti (97) and Alan Watts (58) have the most.
- 8 music genres and about 44 tracks.
- Every speaker has a curated YouTube playlist owned by the project's channel (playlist IDs start with `PLkj0Wb8QyEE…`). The playlists are the source of truth for the video lists.
- Book links carry the Amazon Associates tag `jadeallencook-20` (the old `yogifm-20` expired; every book was redone on 2026-11-19/20, see "Books" in `documentation/data.md`). The books section shows the Associates disclosure.

Schemas and the update process are in [data.md](data.md).

## Ideas that were started but not finished

- Search (a React stub existed; removed in the Astro migration).
- Speaker `quotes` field (always empty). Bios are now shown (from Wikipedia), and quotes now live in their own file, `quotes.environment.json` (20 sourced quotes per speaker where possible, Nov 2026), shown on speaker pages and in the full-screen player. See "quotes.environment.json" in [data.md](data.md).
- A 2021–2022 rewrite (see [history.md](history.md)) moved content into the Prismic CMS and added React Router and a mobile menu. It was later reverted.

## On phones

The top bar has a menu button (☰) that opens the whole sidebar full screen: Home, Random, every speaker, Support (no music genres, since phones can't play music). Choosing anything closes it. Phones play lectures only: mobile browsers allow one YouTube video with sound at a time (tested Nov 2026), so there's no background music there. The bottom bar shows a small lecture video, the speaker and title, prev / play-pause / next, and a thin progress bar.
