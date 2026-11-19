// Check which videos in the content JSON still play, and optionally delete the ones
// that don't. See documentation/data.md ("Video availability").
//
//   npm run check-videos                      report (dry run, nothing is changed)
//   npm run check-videos -- --list            ...and list every unavailable video
//   npm run check-videos -- --delete          delete unavailable SPEAKER videos
//   npm run check-videos -- --delete --music  ...and unavailable music tracks
//   npm run check-videos -- --quick           skip the player check (oEmbed only)
//   npm run check-videos -- --restore <file>  put back videos from a removal file
//
// Two checks:
//   1. YouTube oEmbed: 404/400 = removed, 403 = private, 401 = embedding disabled.
//   2. Player check: every video that passes oEmbed is loaded, muted, in the real
//      YouTube IFrame player in headless Chrome (needs Google Chrome installed; set
//      CHROME_PATH if it isn't found). Catches age-restricted videos and other embed
//      blocks (player errors 100/101/150) that oEmbed reports as fine.
//
// Only definite answers are deleted. Network errors, rate limits, timeouts and odd
// player errors (e.g. 5) are "unknown" and kept. A list may end up empty; the site
// handles that ("No lectures yet", skipped by the player) and new videos can be
// added in edit mode.
// Before deleting, every removed video (with its position) is written to
// jobs/removed-videos/<timestamp>.json, which --restore can put back.
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const FILES = {
  speaker: new URL('src/environments/speakers.environment.json', ROOT),
  music: new URL('src/environments/music.environment.json', ROOT),
};
const REMOVED_DIR = new URL('jobs/removed-videos/', ROOT);
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);

const OEMBED_UNAVAILABLE = { 400: 'removed', 404: 'removed', 403: 'private', 401: 'embedding disabled' };
const PLAYER_UNAVAILABLE = {
  2: 'invalid video ID',
  100: 'removed or private',
  101: 'embedding not allowed',
  150: 'embedding not allowed (often age-restricted)',
};

// --- JSON helpers -----------------------------------------------------------

async function load(kind) {
  const raw = await readFile(FILES[kind], 'utf8');
  return { raw, data: JSON.parse(raw) };
}

/** Same format as the file was written in (the content files are compact JSON), atomically. */
async function save(kind, data, raw) {
  const text = /^\{\s*\n/.test(raw) ? `${JSON.stringify(data, null, 2)}\n` : JSON.stringify(data);
  const path = fileURLToPath(FILES[kind]);
  await writeFile(`${path}.tmp`, text);
  await rename(`${path}.tmp`, path);
}

// --- Check 1: oEmbed --------------------------------------------------------

async function oembed(id) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (res.ok) return { ok: true };
      if (OEMBED_UNAVAILABLE[res.status]) return { ok: false, reason: OEMBED_UNAVAILABLE[res.status], source: `oembed ${res.status}` };
      // 429/5xx: back off and retry.
    } catch {
      // Network error: retry.
    }
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  return { ok: null, reason: 'could not check (network/rate limit)' };
}

async function pool(items, size, fn) {
  let next = 0;
  let done = 0;
  const run = async () => {
    while (next < items.length) {
      const item = items[next++];
      await fn(item);
      done++;
      if (process.stdout.isTTY) process.stdout.write(`\r  ${done}/${items.length}`);
    }
  };
  await Promise.all(Array.from({ length: size }, run));
  if (process.stdout.isTTY) process.stdout.write('\r\x1b[K');
}

// --- Check 2: real player in headless Chrome --------------------------------

const PLAYER_PAGE = `<!doctype html><meta charset="utf-8"><div id="p"></div>
<script>
  let player, current = null, settle = null, timer = null;
  // Clear the timeout on settle, or a stale timer would end the *next* check early.
  const done = (result) => { if (settle) { clearTimeout(timer); const f = settle; settle = null; f(result); } };
  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player('p', {
      width: 320, height: 180,
      playerVars: { mute: 1, playsinline: 1, autoplay: 1 },
      events: {
        onReady: () => (window.ready = true),
        onStateChange: (e) => {
          // Ignore late events from the previous video.
          if (e.data === YT.PlayerState.PLAYING && player.getVideoData().video_id === current) done('ok');
        },
        // Ignore a late error from the previous video (it must not be blamed on this one).
        onError: (e) => {
          const url = (player.getVideoUrl && player.getVideoUrl()) || '';
          if (url && current && !url.includes(current)) return;
          done('error:' + e.data);
        },
      },
    });
  };
  window.check = (id, ms) => new Promise((resolve) => {
    settle = resolve;
    current = id;
    player.mute();
    player.loadVideoById(id);
    timer = setTimeout(() => done('timeout'), ms);
  });
</script>
<script src="https://www.youtube.com/iframe_api"></script>`;

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  return candidates.find((path) => path && existsSync(path));
}

