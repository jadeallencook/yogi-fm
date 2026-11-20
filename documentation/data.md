# Content data

All content is static JSON in `src/environments/`, keyed by slug, and read through the typed helpers in `src/lib/data.ts`. Object key order is display order in the sidebar and in lecture lists.

## speakers.environment.json

```jsonc
{
  "alan-watts": {
    "playlist": "PLkj0Wb8QyEE…",          // YouTube playlist the jobs scrape
    "name": "Alan Watts",
    "years": "1915-1973",                 // free text; living speakers use "-Now"
    "image": "assets/images/alan-watts.png", // relative to public/
    "bio": "…",                            // ~1 paragraph from Wikipedia (npm run fetch-bios), shown on the speaker page
    "wikipedia": "Alan Watts",             // English Wikipedia article title the bio comes from
    "books": [ { "title", "link", "image" } ], // Amazon affiliate links/covers; see "Books" below
    "videos": { "<youtubeId>": "lowercased title" },
    "quotes": {}                           // unused
  }
}
```

The template `src/templates/speaker.template.json` shows `books` as `{}`, but the real data and the `Speaker` type use an array.

## Adding a speaker

Edit mode can add videos, but not speakers. To add one:

1. Add an entry to `speakers.environment.json` (see `src/templates/speaker.template.json`): `name`, `years` ("1931-2019" or "1936-Now"), `wikipedia` (the English article title), and empty `image`, `bio`, `books` (`[]`), `videos` (`{}`), `quotes`, `playlist`. **Key order is sidebar order, which is alphabetical by name** (diacritics ignored).
2. `npm run fetch-bios -- --only <slug>`, then `npm run fetch-portraits -- --only <slug>` (both have `--dry-run`).
3. Add videos in edit mode (`npm run dev:edit`), then run `npm run check-videos`.
4. Optionally feature them on the home page. Groups must stay at exactly 3.

