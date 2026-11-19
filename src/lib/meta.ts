/**
 * Titles, descriptions and preview images for pages (link previews / search results).
 * Build time only: imported by pages, never by client scripts. See "Link previews" in
 * documentation/architecture.md. Images come from jobs/make-og-images.py.
 */
import durationsJson from '../environments/durations.environment.json';
import { formatTotalLength, formatYears, type Genre, type Speaker } from './data';
import { SITE_NAME } from './site';

const durations = durationsJson as Record<string, number>;

const totalSeconds = (videos: Record<string, string>) =>
  Object.keys(videos).reduce((sum, id) => sum + (durations[id] ?? 0), 0);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "55 lectures, 38 hrs" (or just "55 lectures" when lengths are missing). */
function countAndLength(videos: Record<string, string>, noun: string) {
  const total = formatTotalLength(totalSeconds(videos));
  return total ? `${plural(Object.keys(videos).length, noun)}, ${total}` : plural(Object.keys(videos).length, noun);
}

/** First sentence of a Wikipedia bio (at least 40 chars, so "Dr." etc. don't end it). */
const firstSentence = (bio: string) => bio.match(/^.{40,}?[.!?](?=\s+[A-Z]|$)/)?.[0] ?? bio;

/** One video's length: "46 min", "1 hr 12 min", "2 hrs"; '' when unknown. */
function videoLength(id: string) {
  const seconds = durations[id];
  if (!seconds) return '';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} hr${h === 1 ? '' : 's'}${m ? ` ${m} min` : ''}`;
}

export interface PageMeta {
  title: string;
  shareTitle: string;
  description: string;
  image?: string;
  imageAlt?: string;
}

const speakerImage = (slug: string, speaker: Speaker) => (speaker.image ? `og/speakers/${slug}.jpg` : undefined);

export function speakerMeta(slug: string, speaker: Speaker): PageMeta {
  const counts = countAndLength(speaker.videos, 'lecture');
  const intro = speaker.bio ? `${firstSentence(speaker.bio)} ` : '';
  return {
    title: `${speaker.name} Lectures | ${SITE_NAME}`,
    shareTitle: `${speaker.name}: ${counts}`,
    description: `${intro}Listen free to ${counts.replace(', ', ' (')}${counts.includes(', ') ? ')' : ''} by ${speaker.name} on ${SITE_NAME}, with background music.`,
    image: speakerImage(slug, speaker),
    imageAlt: `${speaker.name} (${formatYears(speaker.years)}) on ${SITE_NAME}`,
  };
}

export function lectureMeta(slug: string, speaker: Speaker, id: string): PageMeta {
  const title = speaker.videos[id];
  const length = videoLength(id);
  const others = Object.keys(speaker.videos).length - 1;
  const more = others > 0 ? ` Plus ${plural(others, 'more lecture')} by ${speaker.name}.` : '';
  return {
    title: `${title} · ${speaker.name} | ${SITE_NAME}`,
    shareTitle: `${title} · ${speaker.name}`,
    description: `“${title}”, a lecture by ${speaker.name} (${formatYears(speaker.years)})${length ? `, ${length}` : ''}. Listen free on ${SITE_NAME} with background music.${more}`,
    image: speakerImage(slug, speaker),
    imageAlt: `${speaker.name}: ${title}`,
  };
}

export function genreMeta(slug: string, genre: Genre): PageMeta {
  const counts = countAndLength(genre.videos, 'track');
  return {
    title: `${genre.name} Background Music | ${SITE_NAME}`,
    shareTitle: `${genre.name} background music: ${counts}`,
    description: `${genre.name} music to play under lectures by Alan Watts, Ram Dass, Krishnamurti and more on ${SITE_NAME}. ${counts[0].toUpperCase()}${counts.slice(1)}.`,
    image: `og/music/${slug}.jpg`,
    imageAlt: `${genre.name} background music on ${SITE_NAME}`,
  };
}
