// Quotes for each speaker, from English Wikiquote. See "Quotes" in documentation/data.md.
//
//   npm run fetch-quotes                  refresh the candidates and rebuild the quotes file
//   npm run fetch-quotes -- --dry-run     show counts, change nothing
//   npm run fetch-quotes -- --only osho   just one speaker (repeatable; others are kept)
//
// Two steps, so curation survives a re-run:
//   1. Every usable, *sourced* quote on the speaker's Wikiquote page is saved as a
//      candidate in jobs/quotes/candidates.json ({ slug: { page, quotes: [{ key, text, source }] } }).
//   2. jobs/quotes/picks.json ({ slug: [key, …] }, hand-picked, in display order) selects
//      which candidates go into src/environments/quotes.environment.json. A pick whose
//      quote has disappeared from Wikiquote is reported and skipped.
//
// Why Wikiquote: quotes online are very often misattributed (Alan Watts, Thich Nhat Hanh,
// Osho…). Wikiquote's quote sections cite the book/talk, and its "Disputed",
// "Misattributed" and "Quotes about X" sections are skipped here. Text is CC BY-SA 4.0,
// so wherever quotes are shown, credit Wikiquote and link the page (stored as `page`).
//
// The page title is the speaker's `wikipedia` title unless WIKIQUOTE_TITLES overrides it.
import { readFile, writeFile, rename } from 'node:fs/promises';

const SPEAKERS = new URL('../src/environments/speakers.environment.json', import.meta.url);
const FILE = new URL('../src/environments/quotes.environment.json', import.meta.url);
const CANDIDATES = new URL('./quotes/candidates.json', import.meta.url);
const PICKS = new URL('./quotes/picks.json', import.meta.url);
const API = 'https://en.wikiquote.org/w/api.php';
// Wikimedia asks for a descriptive User-Agent; this is a generic one (no personal details).
const USER_AGENT = 'YogiFMQuotes/1.0 (local content script; https://yogifm.com)';
const MIN_LENGTH = 40; // shorter is usually a fragment
const MAX_LENGTH = 240; // longer doesn't fit a quote card (long passages are excerpted, see pick())

/** Wikiquote page titles that differ from the speaker's `wikipedia` title. */
const WIKIQUOTE_TITLES = {};

/** Level-2 sections that aren't the speaker's own, verified words. */
const SKIP_SECTION = /about|misattribut|disputed|unsourced|attributed|see also|external|sources|references|further|bibliography|works|quotes of others|dialogue/i;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const only = args.flatMap((a, i) => (a === '--only' && args[i + 1] ? [args[i + 1]] : []));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', redirects: '1', ...params })}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt >= 3) throw err;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

/** Remove {{templates}}, which can nest. */
function stripTemplates(text) {
  let prev;
  do {
    prev = text;
    text = text.replace(/\{\{[^{}]*\}\}/g, '');
  } while (text !== prev);
  return text;
}