**Nov 2026:** added 14 speakers this way: Pema Chödrön, Ajahn Brahm, John O'Donohue, bell hooks (her lowercase styling), Carl Jung, Rupert Spira, Stanislav Grof, Allen Ginsberg, Robert Anton Wilson, Carl Sagan, Rupert Sheldrake, Jon Kabat-Zinn, B.K.S. Iyengar and Gabor Maté. Carl Jung and Carl Sagan were removed again the same month (too few lectures available). On 2026-11-19 every speaker still without lectures was removed too: Pema Chödrön, John O'Donohue, Rupert Spira, Stanislav Grof, Robert Anton Wilson, Rupert Sheldrake and Jon Kabat-Zinn (entries with bios, years and photo credits saved in `jobs/removed-speakers/2026-11-19.json`; photos are in git history). Eckhart Tolle replaced Kabat-Zinn in Mind & Body. On 2026-11-20 Kim Eng was removed too (user's call: no books on Amazon, only audio, and few lectures online); entry in `jobs/removed-speakers/2026-11-20-kim-eng.json`, her 3 video lengths dropped from `durations.environment.json`, portrait and OG card deleted. Years come from Wikidata (P569/P570). They have no videos or books yet.

## Portraits (`npm run fetch-portraits`)

`jobs/fetch-portraits.mjs` fills in `image` for speakers that have a `wikipedia` title and no image, using the article's lead image, **only if it's freely licensed on Wikimedia Commons** (`imagerepository: shared`, license CC0, CC BY, CC BY-SA or public domain). Non-free, fair-use images hosted on en.wikipedia itself are refused, and that speaker needs a photo added by hand. It saves `public/assets/images/<slug>.<ext>` and an `imageCredit` (`author`, `authorUrl`, `license`, `licenseUrl`, `source` = Commons file page). The speaker page shows "Photo: author, license, via Wikimedia Commons", which CC BY and BY-SA require.

- **Link-only authors:** some Commons files list only a profile URL as the author. A Flickr URL becomes "Flickr user <id>", linked. "Unbekannt"/"Unknown" becomes "Unknown photographer", and the "PDM-owner" license becomes "Public domain".
- **Size:** Wikimedia now snaps thumbnail widths to fixed buckets (asking for 600px returned 960px, up to 640 KB). The 2026-11-18 batch was resized afterwards with `sips -Z 600 -s format jpeg -s formatOptions 80` (macOS) to about 50–120 KB each. The script doesn't resize. Do this by hand for new portraits.
- **Display:** portraits get `filter: grayscale(1)` and `background-position: center top` in CSS, so color photos match the original black-and-white set and non-square photos keep faces in frame.

## Speaker bios (`npm run fetch-bios`)

`jobs/fetch-bios.mjs` fetches about one paragraph per speaker from English Wikipedia and saves it as `bio`. The speaker page shows it under the name and years, with a "Source: Wikipedia (CC BY-SA 4.0)" credit linking to the article (the license requires attribution). The first sentence also becomes the page's meta description.

```sh
npm run fetch-bios                      # fetch and save all
npm run fetch-bios -- --dry-run --show  # preview the text, save nothing
npm run fetch-bios -- --only osho       # one speaker
```

- **Source:** the MediaWiki action API's plain-text lead section (`prop=extracts&exintro&explaintext`). The REST `page/summary` endpoint is often only one sentence (Alan Watts: 197 characters). The script takes paragraph 1 (plus paragraph 2 if the first is under 400 characters) and trims at a sentence end around 900 characters. It strips pronunciation and native-script names from the opening parenthesis (respellings like "AWL-dəs" or "GAH-bor MAH-tay", IPA, "pronounced /…/", "German: […]", Thai or Tibetan script, "RTGS:"/"romanized:"/"lit.") but keeps dates and birth names.
- **Which article:** each speaker's `wikipedia` field. Several differ from the display name: Krishnamurti → *Jiddu Krishnamurti*, Mr. Rogers → *Fred Rogers*, Osho → *Rajneesh* (now redirects to *Osho*, and the script stores the final title), William Burroughs → *William S. Burroughs*, Thich Nhat Hanh → *Thích Nhất Hạnh*. The script warns on redirects and refuses missing or disambiguation pages, keeping the old bio.
- **Kim Eng had no bio** (removed 2026-11-20). She had no article, and "Kim Eng" on Wikipedia redirects to *Maybank* (Kim Eng Securities). Speakers without a `wikipedia` field are skipped and show no bio block.
- It sends a generic User-Agent (no personal details), re-reads the file right before an atomic write, and changes only `bio` and `wikipedia` (verified).
- **2026-11-18:** first run saved 15 bios (430–890 characters). This replaced the old 2018 Alan Watts bio, which is in git history.
- **Years drift:** "-Now" is never updated automatically, so check it against the bio when refreshing. Thich Nhat Hanh's was "1926-Now" until 2026-11-19 (he died in 2022; now "1926-2022", OG card regenerated). Kim Eng's "1980-Now" is unverified.

## Books (Amazon affiliate links)

Speaker pages list books linking to Amazon with the Associates tracking ID **`jadeallencook-20`**. The old ID `yogifm-20` expired (found 2026-11-19), so its links earn nothing; every book is being redone (all were removed on 2026-11-19 pending new lists). The old lists are backed up in `jobs/book-backups/2026-11-19-before-new-tag.json`.

- **Input:** the user sends Amazon short links (`https://link.amazon/…`, from SiteStripe/the Amazon app), grouped by speaker. They redirect via `amzlinks.in` to `https://www.amazon.com/dp/<ASIN>?…&tag=jadeallencook-20&…` (many sharing/tracking params). Resolve with `curl -sS -L -o /dev/null -w '%{url_effective}'`.
- **Stored link:** the clean form `https://www.amazon.com/dp/<ASIN>?tag=<tag>` (same commission, no dependence on the shortener). Use the tag the link carries; flag any link whose tag differs.
- **Cover:** hotlinked from Amazon by ASIN, `https://m.media-amazon.com/images/P/<ASIN>.01._SCLZZZZZZZ_SL300_.jpg` (300px tall, the current Amazon edition; no page scraping needed). An unknown ASIN returns `200 image/gif`, 43 bytes (a 1x1 pixel), so check the content type/size and report books with no cover. The user chose Amazon covers over local copies (Open Library covers were tried first and showed older editions). Amazon's Associates rules officially provide images through SiteStripe/its API, so keep the ASIN URLs Amazon-hosted (never re-host them). `Songs.astro` also accepts paths relative to `public/`.
- **Markup rules:** links use `rel="sponsored noopener"` (Google's label for paid links; no `noreferrer`, so Amazon sees clicks come from the registered site), and the books section shows the required disclosure "As an Amazon Associate, Yogi FM earns from qualifying purchases."
- **2026-11-19:** first book redone as a test: Alan Watts, *The Book* (0679723005), replaced in place at the same position.
- **2026-11-19 (later):** all 86 books were removed for now (the user will send new lists); speaker pages hide the books section when the list is empty. Saved in `jobs/book-backups/2026-11-19-removed-all.json` (includes the new-tag *The Book* entry, its cover switched to the Amazon URL when local covers were dropped).
- **2026-11-19:** Alan Watts redone with 11 books (12 links; two pointed to the same book, *There Is Never Anything but the Present*). Titles come from Open Library, or from the Amazon product page title when Open Library has none (newer Shambhala/New World Library editions); written as "Title: Subtitle" in Title Case.
- **2026-11-19:** Ajahn Brahm: 9 books. The batch also had two books by other authors (Ajahn Chah, *Everything Arises, Everything Falls Away*, 1590302176; Ayya Khema, *Be an Island*, 0861711475); held back and asked the user, since the section reads as the speaker's own books. Kindle/new-edition ASINs (`B0…`, e.g. B0HHZCV637) also work for covers. Batches don't name the speaker; tell from the authors.
- **2026-11-20:** Aldous Huxley: 9 books. Series/format tags from Amazon or Open Library ("(P.S.)", "(Harper Perennial Modern Classics)", "(The Collected Works of …)", "A Novel") are dropped from titles, and so are subtitles that just describe the edition.
- **2026-11-20:** Allen Ginsberg: 8 books. The batch had *Howl and Other Poems* three times as different editions (City Lights 0872860175 kept; Pocket Poets reprint 1614278199 and a 979-8 self-published edition B0BTD8CJZR dropped). Same book in another edition counts as a duplicate: keep the first/official one and tell the user. *The Yage Letters Redux* is co-written with William Burroughs and kept (Ginsberg is a credited author).
- **2026-11-20:** the other 16 speakers were filled in by Claude (the user asked it to pick): 109 books, 5–9 each. Method: an Amazon books search per speaker (`/s?k=<name>&i=stripbooks`) run in the user's signed-in Chrome with `fetch` + `DOMParser` from an amazon.com tab (no SiteStripe needed: the clean `dp` link with the tag *is* the affiliate link). Picks are the speaker's own best-known books by review count; skipped: books about them, box sets, calendars/journals/card decks, Spanish editions, and repeat editions. Every cover was checked by eye on a contact sheet. Direct `curl` of Amazon product pages starts getting blocked after ~70 requests, so take titles from the Chrome search results instead.
- **Kim Eng had no books** (one reason she was removed): everything under her name is Audible/guided-meditation audio, and audio ASINs have no cover at the `images/P/` URL. B.K.S. Iyengar's *The Art of Yoga* (B0CR1W9YMW) was dropped for the same reason.

## Lecture title style

The user's own Alan Watts titles are the reference ("Zen & Meditation", "You Are the Universe Experiencing Itself", "The Limits of Thought"). When adding or editing titles:

- **Title Case**: small words (a, an, the, and, of, in, on, to, for, with, as…) lowercase unless first, or first after a colon.
- **Just the topic.** Drop the speaker's name, "Full Lecture", years, channel/series tags, hashtags, "[complete 10 hour talk]"-style notes and clickbait ("destroys").
- **Parts**: "Methods to Consciousness, Pt. 1". **Series subtitles** use a colon: "Psyche & Symbol: The Origin of Elementary Ideas".
- **When the topic alone isn't unique**, keep the minimum to tell them apart, e.g. Krishnamurti's untitled Q&As: "Saanen Q&A 2 (1985)", or a truncated title replaced by its series and part ("The Transformation of Man, Pt. 4"). Many of the official Krishnamurti YouTube titles are truncated ("…") at the source, so the full subtitle isn't available.
- A video listed under several speakers (e.g. `GXR7fQZi_VA`, the 1990 Maryland lecture) gets a per-speaker title naming the *other* speakers.

The Nov 2026 cleanup changed 243 titles across all speakers; the old titles are in `jobs/title-backups/2026-11-18-title-cleanup.json` (`{ slug: { videoId: oldTitle } }`). Music track titles follow the same Title Case (2026-11-20: 25 tracks fixed, including "Hip Hop"/"HipHop" → "Hip-Hop" to match the genre name and the typo "Chantiing"; old titles in `jobs/title-backups/2026-11-20-music-capitalization.json`). Foreign-language titles keep their own capitalization ("Prélude à l'après-midi d'un faune"). 2026-11-20: 42 Sadhguru lectures were added by the user; 20 Sadhguru titles fixed (capitalization, plus a missing "?" on question titles), old ones in `jobs/title-backups/2026-11-20-sadhguru-capitalization.json`. Short verbs and "Is"/"Be" are capitalized ("What Is God?", "Learn to Be Alone"); a final preposition is too ("Which One to Listen To?").

### Duplicates

No list should hold the same lecture twice. Edit mode refuses the same video ID or the same title (see [editing.md](editing.md)). The same lecture is often uploaded more than once on YouTube (different IDs), so compare YouTube's original titles (oEmbed) and lengths before deleting. Matching titles can also be different lectures that need distinct titles. The Nov 19 2026 cleanup is in `jobs/title-backups/2026-11-19-duplicates.json`: a shorter Joseph Campbell "Parzival" clip was removed, and the second Alan Watts "Philosophy of the Tao" was renamed "Philosophy of the Tao Part 2", because it's a different lecture; a 10-min Alan Watts "Zen Bones" clip was removed in favor of the 57-min episode. `npm run build` also fails on duplicate titles in a list (`findDuplicateTitles()` in `src/lib/data.ts`), so hand edits to the JSON are caught too. The dev server doesn't crash on them: a dismissible warning at the top of every page (`src/components/DevWarnings.astro`, dev only, loaded like EditorTools so production never includes it) lists each one with its row numbers, and the rows themselves get an orange edge and a "Duplicate title" tag. One video in several speakers' lists is fine when they share a talk: `GXR7fQZi_VA` (Maryland 1990) is under Ram Dass, McKenna and Leary, each titled "with" the other two.

## durations.environment.json (`npm run fetch-durations`)

`{ "<videoId>": seconds }` for every lecture and music video, from the YouTube Data API v3 (`videos.list`, `part=contentDetails`, 50 IDs per request). It's a separate file so the hand-edited titles in speakers/music JSON are never rewritten, and a video listed under several speakers has one entry.

- Needs `YOUTUBE_API_KEY` in `.env` (git-ignored; `.env.example` documents it). The script reads it with `process.loadEnvFile`, sends only video IDs, and never prints the request URL (it contains the key). The key is not `PUBLIC_`-prefixed and nothing in `src/` reads it, so it can't reach the browser.
- By default only videos without a length are fetched (`--all` refetches, `--dry-run` saves nothing). Entries for videos no longer listed are dropped. Run it after adding lectures in edit mode.
- First run (Nov 2026): all 322 videos got a length (Alan Watts 9h35, Ram Dass 29h07, Krishnamurti 104h20).

## music.environment.json

```jsonc
{ "classic-jazz": { "playlist": "PLkj…", "name": "Jazz", "videos": { "<youtubeId>": "Title" } } }
```

Genres are kept in **alphabetical order by name** (key order is the sidebar order, so new genres go in their alphabetical spot; sorted 2026-11-19). The slugs don't always match the names (`classic-jazz` → "Jazz", `jazz-vibes` → "Hip-Hop").

**Renaming a slug** changes its page URL and breaks old shared `#speaker/lecture/genre/song` links. Add the old slug to `genreAliases` in `src/lib/data.ts` so those links still resolve, and a `redirects` entry in `astro.config.mjs` for the old `/music/<slug>/` page. Done so far: `indian` → `sitar` (2026-11-18), `trance` → `house` ("Trance" → "House", 2026-11-19; its entry in `jobs/removed-videos/` was updated so `--restore` still finds it). "Lo-Fi" was renamed "Lofi" (name only; slug `lofi`).

**Adding a genre:** add `{ "playlist": "", "name": "…", "videos": {} }` to `music.environment.json` (in its alphabetical spot by name; key order is the sidebar order), then add tracks in edit mode and run `npm run fetch-durations`. `ambient` ("Ambient") was added this way on 2026-11-19 with no playlist yet.

Some titles contain raw HTML entities from the old scraper (e.g. `Sitar &amp; Tabla Legends…`), and they show up literally on the page. They should be cleaned up in the data.

## featured.environment.json

Home-page groups: `{ "<group>": { "title", "description", "speakers": [slugs] } }`. `description` is the one line shown under the title. `featuredOrder` in `src/lib/data.ts` sets which groups render and in what order: Self Discovery, Drugs & Psychedelics, Far East, **Visionaries**, **Mind & Body**, Relationships. Visionaries and Mind & Body were added in Nov 2026 so every speaker appears on the home page (Bruce Lee and Buckminster Fuller had been in no group).

- **Exactly 3 speakers per group, the most prominent ones; a speaker is in at most one group.** Not everyone is featured; the rest are in the sidebar (the user's rules). `checkFeatured()` in `src/lib/data.ts` (`FEATURED_PER_GROUP = 3`) enforces this when the module loads: a wrong count, a duplicate, an unknown slug, or a group missing from `featuredOrder` makes `npm run build`/`dev` fail with a clear message (e.g. `group "body" has 4 speakers; it needs exactly 3`).
- Current groups: Self Discovery (Alan Watts, Ram Dass, Krishnamurti), Drugs & Psychedelics (Leary, McKenna, Huxley), Far East (Thich Nhat Hanh, Osho, Sadhguru), Visionaries (Buckminster Fuller, Joseph Campbell, Allen Ginsberg), Mind & Body (Bruce Lee, Eckhart Tolle, B.K.S. Iyengar), Relationships (Mr. Rogers, bell hooks, Gabor Maté). John O'Donohue isn't featured until he has a photo.
- On wide screens groups sit two per row, so an even number of groups keeps the grid tidy.
- Featured.scss lays groups out in a responsive grid (`auto-fit`, min 440px per group) with 3 tiles each that stretch to fill the column, so every tile is always visible.

## backups/speakers.backup.json

This is an older copy of the speaker data. Its video counts differ from the live file, in both directions. Treat it as an archive, not a source.

## Video availability (`npm run check-videos`)

`jobs/check-videos.mjs` checks every speaker and music video and can delete the unavailable ones.

```sh
npm run check-videos                       # dry run: report only, changes nothing
npm run check-videos -- --list             # ...plus every unavailable/unknown video
npm run check-videos -- --delete           # delete unavailable SPEAKER videos
npm run check-videos -- --delete --music   # ...and unavailable music tracks
npm run check-videos -- --quick            # oEmbed only (no browser), fast
npm run check-videos -- --restore jobs/removed-videos/<file>.json   # undo a delete
```

It runs two checks:
1. **YouTube oEmbed:** 404/400 = removed, 403 = private, 401 = embedding disabled.
2. **Player check:** each video that passes oEmbed is loaded, muted, in the real YouTube IFrame player in headless Chrome (`puppeteer-core` with your installed Google Chrome; set `CHROME_PATH` if it isn't found). This catches age-restricted videos and other embed blocks (player errors 100/101/150) that oEmbed reports as fine.

The rules for deleting:
- **Only definite answers are deleted.** Network errors, rate limits, player timeouts and odd player errors are "unknown" and kept.
- **Lists may end up empty.** If every video is unavailable, all are removed and the report notes "list will be empty". The site handles empty lists ("No lectures yet", skipped by the player and by Random), and you add new videos in edit mode.
- **Removals are saved first.** Before writing, every removed video (with its position and reason) is saved to `jobs/removed-videos/<timestamp>.json`. `--restore` puts them back in their original positions; this was verified byte-identical. Commit these files.
- It re-reads the content file just before writing and changes nothing else (verified). Stop any edit-mode dev server while it runs.

**Gotchas found while building it:**
- **The player page must be served from `localhost`, not `127.0.0.1`.** Some channels (Osho's) refuse embeds on a bare-IP origin with error 150 but play on a hostname. The first version used 127.0.0.1 and wrongly flagged all of Osho. (The real site runs on a domain, like localhost.)
- **YouTube throttles a browser session** after a few dozen loads, and players then time out. It's per session, not per IP, so the check uses a **fresh isolated browser context for every 15 videos**. That took unknowns from 224 to about 20 (a full run takes about 9 minutes). Timeouts are unknown and kept. Error 150 comes back fast (about 200ms) and is repeatable, so it's reliable.
- **Stale events in the player page:** a leftover timer or a late `onError` from the previous video could settle the *next* check. A late error could wrongly flag a playable video. The page now clears its timer when a check settles, and ignores errors whose `getVideoUrl()` belongs to another video.
- **Background-tab throttling:** with two player pages per session, Chrome throttled timers in the background one, and a run hung until puppeteer's protocol timeout (it crashed with nothing deleted). Chrome is now launched with `--disable-background-timer-throttling`, `--disable-renderer-backgrounding` and `--disable-backgrounding-occluded-windows`. Each check also has a hard Node-side time limit; if a page stops responding, its videos stay unknown.
- Videos the player stage never reaches count as unknown, not ok.
- The embed page HTML no longer includes `playabilityStatus` (it loads with JavaScript), so scraping it doesn't work.

### History

- **2026-11-18:** 292 of 406 passed oEmbed. Ran `--delete` (speakers only), which removed **50** speaker videos (23 removed, 16 embedding disabled, 11 private). Saved in `jobs/removed-videos/2026-11-18T23-15-29-149Z.json`.
- **2026-11-18, second run** (the user asked to remove *all* unavailable videos, emptying lists where needed, music included): removed **67** (all 58 Alan Watts, including 3 age-restricted with error 150; all 6 Eckhart Tolle; 3 music oEmbed failures). Saved in `jobs/removed-videos/2026-11-18T23-20-10-572Z.json`. **Alan Watts and Eckhart Tolle are now empty**, and the user will add new videos.
- **2026-11-18, third run:** removed the 5 music tracks that block embedding (error 150: *Kind of Blue*, *Stone Flower*, Chopin *Nocturnes*, *The Best of Debussy*, Yokota *Sakura*), each also confirmed individually. Saved in `jobs/removed-videos/2026-11-19T01-06-55-624Z.json`. **Result: 248 lectures, 36 tracks; 264 confirmed playable, 0 known unavailable.**
- The same **20 videos** time out inside batched runs every time, but play when checked one at a time (verified), so they're kept. They're listed as unknown in `--list`.
- One full run hung in the player stage at about 1% CPU, with nothing written (deletion only happens at the end). It was stopped, and the next two runs completed in about 9 minutes each. When output isn't a terminal, the script now logs `player batch N/M`, so a stall is visible.
- At runtime the player still skips anything that fails (see architecture.md).

## Update jobs (`npm run update`)

`jobs/update-speakers.cjs` and `jobs/update-music.cjs` (CommonJS, because the package is now `"type": "module"`) fetch each playlist's HTML page and parse `.pl-video-title-link` anchors. They then **overwrite** each entry's `videos` map in place. The speaker job also lowercases titles and strips the speaker's name prefix.

**These jobs almost certainly no longer work.** YouTube stopped serving that server-rendered playlist markup years ago, and playlist pages now render on the client. Expect them to produce empty `videos` maps, which would wipe content. Don't run them against the real data. A replacement should use the YouTube Data API v3 (`playlistItems.list`), or a maintained tool like `yt-dlp --flat-playlist -J`, and should merge rather than overwrite.
