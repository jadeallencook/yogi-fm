// Local content editor backend. Registered in astro.config.mjs only when
// PUBLIC_EDIT_MODE=true (`npm run dev:edit`), and only hooks the *dev* server
// (`astro:server:setup`), so it never exists in a production build.
//
// All routes are POST with a JSON body and change one video in src/environments/*.json,
// keeping the file's format. See documentation/editing.md.
//
//   /__editor/title   { kind, slug, id, title }
//   /__editor/delete  { kind, slug, id }            (may empty a list)
//   /__editor/add     { kind, slug, video, title?, position?: "top" | "bottom" }
//
// kind is "speaker" or "music"; slug is the speaker/genre key; id is a YouTube video ID.
import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const FILES = {
  speaker: new URL('../src/environments/speakers.environment.json', import.meta.url),
  music: new URL('../src/environments/music.environment.json', import.meta.url),
};
const MAX_BODY = 10_000;
const MAX_TITLE = 300;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Content files the editor just wrote (path -> time), so their browser reload can be skipped. */
const editorWrites = new Map();
const EDITOR_WRITE_WINDOW_MS = 5000;

/**
 * Vite plugin: after an editor write, skip the *browser* hot update for that JSON file
 * (it would reload the page; editor.ts updates the page in place instead). The SSR
 * environment still updates normally, so the next page load renders the new data.
 * Changes made outside the editor (e.g. in a code editor) reload as usual.
 */
const skipBrowserReloadForEditorWrites = {
  name: 'content-editor:skip-browser-reload',
  apply: 'serve',
  hotUpdate({ file }) {
    if (this.environment.name !== 'client') return;
    const at = editorWrites.get(file);
    if (at === undefined) return;
    // One editor write cancels one browser update, so a later change made by hand
    // (in a code editor) still reloads the page as usual.
    editorWrites.delete(file);
    if (Date.now() - at > EDITOR_WRITE_WINDOW_MS) return;
    return [];
  },
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) reject(new HttpError(413, 'Body too large'));
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

/** Serialize the same way the file was written (the content files are compact JSON). */
function serialize(data, raw) {
  return /^\{\s*\n/.test(raw) ? `${JSON.stringify(data, null, 2)}\n` : JSON.stringify(data);
}

function cleanTitle(value) {
  const title = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!title || title.length > MAX_TITLE) throw new HttpError(400, `Title must be 1-${MAX_TITLE} characters`);
  return title;
}

/** Accepts a bare ID or any common YouTube URL form (watch, youtu.be, embed, shorts, live). */
export function parseVideoId(input) {
  const value = typeof input === 'string' ? input.trim() : '';
  if (VIDEO_ID.test(value)) return value;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let id = null;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = url.searchParams.get('v') ?? url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1] ?? null;
  }
  return id && VIDEO_ID.test(id) ? id : null;
}

/**
 * Looks the video up via YouTube oEmbed: confirms it exists and can be embedded,
 * and returns its title. Only the video ID is sent to YouTube.
 */
async function lookupVideo(id) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch {
    throw new HttpError(502, 'Could not reach YouTube to check the video');
  }
  if (res.status === 401) throw new HttpError(422, 'The owner has disabled embedding for this video');
  if (res.status === 403) throw new HttpError(422, 'This video is private');
  if (res.status === 400 || res.status === 404) throw new HttpError(422, 'Video not found on YouTube');
  if (!res.ok) throw new HttpError(502, `YouTube returned HTTP ${res.status}`);
  const { title } = await res.json();
  return typeof title === 'string' ? title : '';
}

/** Drops a leading "Speaker Name -/:/|/~" from YouTube titles, like the old scraper did. */
function stripSpeakerPrefix(title, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return title.replace(new RegExp(`^${escaped}\\s*[-:|~–—]\\s*`, 'i'), '').trim() || title;
}

/** Loads the file for `kind`, runs `change(entry, data)` on the slug's entry, and saves. */
async function update(kind, slug, change) {
  const file = FILES[kind];
  if (!file) throw new HttpError(400, 'kind must be "speaker" or "music"');
  const raw = await readFile(file, 'utf8');
  const data = JSON.parse(raw);
  const entry = typeof slug === 'string' && Object.hasOwn(data, slug) ? data[slug] : undefined;
  if (!entry?.videos) throw new HttpError(404, `No ${kind} "${slug}"`);

  const result = await change(entry, data);

  // Write to a temp file and rename, so a crash can't leave half-written JSON.
  const path = fileURLToPath(file);
  await writeFile(`${path}.tmp`, serialize(data, raw));
  editorWrites.set(path, Date.now());
  await rename(`${path}.tmp`, path);
  return result;
}