async function playerCheck(items) {
  const chrome = findChrome();
  if (!chrome) {
    console.warn('! Google Chrome not found (set CHROME_PATH). Skipping the player check; age-restricted videos won\'t be caught.');
    return false;
  }
  const { default: puppeteer } = await import('puppeteer-core');
  // Until the player has actually checked a video, it's unknown (not "ok").
  for (const item of items) item.result = { ok: null, reason: 'not reached by the player check' };

  // Served over http://localhost: YouTube embeds need a real origin/referrer, and some
  // channels (e.g. Osho's) refuse to play on a bare-IP origin like 127.0.0.1 (error 150)
  // while playing fine on a hostname. Using 127.0.0.1 here wrongly flagged them.
  const server = createServer((_, res) => res.writeHead(200, { 'Content-Type': 'text/html' }).end(PLAYER_PAGE));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://localhost:${server.address().port}/`;
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio',
      // Two player pages per session: without these, Chrome throttles timers in the
      // background one, which stalled a run until puppeteer's protocol timeout.
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
    ],
    protocolTimeout: 120_000,
  });

  try {
    // YouTube throttles a browser session after a few dozen loads (players then time out),
    // but a fresh session plays normally. So each batch gets a new isolated browser
    // context (own cookies/storage) with its own player pages.
    const BATCH = 15;
    const PAGES = 2;
    let checked = 0;
    for (let start = 0; start < items.length; start += BATCH) {
      const batch = items.slice(start, start + BATCH);
      if (!process.stdout.isTTY) console.log(`  player batch ${start / BATCH + 1}/${Math.ceil(items.length / BATCH)}`);
      const context = await browser.createBrowserContext();
      try {
        const pages = await Promise.all(
          Array.from({ length: PAGES }, async () => {
            const page = await context.newPage();
            await page.goto(url);
            await page.waitForFunction('window.ready === true', { timeout: 30_000 });
            return page;
          }),
        );
        let next = 0;
        await Promise.all(
          pages.map(async (page) => {
            while (next < batch.length) {
              const item = batch[next++];
              // Playable videos start within ~1s; a timeout is reported as "unknown"
              // (never deleted). The Node-side limit covers a page that stops responding.
              const check = (ms) =>
                Promise.race([
                  page.evaluate((id, ms) => window.check(id, ms), item.id, ms),
                  new Promise((resolve) => setTimeout(() => resolve('stuck'), ms + 15_000)),
                ]).catch(() => 'stuck');
              let result = await check(10_000);
              if (result === 'timeout') result = await check(15_000); // one retry
              if (result === 'stuck') {
                item.result = { ok: null, reason: 'player page stopped responding' };
                checked++;
                break; // Leave this page; the batch's other page and the next session continue.
              }
              const code = result.startsWith('error:') ? Number(result.slice(6)) : null;
              if (result === 'ok') item.result = { ok: true };
              else if (PLAYER_UNAVAILABLE[code]) item.result = { ok: false, reason: PLAYER_UNAVAILABLE[code], source: `player ${code}` };
              else item.result = { ok: null, reason: result === 'timeout' ? 'player timed out' : `player error ${code}` };
              checked++;
              if (process.stdout.isTTY) process.stdout.write(`\r  ${checked}/${items.length}`);
            }
          }),
        );
      } finally {
        await context.close();
      }
    }
    if (process.stdout.isTTY) process.stdout.write('\r\x1b[K');
  } finally {
    await browser.close();
    server.close();
  }
  return true;
}

// --- Restore ----------------------------------------------------------------

async function restore(file) {
  const removed = JSON.parse(await readFile(file, 'utf8')).removed;
  for (const kind of Object.keys(FILES)) {
    const entries = removed.filter((r) => r.kind === kind);
    if (!entries.length) continue;
    const { raw, data } = await load(kind);
    let restored = 0;
    // Ascending original index, so earlier insertions put later ones back in place.
    for (const r of [...entries].sort((a, b) => a.slug.localeCompare(b.slug) || a.index - b.index)) {
      const entry = data[r.slug];
      if (!entry || Object.hasOwn(entry.videos, r.id)) continue;
      const pairs = Object.entries(entry.videos);
      pairs.splice(Math.min(r.index, pairs.length), 0, [r.id, r.title]);
      entry.videos = Object.fromEntries(pairs);
      restored++;
    }
    await save(kind, data, raw);
    console.log(`Restored ${restored} ${kind} video(s).`);
  }
}

