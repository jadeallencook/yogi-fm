// Fetch a one-paragraph bio for each speaker from Wikipedia and store it in
// src/environments/speakers.environment.json (`bio`). See documentation/data.md.
//
//   npm run fetch-bios                 fetch and save bios for every speaker with a `wikipedia` title
//   npm run fetch-bios -- --dry-run    show what would be saved, change nothing
//   npm run fetch-bios -- --only osho  just one speaker (repeatable)
//   npm run fetch-bios -- --show       also print the bio text
//
// Each speaker's `wikipedia` field is the English Wikipedia article title (e.g.
// "Jiddu Krishnamurti" for krishnamurti). Speakers without one are skipped, e.g.
// Kim Eng, who has no article ("Kim Eng" redirects to an unrelated bank).
//
// Source: the article's plain-text lead section (MediaWiki action API, prop=extracts).
// Text is CC BY-SA 4.0; the speaker page shows a credit linking to the article.
import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const FILE = new URL('../src/environments/speakers.environment.json', import.meta.url);
const API = 'https://en.wikipedia.org/w/api.php';
// Wikimedia asks for a descriptive User-Agent; this is a generic one (no personal details).
const USER_AGENT = 'YogiFMBios/1.0 (local content script; https://yogifm.com)';
const MIN_FIRST_PARAGRAPH = 400; // shorter than this: append the second paragraph
const MAX_LENGTH = 900; // trim at a sentence end around this length

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const only = args.flatMap((a, i) => (a === '--only' && args[i + 1] ? [args[i + 1]] : []));