function requireVideo(entry, kind, slug, id) {
  if (typeof id !== 'string' || !Object.hasOwn(entry.videos, id)) {
    throw new HttpError(404, `No video ${id} in ${kind} "${slug}"`);
  }
}

const routes = {
  async title({ kind, slug, id, title: rawTitle }, logger) {
    const title = cleanTitle(rawTitle);
    return update(kind, slug, (entry) => {
      requireVideo(entry, kind, slug, id);
      const previous = entry.videos[id];
      entry.videos[id] = title;
      logger.info(`title ${kind} ${slug}/${id}: "${previous}" -> "${title}"`);
      return { title, previous };
    });
  },

  async delete({ kind, slug, id }, logger) {
    return update(kind, slug, (entry) => {
      requireVideo(entry, kind, slug, id);
      // Deleting the last video is allowed: empty lists show "No lectures yet" and are
      // skipped by the player (see hasVideos() in src/lib/data.ts).
      const title = entry.videos[id];
      delete entry.videos[id];
      // Logged with its title so it can be re-added (git also has the previous version).
      logger.info(`delete ${kind} ${slug}/${id}: "${title}"`);
      return { id, title };
    });
  },

  async add({ kind, slug, video, title: rawTitle, position }, logger) {
    const id = parseVideoId(video);
    if (!id) throw new HttpError(400, 'Paste a YouTube link or an 11-character video ID');
    if (!FILES[kind]) throw new HttpError(400, 'kind must be "speaker" or "music"');

    // Check the video before touching the file (this is the slow part).
    const youtubeTitle = await lookupVideo(id);

    return update(kind, slug, (entry) => {
      if (Object.hasOwn(entry.videos, id)) {
        throw new HttpError(409, `Already in this list as "${entry.videos[id]}"`);
      }
      const fallback = kind === 'speaker' && entry.name ? stripSpeakerPrefix(youtubeTitle, entry.name) : youtubeTitle;
      const title = cleanTitle(rawTitle?.trim() ? rawTitle : fallback);
      // Object key order is display order, so rebuild the map to insert at the top.
      entry.videos = position === 'top' ? { [id]: title, ...entry.videos } : { ...entry.videos, [id]: title };
      logger.info(`add ${kind} ${slug}/${id} (${position === 'top' ? 'top' : 'bottom'}): "${title}"`);
      return { id, title };
    });
  },
};

export default function contentEditor() {
  return {
    name: 'content-editor',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({ vite: { plugins: [skipBrowserReloadForEditorWrites] } });
      },
      'astro:server:setup': ({ server, logger }) => {
        logger.info('Edit mode on: /__editor/{title,delete,add} write to src/environments/*.json');

        server.middlewares.use('/__editor', async (req, res) => {
          const route = Object.hasOwn(routes, req.url.slice(1)) ? routes[req.url.slice(1)] : null;
          try {
            if (!route) throw new HttpError(404, 'Unknown editor route');
            if (req.method !== 'POST') throw new HttpError(405, 'POST only');
            // JSON content type forces a CORS preflight for cross-site requests (which we
            // never answer), and the Origin check rejects any other site outright.
            if (!req.headers['content-type']?.startsWith('application/json')) {
              throw new HttpError(415, 'Expected application/json');
            }
            const origin = req.headers.origin;
            if (origin && new URL(origin).host !== req.headers.host) {
              throw new HttpError(403, 'Cross-origin request rejected');
            }
            let input;
            try {
              input = JSON.parse(await readBody(req));
            } catch (error) {
              if (error instanceof HttpError) throw error;
              throw new HttpError(400, 'Invalid JSON body');
            }
            send(res, 200, { ok: true, ...(await route(input ?? {}, logger)) });
          } catch (error) {
            if (error instanceof HttpError) return send(res, error.status, { error: error.message });
            logger.error(String(error));
            send(res, 500, { error: 'Could not update the content file' });
          }
        });
      },
    },
  };
}