/** Wikitext -> plain text. */
function plain(text) {
  return stripTemplates(text)
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/(?:\s*<br\s*\/?>\s*)+/gi, ' / ') // poem line breaks, written the usual inline way
    .replace(/<[^>]+>/g, '')
    .replace(/\[\[(?:File|Image):[^\]]*\]\]/gi, '')
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+\s+([^\]]*)\]/g, '$1')
    .replace(/\[https?:\/\/\S+\]/g, '')
    .replace(/'{2,}/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A citation is often only a locator under the book's heading ("p. 11", "Ch. 1"); put
 * the book in front. Otherwise the citation names the work itself.
 */
function withWork(work, cite) {
  if (!cite || /^https?:/.test(cite)) return work;
  const locator =
    /^(?:p|pp|page|st|stanza|section|part|vol|book|lecture)\b\.?\s*[\dIVXLC]/i.test(cite) ||
    /^(?:ch|chap|chapter|episode|prologue|epilogue|preface|introduction|foreword|afterword|opening chapter|from the chapter)\b/i.test(cite) ||
    /^\(\d{4}\)/.test(cite);
  // A short undated citation under a dated book heading is a part of that book (Naked
  // Lunch's "Benway"), unless it names where it was quoted or said.
  const part = /\(\d{4}/.test(work) && !/\d{4}/.test(cite) && cite.length <= 40 && !/^(?:as )?quoted|interview|from |said|letter|talk|speech|lecture at/i.test(cite);
  const full = (locator || part) && work ? `${work}, ${cite}` : cite;
  return full.length > 140 ? `${full.slice(0, 137).trim()}…` : full;
}

/** Quotes grouped by the (sub)section they're in, skipping sections that aren't verified quotes. */
function parse(wikitext) {
  const groups = [];
  let skip = true; // the intro before the first heading is the bio, not quotes
  let group = null;
  let last = null;
  const parents = {};
  for (const line of wikitext.split('\n')) {
    const heading = line.match(/^(={2,})\s*(.*?)\s*\1\s*$/);
    if (heading) {
      const level = heading[1].length;
      const title = plain(heading[2]);
      if (level === 2) skip = SKIP_SECTION.test(title);
      const otherAuthor = level > 2 && /\)\s*by\s+[A-Z]/.test(title);
      // Sub-sections are usually a book "(year)"; a level-2 "Quotes" heading isn't a source.
      parents[level] = title;
      // A deeper heading under a book is usually a chapter: "Teaching Community, Chapter 2: …".
      // Deeper headings are parts of the book above them (chapters, or e.g. Naked Lunch's "Benway").
      const source = level === 2 && /^quotes?$|^sourced$/i.test(title) ? '' : level > 3 && parents[3] ? `${parents[3]}, ${title}` : title;
      group = { source, quotes: [], skip: otherAuthor };
      groups.push(group);
      last = null;
      continue;
    }
    if (skip || !group || group.skip) continue;
    if (/^\*[^*:]/.test(line)) {
      // Some pages cite in a footnote instead of a sub-bullet.
      const ref = plain(line.match(/<ref[^>/]*>([\s\S]*?)<\/ref>/i)?.[1] ?? '');
      const text = plain(line.slice(1)).replace(/\s*\((?:p|pp)\.?\s*[\d–-]+\)$|\s+(?:p|pp)\.\s*[\d–-]+\.?$/i, '') // page refs
        .replace(/\s*\(Ch\.? ?\d+\)$/i, '') // "(Ch 6)"
        .replace(/\s*-\s?Sadhguru\b.*$/, ''); // "-Sadhguru (on …)" signatures
      last = { text, source: withWork(group.source, ref) };
      group.quotes.push(last);
    } else if (/^\*\*/.test(line) && last && !last.cited) {
      // The first sub-bullet is the citation ("The Way of Zen (1957), p. 12", or just "p. 12").
      const cite = plain(line.replace(/^\*+:?/, ''));
      if (cite && !/^https?:/.test(cite)) last.source = withWork(group.source, cite);
      last.cited = true;
    }
  }
  return groups.filter((g) => g.quotes.length);
}

const clean = (text) =>
  text.length >= MIN_LENGTH &&
  !/^\(/.test(text) && // starts with context ("(Q: …)", "(about …)")
  !/^["“'‘]/.test(text) && // opens by quoting someone else (a proverb, a teacher, a character)
  !/^[A-Z][\w .]{0,25}:\s/.test(text) && // dialogue ("Q: …", "Interviewer: …")
  !/[{}[\]|=]/.test(text); // leftover markup

/** The opening whole sentences (or poem lines) of a long passage, up to MAX_LENGTH ('' if too little fits). */
function excerpt(text) {
  // Poems: whole lines (" / "), since they often have no sentence punctuation.
  const sentences = text.includes(' / ')
    ? text.split(' / ').map((line, i, all) => (i < all.length - 1 ? `${line} / ` : line))
    : (text.match(/[^.!?]+[.!?]+["”’)]*\s*/g) ?? []);
  let out = '';
  for (const s of sentences) {
    if ((out + s).trim().length > MAX_LENGTH) break;
    out += s;
  }
  out = out.trim().replace(/\s*\/$/, '');
  return out.length >= 80 ? out : '';
}

/** Stable id for a quote: its first words, lowercased, letters/digits only. */
const keyOf = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(' ').slice(0, 10).join('-');

/**
 * All candidates, round-robin across sections so they span several books/talks. Whole
 * short quotes first, then the opening sentences of longer passages (`excerpt: true`).
 */
function candidates(groups, n = Infinity) {
  const seen = new Set();
  const out = [];
  const take = (pools, excerpted) => {
    for (let i = 0; out.length < n && pools.some((p) => i < p.length); i++) {
      for (const pool of pools) {
        const q = pool[i];
        if (!q || out.length >= n) continue;
        const key = keyOf(q.text);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(excerpted ? { key, text: q.text, source: q.source, excerpt: true } : { key, text: q.text, source: q.source });
      }
    }
  };
  take(groups.map((g) => g.quotes.filter((q) => q.source && clean(q.text) && q.text.length <= MAX_LENGTH)), false);
  take(
    groups.map((g) =>
      g.quotes
        .filter((q) => q.source && clean(q.text) && q.text.length > MAX_LENGTH)
        .map((q) => ({ ...q, text: excerpt(q.text) }))
        .filter((q) => q.text),
    ),
    true,
  );
  return out;
}

const readJson = async (url) => {
  try {
    return JSON.parse(await readFile(url, 'utf8'));
  } catch {
    return {};
  }
};
const speakers = JSON.parse(await readFile(SPEAKERS, 'utf8'));
const existing = await readJson(CANDIDATES);
const picks = await readJson(PICKS);

const pool = {};
for (const [slug, speaker] of Object.entries(speakers)) {
  if (only.length && !only.includes(slug)) {
    if (existing[slug]) pool[slug] = existing[slug];
    continue;
  }
  const title = WIKIQUOTE_TITLES[slug] ?? speaker.wikipedia ?? speaker.name;
  const data = await api({ action: 'parse', page: title, prop: 'wikitext' }).catch((err) => ({ error: { info: err.message } }));
  if (data.error) {
    console.warn(`${slug}: no Wikiquote page "${title}" (${data.error.info}); keeping the saved candidates`);
    if (existing[slug]) pool[slug] = existing[slug];
    continue;
  }
  const page = data.parse.title;
  pool[slug] = { page, quotes: candidates(parse(data.parse.wikitext)) };
  await new Promise((r) => setTimeout(r, 400));
}

// Picked quotes, in the picks' order; speakers keep their order from speakers.environment.json.
const result = {};
for (const slug of Object.keys(speakers)) {
  if (!pool[slug] || !picks[slug]) continue;
  const byKey = new Map(pool[slug].quotes.map((q) => [q.key, q]));
  const missing = picks[slug].filter((key) => !byKey.has(key));
  if (missing.length) console.warn(`${slug}: ${missing.length} pick(s) no longer on Wikiquote: ${missing.join(', ')}`);
  const quotes = picks[slug].filter((key) => byKey.has(key)).map((key) => {
    const { text, source, excerpt } = byKey.get(key);
    return excerpt ? { text, source, excerpt } : { text, source };
  });
  result[slug] = { page: pool[slug].page, quotes };
}
for (const [slug, s] of Object.entries(pool)) {
  console.log(`${slug}: ${s.quotes.length} candidates from "${s.page}", ${result[slug]?.quotes.length ?? 0} picked`);
}

if (dryRun) {
  console.log('Dry run: nothing saved.');
} else {
  const save = async (url, data) => {
    const tmp = new URL(`${url.href}.tmp`);
    await writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`);
    await rename(tmp, url);
  };
  await save(CANDIDATES, pool);
  await save(FILE, result);
  const total = Object.values(result).reduce((n, s) => n + s.quotes.length, 0);
  console.log(`Saved candidates to jobs/quotes/candidates.json and ${total} picked quotes to src/environments/quotes.environment.json.`);
}