// --- Main -------------------------------------------------------------------

async function main() {
  if (flag('restore')) {
    const file = args[args.indexOf('--restore') + 1];
    if (!file) throw new Error('Usage: --restore jobs/removed-videos/<file>.json');
    return restore(file);
  }

  const deleting = flag('delete');
  const deleteKinds = new Set(['speaker', ...(flag('music') ? ['music'] : [])]);
  const files = { speaker: await load('speaker'), music: await load('music') };

  const items = [];
  for (const [kind, { data }] of Object.entries(files)) {
    for (const [slug, entry] of Object.entries(data)) {
      Object.entries(entry.videos).forEach(([id, title], index) => items.push({ kind, slug, name: entry.name, id, title, index }));
    }
  }

  console.log(`Checking ${items.length} videos with YouTube oEmbed…`);
  await pool(items, 6, async (item) => (item.result = await oembed(item.id)));

  const passed = items.filter((i) => i.result.ok === true);
  if (!flag('quick')) {
    console.log(`Checking ${passed.length} videos in the YouTube player (headless Chrome)…`);
    await playerCheck(passed);
  }

  // Report per speaker/genre.
  const groups = Map.groupBy(items, (i) => `${i.kind}\t${i.slug}`);
  const toDelete = [];
  console.log('');
  for (const [key, list] of groups) {
    const [kind] = key.split('\t');
    const ok = list.filter((i) => i.result.ok === true).length;
    const bad = list.filter((i) => i.result.ok === false);
    const unknown = list.filter((i) => i.result.ok === null).length;
    let note = '';
    if (bad.length && deleteKinds.has(kind)) toDelete.push(...bad);
    if (bad.length && bad.length === list.length) note = '  <- every video unavailable; list will be empty';
    console.log(
      `${`${kind} ${list[0].slug}`.padEnd(30)} ${String(ok).padStart(3)} ok  ${String(bad.length).padStart(3)} unavailable` +
        `${unknown ? `  ${unknown} unknown` : ''}${note}`,
    );
  }
  const total = (pred) => items.filter(pred).length;
  console.log(
    `\nTOTAL ${total((i) => i.result.ok === true)} ok, ${total((i) => i.result.ok === false)} unavailable, ` +
      `${total((i) => i.result.ok === null)} unknown (of ${items.length})`,
  );

  if (flag('list')) {
    console.log('');
    for (const i of items.filter((i) => i.result.ok !== true)) {
      console.log(`${i.result.ok === false ? 'UNAVAILABLE' : 'UNKNOWN    '}  ${i.kind}/${i.slug}  ${i.id}  ${i.result.reason.padEnd(44)}  ${i.title.replace(/\s+/g, ' ').slice(0, 70)}`);
    }
  }

  if (!deleting) {
    console.log(`\nDry run: nothing changed. ${toDelete.length} would be deleted with --delete${flag('music') ? '' : ' (speakers only; add --music for tracks)'}.`);
    return;
  }
  if (!toDelete.length) return console.log('\nNothing to delete.');

  // Save what's removed (with positions) before touching the content files.
  await mkdir(REMOVED_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const removedFile = new URL(`${stamp}.json`, REMOVED_DIR);
  const removed = toDelete.map(({ kind, slug, id, title, index, result }) => ({ kind, slug, id, title, index, reason: result.reason, source: result.source }));
  await writeFile(removedFile, `${JSON.stringify({ createdAt: new Date().toISOString(), removed }, null, 2)}\n`);

  for (const kind of deleteKinds) {
    const ids = new Map();
    for (const r of removed.filter((r) => r.kind === kind)) ids.set(`${r.slug}\t${r.id}`, true);
    if (!ids.size) continue;
    // Re-read right before writing, in case the file changed while checking.
    const { raw, data } = await load(kind);
    for (const [slug, entry] of Object.entries(data)) {
      entry.videos = Object.fromEntries(Object.entries(entry.videos).filter(([id]) => !ids.has(`${slug}\t${id}`)));
    }
    await save(kind, data, raw);
  }
  const rel = fileURLToPath(removedFile).replace(fileURLToPath(ROOT), '');
  console.log(`\nDeleted ${removed.length} video(s). Saved them to ${rel}`);
  console.log(`Undo with: npm run check-videos -- --restore ${rel}`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