/** Tidy leftovers of removed pronunciation/IPA markup, e.g. "( ; born 1931)" or "( WAHTS)". */
function clean(text) {
  return text
    .replace(/\(\s*[;,]\s*/g, '(')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const IPA_CHARS = /[ˈˌəɪʊæʃʒθðŋɛɔʁːɲʰ̟̌]/;

/**
 * The opening parenthesis usually mixes pronunciation with dates/birth names, e.g.
 * "( AWL-dəs; 26 July 1894 – …)", "(pronounced /…/; 11 May 1895 – …)",
 * "( TIK NAHT HAHN; Vietnamese: [tʰǐk …]; …)". Keep only the non-pronunciation parts.
 */
function stripPronunciation(text) {
  const open = text.indexOf('(');
  const close = open === -1 ? -1 : text.indexOf(')', open);
  if (open === -1 || close === -1 || open > 120) return text;
  const kept = text
    .slice(open + 1, close)
    .split(';')
    .map((part) => part.trim())
    .filter(
      (part) =>
        part &&
        !/^pronounced\b/i.test(part) &&
        !/^[A-Z][\w ]*:\s*\[/.test(part) && // "German: [ˈɛkhaʁt …]"
        !IPA_CHARS.test(part) && // "AWL-dəs", "EK-art TOL-ə"
        !/^[A-Z][A-Z-]*(?:[ -][A-Z][A-Z-]*)*$/.test(part) && // "TIK NAHT HAHN"
        // Mixed-case respellings: "GAH-bor MAH-tay" (hyphenated words with a stressed CAPS syllable)
        !(/^[A-Za-z]+(?:-[A-Za-z]+)+(?:\s+[A-Za-z]+(?:-[A-Za-z]+)*)*$/.test(part) && /[A-Z]{2,}/.test(part)) &&
        // Native-script names and romanizations: "Thai: พระ…", "Standard Tibetan: པདྨ…, romanized: …", "RTGS: …"
        !/[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u.test(part) &&
        !/^(?:RTGS|romanized|lit\.)\b/i.test(part),
    );
  const inner = kept.join('; ');
  return clean(text.slice(0, open) + (inner ? `(${inner})` : '') + text.slice(close + 1));
}

/** About one paragraph: the first, plus the second if the first is short; trimmed at a sentence end. */
function toBio(extract) {
  const paragraphs = extract.split(/\n+/).map(clean).filter(Boolean);
  if (paragraphs.length) paragraphs[0] = stripPronunciation(paragraphs[0]);
  if (!paragraphs.length) return '';
  let text = paragraphs[0];
  if (text.length < MIN_FIRST_PARAGRAPH && paragraphs[1]) text += ` ${paragraphs[1]}`;
  if (text.length <= MAX_LENGTH) return text;
  // Split into sentences (a period followed by a space and a capital/quote/paren).
  const sentences = text.match(/[^.!?]+(?:[.!?]+["”’)]?)(?=\s+["“(A-Z]|\s*$)|[^.!?]+$/g) ?? [text];
  let out = '';
  for (const sentence of sentences) {
    if (out && (out + sentence).length > MAX_LENGTH) break;
    out += sentence;
  }
  return out.trim();
}

async function fetchExtracts(titles) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    prop: 'extracts|pageprops',
    ppprop: 'disambiguation',
    exintro: '1',
    explaintext: '1',
    exlimit: 'max',
    titles: titles.join('|'),
  });
  const res = await fetch(`${API}?${params}`, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`Wikipedia API returned HTTP ${res.status}`);
  const { query } = await res.json();
  // Map each requested title to its final page (through normalization and redirects).
  const follow = (title) => {
    for (const step of [...(query.normalized ?? []), ...(query.redirects ?? [])]) if (step.from === title) title = step.to;
    return title;
  };
  const pages = new Map(query.pages.map((page) => [page.title, page]));
  return new Map(titles.map((title) => [title, { resolved: follow(title), page: pages.get(follow(follow(title))) }]));
}

async function main() {
  const raw = await readFile(FILE, 'utf8');
  const data = JSON.parse(raw);
  const targets = Object.entries(data).filter(([slug, s]) => s.wikipedia && (!only.length || only.includes(slug)));
  const skipped = Object.entries(data).filter(([slug, s]) => !s.wikipedia && (!only.length || only.includes(slug)));

  const results = await fetchExtracts(targets.map(([, s]) => s.wikipedia));
  const updates = {};
  for (const [slug, speaker] of targets) {
    const { resolved, page } = results.get(speaker.wikipedia);
    let problem = null;
    if (!page || page.missing) problem = 'no such article';
    else if (page.pageprops && 'disambiguation' in page.pageprops) problem = 'disambiguation page';
    else if (!page.extract) problem = 'no intro text';
    if (problem) {
      console.log(`! ${slug.padEnd(20)} ${speaker.wikipedia}: ${problem} (kept existing bio)`);
      continue;
    }
    const bio = toBio(page.extract);
    const redirected = resolved !== speaker.wikipedia.replace(/_/g, ' ');
    updates[slug] = { bio, wikipedia: page.title };
    console.log(
      `${speaker.bio === bio ? '=' : '✓'} ${slug.padEnd(20)} ${page.title.padEnd(24)} ${String(bio.length).padStart(4)} chars` +
        (redirected ? `  (redirect: "${speaker.wikipedia}" → "${page.title}", check it's the right person)` : ''),
    );
  }
  for (const [slug] of skipped) console.log(`- ${slug.padEnd(20)} no "wikipedia" title set, skipped`);

  if (args.includes('--show')) for (const [slug, u] of Object.entries(updates)) console.log(`\n[${slug}] ${u.bio}`);
  if (dryRun) return console.log('\nDry run: nothing saved.');
  // Re-read right before writing, in case the file changed (e.g. edit mode) meanwhile.
  const latestRaw = await readFile(FILE, 'utf8');
  const latest = JSON.parse(latestRaw);
  for (const [slug, update] of Object.entries(updates)) if (latest[slug]) Object.assign(latest[slug], update);
  const text = /^\{\s*\n/.test(latestRaw) ? `${JSON.stringify(latest, null, 2)}\n` : JSON.stringify(latest);
  const path = fileURLToPath(FILE);
  await writeFile(`${path}.tmp`, text);
  await rename(`${path}.tmp`, path);
  console.log(`\nSaved ${Object.keys(updates).length} bio(s).`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
