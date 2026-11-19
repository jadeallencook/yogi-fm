import speakersJson from '../environments/speakers.environment.json';
import musicJson from '../environments/music.environment.json';
import featuredJson from '../environments/featured.environment.json';

export interface Book {
  title: string;
  link: string;
  image: string;
}

export interface Speaker {
  playlist: string;
  name: string;
  years: string;
  image: string;
  /** About one paragraph from Wikipedia (`npm run fetch-bios`); empty if none. */
  bio: string;
  /** English Wikipedia article title the bio comes from (e.g. "Jiddu Krishnamurti"). */
  wikipedia?: string;
  /** Credit for a portrait from Wikimedia Commons (`npm run fetch-portraits`); shown on the speaker page. */
  imageCredit?: {
    author: string;
    authorUrl: string | null;
    license: string;
    licenseUrl: string | null;
    source: string;
  };
  books: Book[];
  /** YouTube video ID -> title. Key order is display order. */
  videos: Record<string, string>;
}

export interface Genre {
  playlist: string;
  name: string;
  videos: Record<string, string>;
}

export interface FeaturedGroup {
  title: string;
  /** One line shown under the title on the home page. */
  description: string;
  speakers: string[];
}

export const speakers = speakersJson as unknown as Record<string, Speaker>;
export const music = musicJson as unknown as Record<string, Genre>;
export const featured = featuredJson as Record<string, FeaturedGroup>;

/** Order the home page renders the featured groups in. */
export const featuredOrder = ['self', 'drugs', 'east', 'visionaries', 'body', 'relationships'];

/** The home page shows this many speakers per group: the most prominent ones. */
export const FEATURED_PER_GROUP = 3;

/**
 * Home page rules: each group has exactly FEATURED_PER_GROUP speakers, and a speaker
 * is in at most one group. Not every speaker has to be featured (the rest are in the
 * sidebar). Checked when this module loads, so `npm run build` / `npm run dev` fail
 * with a clear message instead of quietly breaking the layout.
 */
function checkFeatured() {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  for (const group of featuredOrder) {
    if (!featured[group]) {
      problems.push(`featuredOrder lists "${group}", which isn't in featured.environment.json`);
      continue;
    }
    const count = featured[group].speakers.length;
    if (count !== FEATURED_PER_GROUP) problems.push(`group "${group}" has ${count} speakers; it needs exactly ${FEATURED_PER_GROUP}`);
    for (const slug of featured[group].speakers) {
      if (!speakers[slug]) problems.push(`"${slug}" in group "${group}" isn't a speaker`);
      else if (seen.has(slug)) problems.push(`"${slug}" is in both "${seen.get(slug)}" and "${group}"`);
      else seen.set(slug, group);
    }
  }
  for (const group of Object.keys(featured)) {
    if (!featuredOrder.includes(group)) problems.push(`group "${group}" isn't in featuredOrder, so it never shows`);
  }
  if (problems.length) {
    throw new Error(`Home page groups (src/environments/featured.environment.json):\n- ${problems.join('\n- ')}`);
  }
}
checkFeatured();

/** Titles compared for duplicates: case, punctuation and spacing ignored (same as integrations/content-editor.mjs). */
export const titleKey = (title: string) =>
  title.toLowerCase().replace(/&/g, 'and').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export interface DuplicateTitle {
  kind: 'speaker' | 'music';
  slug: string;
  /** Speaker or genre name. */
  name: string;
  title: string;
  /** The videos sharing the title, with their 1-based positions in the list. */
  videos: { id: string; position: number }[];
}

/**
 * No two lectures (or tracks) in the same list may share a title (the same lecture is
 * often uploaded more than once). Edit mode refuses them; this also catches hand edits
 * to the JSON and adds made by an edit server started before that check existed.
 */
export function findDuplicateTitles(): DuplicateTitle[] {
  const found: DuplicateTitle[] = [];
  for (const [kind, lists] of [['speaker', speakers], ['music', music]] as const) {
    for (const [slug, list] of Object.entries(lists)) {
      const groups = new Map<string, DuplicateTitle>();
      Object.entries(list.videos).forEach(([id, title], i) => {
        const key = titleKey(title);
        const group = groups.get(key) ?? { kind, slug, name: list.name, title, videos: [] };
        group.videos.push({ id, position: i + 1 });
        groups.set(key, group);
      });
      for (const group of groups.values()) if (group.videos.length > 1) found.push(group);
    }
  }
  return found;
}

// The dev server shows duplicates in the page instead (DevWarnings.astro, marked rows
// in Songs.astro), so a bad edit never takes it down. `npm run build` still fails.
if (!import.meta.env.DEV) {
  const duplicates = findDuplicateTitles();
  if (duplicates.length) {
    const lines = duplicates.map((d) => `${d.kind} "${d.slug}": "${d.title}" (${d.videos.map((v) => `#${v.position} ${v.id}`).join(', ')})`);
    throw new Error(`Duplicate titles (src/environments/*.environment.json); remove one or rename it:\n- ${lines.join('\n- ')}`);
  }
}

/** Renamed genre slugs (old -> new), so old shared `#…/<genre>/…` links still resolve. */
export const genreAliases: Record<string, string> = {
  indian: 'sitar',
  trance: 'house',
};

/** First video of a speaker/genre, used when a requested video doesn't exist (anymore). */
export const firstVideo = (collection: { videos: Record<string, string> }) => Object.keys(collection.videos)[0];

/** `preferred` if that collection still has it (videos can be deleted in edit mode), else its first video. */
const videoOr = (collection: { videos: Record<string, string> }, preferred: string) =>
  Object.hasOwn(collection.videos, preferred) ? preferred : firstVideo(collection);

/**
 * Lists can be empty (all their videos were unavailable and deleted; new ones get added
 * in edit mode). Only speakers/genres with videos can be played.
 */
export const hasVideos = (collection: { videos: Record<string, string> } | undefined) =>
  !!collection && Object.keys(collection.videos).length > 0;

/** `preferred` if it has videos, else the first speaker/genre that does. */
const playableOr = <T extends { videos: Record<string, string> }>(all: Record<string, T>, preferred: string) =>
  hasVideos(all[preferred]) ? preferred : Object.keys(all).find((key) => hasVideos(all[key]))!;

const defaultSpeaker = playableOr(speakers, 'ram-dass');
const defaultGenre = playableOr(music, 'classic-jazz');

/** Shown when the URL has no (valid) selection. */
export const defaults = {
  speaker: defaultSpeaker,
  lecture: videoOr(speakers[defaultSpeaker], 'Ir5ydNXpJlA'),
  genre: defaultGenre,
  music: videoOr(music[defaultGenre], 'WSqFnMy_WYU'),
};

/** "1915-1973" -> "1915–1973" and "1944-Now" -> "1944–Now" (the data keeps the plain hyphen). */
export const formatYears = (years: string) => years.replace(/\s*-\s*/, '–');

/** Seconds -> "4:05", "58:31", "1:09:15" (video lengths; see durations.environment.json). */
export const formatDuration = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

/** Total listening time, rounded: "3 hrs", "1 hr", or under an hour "45 mins" (home tiles). */
export const formatTotalLength = (seconds: number) => {
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'}`;
  const hrs = Math.round(seconds / 3600);
  return `${hrs} hr${hrs === 1 ? '' : 's'}`;
};

export const speakerUrl = (slug: string) => `/speakers/${slug}/`;
export const genreUrl = (slug: string) => `/music/${slug}/`;

export const wikipediaUrl = (title: string) => `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

/** Speaker image paths are stored relative to public/. */
export const asset = (path: string) => `/${path.replace(/^\//, '')}`;
