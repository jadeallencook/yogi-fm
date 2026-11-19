// Fetch the length of every lecture and music video from the YouTube Data API v3 and
// save it to src/environments/durations.environment.json as { videoId: seconds }.
// Kept separate from speakers/music JSON so hand-edited titles are never rewritten.
//
//   npm run fetch-durations                 only videos that don't have a length yet
//   npm run fetch-durations -- --all        refetch every video
//   npm run fetch-durations -- --dry-run    show what would change, save nothing
//
// Needs YOUTUBE_API_KEY in .env (git-ignored; see .env.example). Only video IDs are
// sent, 50 per request (1 quota unit each, far under the free daily quota).
import { readFile, writeFile, rename, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const SPEAKERS = new URL('src/environments/speakers.environment.json', ROOT);
const MUSIC = new URL('src/environments/music.environment.json', ROOT);
const OUT = new URL('src/environments/durations.environment.json', ROOT);
const BATCH = 50;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const all = args.includes('--all');

try {
  process.loadEnvFile(fileURLToPath(new URL('.env', ROOT)));
} catch {
  // No .env: fall back to the real environment.
}
const key = process.env.YOUTUBE_API_KEY?.trim();

/** ISO 8601 duration ("PT1H9M15S", "P1DT2H") -> seconds. */
function seconds(iso) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso ?? '');
  if (!m) return null;
  const [, d = 0, h = 0, min = 0, s = 0] = m.map((v) => (v === undefined ? 0 : Number(v)));
  return d * 86400 + h * 3600 + min * 60 + s;
}

async function main() {
  if (!key || key === 'paste-your-key-here') {
    throw new Error('Set YOUTUBE_API_KEY in .env first (see .env.example).');
  }
  const speakers = JSON.parse(await readFile(SPEAKERS, 'utf8'));
  const music = JSON.parse(await readFile(MUSIC, 'utf8'));
  const ids = [...new Set([...Object.values(speakers), ...Object.values(music)].flatMap((c) => Object.keys(c.videos)))];

  let existing = {};
  try {
    await access(OUT);
    existing = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    // First run.
  }
  const todo = all ? ids : ids.filter((id) => !Object.hasOwn(existing, id));
  console.log(`${ids.length} videos, ${todo.length} to fetch.`);
  if (!todo.length) return;

  const found = {};
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    const url = `https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({ part: 'contentDetails', id: batch.join(','), key, maxResults: String(BATCH) })}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Never print the URL: it contains the key.
      throw new Error(`YouTube API error ${res.status}: ${body.error?.message ?? res.statusText}`);
    }
    for (const item of body.items ?? []) {
      const s = seconds(item.contentDetails?.duration);
      if (s !== null) found[item.id] = s;
    }
  }

  const missing = todo.filter((id) => !Object.hasOwn(found, id));
  console.log(`Got ${Object.keys(found).length} length(s).`);
  if (missing.length) {
    console.log(`No length for ${missing.length} (private, removed, or still live): ${missing.join(', ')}`);
  }
  if (dryRun) return console.log('Dry run: nothing saved.');

  // Keep only videos that are still listed somewhere, sorted for stable diffs.
  const merged = { ...existing, ...found };
  const keep = new Set(ids);
  const out = Object.fromEntries(Object.entries(merged).filter(([id]) => keep.has(id)).sort(([a], [b]) => a.localeCompare(b)));
  const path = fileURLToPath(OUT);
  await writeFile(`${path}.tmp`, `${JSON.stringify(out, null, 2)}\n`);
  await rename(`${path}.tmp`, path);
  console.log(`Saved ${Object.keys(out).length} length(s) to src/environments/durations.environment.json.`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
