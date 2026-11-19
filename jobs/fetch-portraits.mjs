// Fetch a portrait for speakers that don't have one, from their Wikipedia article's
// lead image, but ONLY when that image is freely licensed on Wikimedia Commons.
// Saves it to public/assets/images/<slug>.<ext> and records the photo credit
// (author + license + source page), which the speaker page displays.
//
//   npm run fetch-portraits                 speakers with a `wikipedia` title and no image
//   npm run fetch-portraits -- --dry-run    show what would be fetched, change nothing
//   npm run fetch-portraits -- --only <slug>   (repeatable)
//
// Non-free images (fair-use files hosted on en.wikipedia itself) are never used;
// those speakers need a photo you're allowed to use, added by hand.
// Portraits are shown in grayscale by CSS, so color photos match the originals.
import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const FILE = new URL('src/environments/speakers.environment.json', ROOT);
const IMAGES = new URL('public/assets/images/', ROOT);
const USER_AGENT = 'YogiFMPortraits/1.0 (local content script; https://yogifm.com)';
const WIDTH = 600;
const MAX_BYTES = 3_000_000;
const FREE_LICENSE = /^(?:CC0|CC BY(?:-SA)?\b|Public domain|PD\b|PDM\b)/i;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const only = args.flatMap((a, i) => (a === '--only' && args[i + 1] ? [args[i + 1]] : []));

const strip = (html) =>
  (html ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

async function api(params) {
  const url = `https://en.wikipedia.org/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Wikipedia API returned HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const raw = await readFile(FILE, 'utf8');
  const data = JSON.parse(raw);
  const targets = Object.entries(data).filter(([slug, s]) => s.wikipedia && (only.length ? only.includes(slug) : !s.image));
  if (!targets.length) return console.log('Nothing to do (every speaker with a `wikipedia` title has an image).');

  // Lead image per article.
  const { query } = await api({ action: 'query', redirects: '1', prop: 'pageimages', piprop: 'name', titles: targets.map(([, s]) => s.wikipedia).join('|') });
  const follow = (t) => {
    for (const step of [...(query.normalized ?? []), ...(query.redirects ?? [])]) if (step.from === t) t = step.to;
    return t;
  };
  const leadImage = new Map(query.pages.map((p) => [p.title, p.pageimage]));

  // File info: repository ("shared" = Commons), license, author, thumbnail.
  const files = [...new Set(targets.map(([, s]) => leadImage.get(follow(s.wikipedia))).filter(Boolean))];
  const info = new Map();
  if (files.length) {
    const ii = await api({ action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: String(WIDTH), titles: files.map((f) => `File:${f}`).join('|') });
    for (const p of ii.query.pages) info.set(p.title.replace(/^File:/, '').replace(/ /g, '_'), p);
  }

  const updates = {};
  for (const [slug, speaker] of targets) {
    const file = leadImage.get(follow(speaker.wikipedia));
    const page = file && info.get(file.replace(/ /g, '_'));
    const meta = page?.imageinfo?.[0]?.extmetadata ?? {};
    const license = strip(meta.LicenseShortName?.value);
    let problem = null;
    if (!file) problem = 'article has no lead image';
    else if (page?.imagerepository !== 'shared') problem = 'lead image is hosted on Wikipedia itself (non-free / fair use)';
    else if (meta.NonFree?.value === 'true' || !FREE_LICENSE.test(license)) problem = `license "${license || 'unknown'}" isn't a free license`;
    if (problem) {
      console.log(`! ${slug.padEnd(20)} ${problem}: needs a photo added by hand`);
      continue;
    }
    const thumb = page.imageinfo[0].thumburl ?? page.imageinfo[0].url;
    const ext = (thumb.match(/\.(jpe?g|png|webp)(?:$|\?)/i)?.[1] ?? 'jpg').toLowerCase().replace('jpeg', 'jpg');
    // Author text plus their link (CC BY/BY-SA require attribution). Some Commons files
    // only give a profile URL as the author, e.g. a Flickr account: label it from the URL.
    const authorUrl = meta.Artist?.value?.match(/href="([^"]+)"/)?.[1]?.replace(/^\/\//, 'https://') ?? null;
    let author = strip(meta.Artist?.value);
    if (/^https?:\/\//.test(author)) {
      const flickr = author.match(/flickr\.com\/(?:people|photos)\/([^/]+)/);
      author = flickr ? `Flickr user ${flickr[1]}` : new URL(author).hostname;
    }
    if (!author || /^(?:unknown|unbekannt|anonym(?:ous)?|inconnu|desconocido)$/i.test(author)) author = 'Unknown photographer';
    const credit = {
      author,
      authorUrl,
      // "PDM-owner" etc. = Public Domain Mark
      license: /^PDM\b/i.test(license) ? 'Public domain' : license,
      licenseUrl: meta.LicenseUrl?.value ?? null,
      source: page.imageinfo[0].descriptionurl, // the file's Commons page
    };
    console.log(`✓ ${slug.padEnd(20)} ${license.padEnd(14)} ${author.slice(0, 40)}`);
    if (dryRun) continue;

    const res = await fetch(thumb, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30_000) });
    const type = res.headers.get('content-type') ?? '';
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!res.ok || !type.startsWith('image/') || bytes.length > MAX_BYTES) {
      console.log(`! ${slug.padEnd(20)} download failed (HTTP ${res.status}, ${type}, ${bytes.length} bytes)`);
      continue;
    }
    const name = `${slug}.${ext}`;
    await writeFile(new URL(name, IMAGES), bytes);
    updates[slug] = { image: `assets/images/${name}`, imageCredit: credit };
  }

  if (dryRun) return console.log('\nDry run: nothing saved.');
  if (!Object.keys(updates).length) return;
  // Re-read right before writing, in case the file changed meanwhile.
  const latestRaw = await readFile(FILE, 'utf8');
  const latest = JSON.parse(latestRaw);
  for (const [slug, update] of Object.entries(updates)) if (latest[slug]) Object.assign(latest[slug], update);
  const text = /^\{\s*\n/.test(latestRaw) ? `${JSON.stringify(latest, null, 2)}\n` : JSON.stringify(latest);
  const path = fileURLToPath(FILE);
  await writeFile(`${path}.tmp`, text);
  await rename(`${path}.tmp`, path);
  console.log(`\nSaved ${Object.keys(updates).length} portrait(s) to public/assets/images/.`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
