/**
 * Client-side player: two YouTube players (lecture + background music) that keep
 * playing across page navigations. See documentation/architecture.md.
 *
 * This module runs once per full page load. Page content is swapped by the
 * ClientRouter (see installSwap) without touching the player, so the iframes
 * are never moved or reloaded.
 */
import { navigate, swapFunctions } from 'astro:transitions/client';
import { speakers, music, defaults, genreAliases, firstVideo, hasVideos, asset, speakerUrl, genreUrl, formatDuration } from './data';
// Video lengths (npm run fetch-durations) for the full-screen list; ~3 KB gzipped.
import durationsJson from '../environments/durations.environment.json';

const durations = durationsJson as Record<string, number>;

// --- Minimal YouTube IFrame API types --------------------------------------

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  loadVideoById(id: string): void;
  cueVideoById(id: string): void;
  setVolume(volume: number): void;
  getPlayerState(): number;
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  mute(): void;
  unMute(): void;
}

interface YTNamespace {
  Player: new (
    el: string | HTMLElement,
    options: {
      videoId: string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
        /** 2 bad ID, 5 HTML5 error, 100 removed/private, 101/150 embedding not allowed. */
        onError?: (e: { data: number; target: YTPlayer }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// --- State ------------------------------------------------------------------

interface State {
  speaker: string;
  lecture: string;
  genre: string;
  music: string;
}

const LECTURE_VOLUME = 100;
const MUSIC_VOLUME = 15;

/**
 * Volume mix from the bar's sliders, remembered per browser (a convenience: it falls
 * back to the defaults when storage is unavailable).
 */
const VOLUME_KEY = 'yogifm:volume';
const volume = { lecture: LECTURE_VOLUME, music: MUSIC_VOLUME, lectureMuted: false, musicMuted: false };
try {
  const saved = JSON.parse(localStorage.getItem(VOLUME_KEY) ?? 'null');
  if (saved && typeof saved === 'object') {
    for (const key of ['lecture', 'music'] as const) {
      if (typeof saved[key] === 'number' && saved[key] >= 0 && saved[key] <= 100) volume[key] = saved[key];
    }
  }
} catch {
  // Storage blocked or bad data: keep the defaults.
}

function saveVolume() {
  try {
    localStorage.setItem(VOLUME_KEY, JSON.stringify({ lecture: volume.lecture, music: volume.music }));
  } catch {
    // Not saved; the sliders still work for this visit.
  }
}

/** Same rules as the React app: all four parts must be present and valid, or fall back. */
function readHash(): State {
  const parts = window.location.hash.replace('#', '').split('/');
  const passed = parts.length === 4;
  const [s, l, rawGenre, m] = parts;
  const g = genreAliases[rawGenre] ?? rawGenre;
  // Speakers/genres with no videos (yet) can't be played; fall back to the defaults.
  const speaker = passed && Object.hasOwn(speakers, s) && hasVideos(speakers[s]) ? s : defaults.speaker;
  const genre = passed && Object.hasOwn(music, g) && hasVideos(music[g]) ? g : defaults.genre;
  // A valid speaker/genre with a missing video (e.g. deleted since the link was shared)
  // falls back to that list's first video, not the default speaker's lecture.
  const lecture = Object.hasOwn(speakers[speaker].videos, l)
    ? l
    : speaker === defaults.speaker ? defaults.lecture : firstVideo(speakers[speaker]);
  const song = Object.hasOwn(music[genre].videos, m)
    ? m
    : genre === defaults.genre ? defaults.music : firstVideo(music[genre]);
  return { speaker, lecture, genre, music: song };
}

const state: State = readHash();
let playing = false;

let lecturePlayer: YTPlayer | null = null;
let musicPlayer: YTPlayer | null = null;

/**
 * On phones the lecture plays in the small round player in the controls (#mobile-video),
 * because mobile browsers need the user to tap the video itself. Matches Player.scss.
 */
const isMobile = window.matchMedia('only screen and (max-device-width: 480px)').matches;

// --- Rendering --------------------------------------------------------------

function writeHash() {
  const hash = `#${state.speaker}/${state.lecture}/${state.genre}/${state.music}`;
  // Keep Astro's router state in history.state.
  history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`);
}

function render() {
  writeHash();

  const speaker = speakers[state.speaker];
  const genre = music[state.genre];
  renderMarquee([
    { icon: 'fa-microphone', label: speaker.name, title: speaker.videos[state.lecture] },
    { icon: 'fa-music', label: genre.name, title: genre.videos[state.music] },
  ]);

  // Desktop bar: speaker/genre (links to their page) and the titles.
  const setInfo = (kind: 'lecture' | 'music', name: string, href: string, title: string) => {
    const link = document.querySelector<HTMLAnchorElement>(`[data-info-link="${kind}"]`);
    if (link) {
      if (link.textContent !== name) link.textContent = name;
      if (link.getAttribute('href') !== href) link.setAttribute('href', href);
    }
    const what = document.querySelector<HTMLElement>(`[data-info-title="${kind}"]`);
    if (what && what.textContent !== title) {
      what.textContent = title;
      what.title = title;
    }
  };
  setInfo('lecture', speaker.name, speakerUrl(state.speaker), speaker.videos[state.lecture]);
  setInfo('music', genre.name, genreUrl(state.genre), genre.videos[state.music]);

  setThumb('lecture', state.lecture, `${speaker.name}: ${speaker.videos[state.lecture]}`);
  setThumb('music', state.music, `${music[state.genre].name}: ${music[state.genre].videos[state.music]}`);

  // Home page banner (Banner.astro). Text is only written when it changes, so the
  // name's entrance animation isn't disturbed on every play/pause.
  const setText = (key: string, text: string) => {
    const el = document.querySelector(`[data-now="${key}"]`);
    if (el && el.textContent !== text) el.textContent = text;
  };
  setText('speaker', speaker.name);
  setText('lecture', speaker.videos[state.lecture]);
  setText('genre', genre.name);
  setText('label', playing ? 'Now playing' : 'Press play to listen to');
  document.querySelector('.Banner')?.classList.toggle('playing', playing);
  document.querySelector('[data-page] .Songs')?.classList.toggle('playing', playing);
  const bannerToggle = document.querySelector<HTMLElement>('[data-banner-toggle]');
  if (bannerToggle) {
    bannerToggle.querySelector('i')?.classList.toggle('fa-play', !playing);
    bannerToggle.querySelector('i')?.classList.toggle('fa-pause', playing);
    const text = bannerToggle.querySelector('span');
    if (text) text.textContent = playing ? 'Pause' : 'Play';
  }

  renderQueue();

  document.querySelectorAll<HTMLElement>('[data-play]').forEach((row) => {
    const id = row.dataset.play;
    row.classList.toggle('active', id === state.lecture || id === state.music);
    row.classList.toggle('unavailable', unavailable.has(id!));
    if (unavailable.has(id!)) row.title = 'Unavailable on YouTube';
  });

  // Sidebar: the speaker and genre loaded in the player (bars move while playing).
  document.querySelectorAll<HTMLElement>('[data-side-speaker]').forEach((link) => {
    const current = link.dataset.sideSpeaker === state.speaker;
    link.classList.toggle('current', current);
    link.classList.toggle('playing', current && playing);
  });
  document.querySelectorAll<HTMLElement>('[data-side-genre]').forEach((link) => {
    const current = link.dataset.sideGenre === state.genre;
    link.classList.toggle('current', current);
    link.classList.toggle('playing', current && playing);
  });

  // Home page tiles (Featured.astro): "Now playing" badge.
  document.querySelectorAll<HTMLElement>('[data-speaker-tile]').forEach((tile) => {
    const current = tile.dataset.speakerTile === state.speaker;
    tile.classList.toggle('current', current);
    tile.classList.toggle('playing', current && playing);
  });

  // Play buttons for a speaker (home tiles, speaker page header): pause if it's the
  // speaker that's playing. An optional [data-label] child shows "Play"/"Pause".
  document.querySelectorAll<HTMLElement>('[data-play-speaker]').forEach((button) => {
    const slug = button.dataset.playSpeaker!;
    const pauses = slug === state.speaker && playing;
    button.querySelector('i')?.classList.toggle('fa-play', !pauses);
    button.querySelector('i')?.classList.toggle('fa-pause', pauses);
    const label = button.querySelector('[data-label]');
    if (label) label.textContent = pauses ? 'Pause' : 'Play';
    const name = speakers[slug]?.name ?? '';
    button.setAttribute('aria-label', pauses ? `Pause ${name}` : `Play ${name}`);
  });

  const toggle = document.querySelector<HTMLElement>('.Player [data-control="toggle"]');
  if (toggle) {
    toggle.classList.toggle('fa-play', !playing);
    toggle.classList.toggle('fa-pause', playing);
    toggle.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }
}

/** Marquee scroll speed in px/s, so long and short titles move at the same pace. */
const MARQUEE_SPEED = 40;

/**
 * Footer marquee: "🎤 Speaker: lecture  ♪ Genre: song", repeated twice in a track that
 * animates from 0 to -50% (exactly one copy), which loops with no gap. Rebuilt only
 * when the text changes so the animation doesn't restart on every navigation.
 */
function renderMarquee(parts: { icon: string; label: string; title: string }[]) {
  const track = document.querySelector<HTMLElement>('[data-marquee]');
  if (!track) return;
  const key = parts.map((p) => `${p.label}|${p.title}`).join('||');
  if (track.dataset.key === key) return;
  track.dataset.key = key;

  const item = (repeat: number) => {
    const el = document.createElement('span');
    el.className = 'item';
    for (let i = 0; i < repeat; i++) {
      for (const p of parts) {
        const part = document.createElement('span');
        part.className = `part ${p.icon === 'fa-music' ? 'music' : 'lecture'}`;
        const icon = document.createElement('i');
        icon.className = `fa ${p.icon}`;
        icon.setAttribute('aria-hidden', 'true');
        const b = document.createElement('b');
        b.textContent = `${p.label}:`;
        part.append(icon, b, ` ${p.title}`);
        el.append(part);
      }
    }
    return el;
  };
  const fill = (repeat: number) => {
    const copy = item(repeat);
    copy.setAttribute('aria-hidden', 'true'); // Screen readers get the text once.
    track.replaceChildren(item(repeat), copy);
  };

  // Restart the animation from the beginning with a duration that matches the new width.
  track.style.animation = 'none';
  fill(1);
  requestAnimationFrame(() => {
    // One copy must be at least as wide as the marquee box, or a gap shows at the end
    // of each loop. Short titles are repeated within each copy to guarantee that.
    const box = track.parentElement!.clientWidth;
    let width = (track.firstElementChild as HTMLElement).offsetWidth;
    if (width > 0 && width < box) {
      const repeat = Math.ceil(box / width);
      fill(repeat);
      width *= repeat;
    }
    track.style.setProperty('--marquee-duration', `${Math.max(width / MARQUEE_SPEED, 8)}s`);
    track.style.animation = '';
  });
}

/** Footer boxes show the current video's thumbnail until hovered (see Player.scss). */
function setThumb(kind: 'lecture' | 'music', id: string, label: string) {
  const box = document.querySelector<HTMLElement>(`[data-thumb="${kind}"]`);
  if (!box) return;
  box.title = label; // Always: the title can change in edit mode without a new video.
  if (box.dataset.id === id) return;
  box.dataset.id = id;
  box.style.backgroundImage = `url(https://i.ytimg.com/vi/${id}/mqdefault.jpg)`;
}

// --- Full-screen player -------------------------------------------------------

/**
 * The up arrow above play/pause expands the footer player to fill the screen beside the
 * sidebar: the lecture and music videos at full size, the controls, and a list of
 * lectures. It's only CSS on the same elements (`.Player.expanded`), so the iframes
 * are never moved and playback continues. Sidebar links still navigate underneath;
 * while expanded, the list then shows that speaker's (or genre's) videos.
 */
let expanded = false;
/**
 * The full-screen list has two sections, one open at a time: Lectures (a browsed
 * speaker, or null for the playing one) and Music (a browsed genre, or null for the
 * playing one, picked with the genre buttons).
 */
let openSection: 'lecture' | 'music' = 'lecture';
let lectureTarget: string | null = null;
let musicTarget: string | null = null;

function setExpanded(open: boolean) {
  const player = document.querySelector<HTMLElement>('.Player');
  if (!player || isMobile) return;
  expanded = open;
  // Opening always starts at the speaker that's playing.
  lectureTarget = null;
  musicTarget = null;
  openSection = 'lecture';
  player.classList.toggle('expanded', open);
  const button = player.querySelector<HTMLElement>('[data-control="expand"]');
  button?.setAttribute('aria-label', open ? 'Close full-screen player' : 'Open full-screen player');
  button?.setAttribute('aria-expanded', String(open));
  button?.querySelector('i')?.classList.toggle('fa-chevron-up', !open);
  button?.querySelector('i')?.classList.toggle('fa-chevron-down', open);
  // The marquee box changed width: rebuild it so the loop has no gap.
  const track = document.querySelector<HTMLElement>('[data-marquee]');
  if (track) delete track.dataset.key;
  render();
  if (open) scrollQueueToActive();
}

function scrollQueueToActive() {
  const list = document.querySelector<HTMLElement>('[data-queue] .section.open .list');
  if (!list) return;
  const row = list.querySelector<HTMLElement>('.row.active');
  if (row) list.scrollTop = row.offsetTop - list.clientHeight / 2 + row.offsetHeight / 2;
  fadeEdges(list);
}

/** While expanded, a sidebar link shows that page's speaker or genre in its section. */
function followPage() {
  if (!expanded) return;
  const page = document.querySelector<HTMLElement>('[data-page] [data-collection]');
  const slug = page?.dataset.collection;
  if (page?.dataset.kind === 'music' && slug && Object.hasOwn(music, slug)) {
    musicTarget = slug;
    openSection = 'music';
  } else if (slug && Object.hasOwn(speakers, slug)) {
    lectureTarget = slug;
    openSection = 'lecture';
  } else {
    lectureTarget = null;
    musicTarget = null;
  }
}

const queueEl = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** Rows with the same attributes as the page's list (Songs.astro), so activate() and render() handle them. */
function queueList(kind: 'lecture' | 'music', slug: string) {
  const collection = kind === 'lecture' ? speakers[slug] : music[slug];
  const entries = Object.entries(collection.videos);
  const list = queueEl('div', 'list');
  list.dataset.collection = slug;
  list.dataset.kind = kind;
  if (!entries.length) list.append(queueEl('div', 'row empty', kind === 'lecture' ? 'No lectures yet.' : 'No tracks yet.'));
  entries.forEach(([id, title], i) => {
    const row = queueEl('div', 'row');
    row.dataset.play = id;
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    const playingIcon = queueEl('i', 'fa fa-volume-up now');
    playingIcon.setAttribute('aria-hidden', 'true');
    row.append(queueEl('span', 'num', String(i + 1)), playingIcon, queueEl('span', 'title', title));
    if (Object.hasOwn(durations, id)) row.append(queueEl('span', 'length', formatDuration(durations[id])));
    list.append(row);
  });
  list.addEventListener('scroll', () => fadeEdges(list), { passive: true });
  return list;
}

/** A section's header: a button that opens it (and collapses the other). */
function queueHead(section: 'lecture' | 'music', image: HTMLElement, label: string, name: string, count: string) {
  const head = queueEl('button', 'header');
  head.type = 'button';
  head.dataset.queueSection = section;
  head.setAttribute('aria-expanded', String(openSection === section));
  const text = queueEl('div', 'text');
  text.append(queueEl('span', 'label', label), queueEl('span', 'name', name), queueEl('span', 'count', count));
  const chevron = queueEl('i', 'fa fa-chevron-down chevron');
  chevron.setAttribute('aria-hidden', 'true');
  head.append(image, text, chevron);
  return head;
}

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

/** Open/collapse the two sections without rebuilding them (animated in Player.scss). */
function applyOpenSection(queue: HTMLElement) {
  if (queue.dataset.open === openSection) return;
  queue.dataset.open = openSection;
  queue.querySelectorAll<HTMLElement>('section.section').forEach((section) => {
    const open = section.dataset.section === openSection;
    section.classList.toggle('open', open);
    section.querySelector('button.header')?.setAttribute('aria-expanded', String(open));
    // Keep the collapsed list out of the tab order.
    section.querySelector<HTMLElement>('div.body')?.toggleAttribute('inert', !open);
  });
  const list = queue.querySelector<HTMLElement>('section.open .list');
  if (list) fadeEdges(list);
}

function renderQueue() {
  const queue = document.querySelector<HTMLElement>('[data-queue]');
  if (!queue) return;
  queue.hidden = !expanded;
  if (!expanded) return;

  const speakerSlug = lectureTarget ?? state.speaker;
  const genreSlug = musicTarget ?? state.genre;
  const speaker = speakers[speakerSlug];
  const genre = music[genreSlug];
  // Rebuild only when the content changes (not on play/pause or switching sections),
  // so scrolling is kept and the open/close animation can run.
  const key = [
    speakerSlug,
    genreSlug,
    state.genre,
    ...Object.entries(speaker.videos).flat(),
    ...Object.entries(genre.videos).flat(),
  ].join('\u0001');
  if (queue.dataset.key === key) {
    applyOpenSection(queue);
    return;
  }
  const previousScroll: Record<string, number> = {};
  queue.querySelectorAll<HTMLElement>('.list').forEach((list) => {
    previousScroll[`${list.dataset.kind}/${list.dataset.collection}`] = list.scrollTop;
  });
  queue.dataset.key = key;
  delete queue.dataset.open; // Re-applied below to the new elements.

  const section = (name: 'lecture' | 'music', head: HTMLElement, ...body: HTMLElement[]) => {
    const el = queueEl('section', `section ${name === 'lecture' ? 'lectures' : 'music'}`);
    el.dataset.section = name;
    const wrap = queueEl('div', 'body');
    wrap.append(...body);
    el.append(head, wrap);
    return el;
  };

  // Lectures.
  const lectureImage = queueEl('div', 'image');
  if (speaker.image) lectureImage.style.backgroundImage = `url(${asset(speaker.image)})`;
  else lectureImage.append(queueEl('i', 'fa fa-microphone'));
  const lectures = section(
    'lecture',
    queueHead('lecture', lectureImage, 'Lectures', speaker.name, plural(Object.keys(speaker.videos).length, 'lecture')),
    queueList('lecture', speakerSlug),
  );

  // Music: genre buttons, then that genre's tracks.
  const musicImage = queueEl('div', 'image icon');
  musicImage.append(queueEl('i', 'fa fa-music'));
  const genres = queueEl('div', 'genres');
  for (const [slug, g] of Object.entries(music)) {
    if (!hasVideos(g)) continue;
    const chip = queueEl('button', `genre${slug === genreSlug ? ' selected' : ''}${slug === state.genre ? ' playing' : ''}`, g.name);
    chip.type = 'button';
    chip.dataset.queueGenre = slug;
    chip.setAttribute('aria-pressed', String(slug === genreSlug));
    if (slug === state.genre) chip.title = 'Playing now';
    genres.append(chip);
  }
  const musicSection = section(
    'music',
    queueHead('music', musicImage, 'Music', genre.name, plural(Object.keys(genre.videos).length, 'track')),
    genres,
    queueList('music', genreSlug),
  );

  queue.replaceChildren(lectures, musicSection);
  applyOpenSection(queue);
  queue.querySelectorAll<HTMLElement>('.list').forEach((list) => {
    const previous = previousScroll[`${list.dataset.kind}/${list.dataset.collection}`];
    if (previous !== undefined) list.scrollTop = previous;
  });
  if (Object.keys(previousScroll).length === 0) requestAnimationFrame(scrollQueueToActive);
  queue.querySelectorAll<HTMLElement>('.list').forEach(fadeEdges);
}

/** Fade the list's top/bottom edge only when there's more to scroll to that way. */
function fadeEdges(list: HTMLElement) {
  list.classList.toggle('fade-top', list.scrollTop > 1);
  list.classList.toggle('fade-bottom', list.scrollTop + list.clientHeight < list.scrollHeight - 1);
}

/** Sidebar: mark the link of the page you're on (the sidebar persists across navigation). */
function markActiveLink() {
  const path = location.pathname.replace(/\/?$/, '/');
  document.querySelectorAll<HTMLAnchorElement>('[data-nav-link]').forEach((link) => {
    const active = link.getAttribute('href') === path;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

/** Show "Read more" only for bios that are actually cut off by the line clamp. */
function setupBioToggles() {
  document.querySelectorAll<HTMLElement>('[data-page] .about').forEach((about) => {
    const text = about.querySelector<HTMLElement>('p');
    const toggle = about.querySelector<HTMLElement>('[data-bio-toggle]');
    if (text && toggle) toggle.hidden = text.scrollHeight <= text.clientHeight + 1;
  });
}

/**
 * Speaker page books: one row with no scrollbar. Only as many whole books as fit are
 * shown; the arrows switch to the previous/next set and only show when there is one.
 */
function updateBookPagers() {
  document.querySelectorAll<HTMLElement>('[data-page] [data-books]').forEach((section) => {
    const row = section.querySelector<HTMLElement>('.books');
    const books = Array.from(section.querySelectorAll<HTMLElement>('.book'));
    if (!row || !books.length) return;
    books.forEach((book) => (book.hidden = false));
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const step = books[0].offsetWidth + gap;
    const perPage = Math.max(1, Math.floor((row.clientWidth + gap) / step));
    const pages = Math.ceil(books.length / perPage);
    const page = Math.min(Number(section.dataset.booksPageIndex ?? 0), pages - 1);
    section.dataset.booksPageIndex = String(page);
    books.forEach((book, i) => (book.hidden = Math.floor(i / perPage) !== page));
    const prev = section.querySelector<HTMLElement>('[data-books-page="-1"]');
    const next = section.querySelector<HTMLElement>('[data-books-page="1"]');
    if (prev) prev.hidden = page === 0;
    if (next) next.hidden = page >= pages - 1;
  });
}

function pageBooks(button: HTMLElement) {
  const section = button.closest<HTMLElement>('[data-books]');
  if (!section) return;
  section.dataset.booksPageIndex = String(Number(section.dataset.booksPageIndex ?? 0) + Number(button.dataset.booksPage));
  updateBookPagers();
}

/** Book covers are shuffled on every view, like the React app did. */
function shuffleBooks() {
  document.querySelectorAll<HTMLElement>('[data-shuffle]').forEach((list) => {
    const items = Array.from(list.children);
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    items.forEach((item, i) => {
      (item as HTMLElement).style.animationDelay = `${i * 100}ms`;
      list.append(item);
    });
  });
}

// --- Playback ---------------------------------------------------------------

function setVideo(player: YTPlayer | null, id: string, autoplay: boolean) {
  if (!player) return; // Not ready yet; onReady cues the current state.
  if (autoplay) player.loadVideoById(id);
  else player.cueVideoById(id);
}

function play() {
  playing = true;
  lecturePlayer?.playVideo();
  musicPlayer?.playVideo();
  render();
}

function pause() {
  playing = false;
  lecturePlayer?.pauseVideo();
  musicPlayer?.pauseVideo();
  render();
}

/**
 * While a new lecture is loading, YouTube can report PAUSED for the outgoing video.
 * Ignore that (until the new one plays, or this timeout) so prev/next/autoplay don't
 * pause everything, including the music.
 */
const SWITCH_GRACE_MS = 5000;
let switchingUntil = 0;
/** Direction of the last prev/next, so unavailable videos are skipped the same way. */
let direction = 1;
/** Consecutive unavailable videos, to stop if a whole list is gone. */
let lectureErrors = 0;
let musicErrors = 0;

function playLecture(speaker: string, id: string, autoplay = true) {
  state.speaker = speaker;
  state.lecture = id;
  if (autoplay) switchingUntil = Date.now() + SWITCH_GRACE_MS;
  setVideo(lecturePlayer, id, autoplay);
  if (autoplay) {
    playing = true;
    musicPlayer?.playVideo();
  }
  render();
}

function playMusic(genre: string, id: string, autoplay = true) {
  state.genre = genre;
  state.music = id;
  setVideo(musicPlayer, id, autoplay);
  render();
}

/** Videos YouTube refused to play this session (removed, private, embedding disabled). */
const unavailable = new Set<string>();

/** Next/previous video in the list, skipping ones already known to be unavailable. */
function step<T extends { videos: Record<string, string> }>(collection: T, current: string, by: number) {
  const keys = Object.keys(collection.videos);
  let index = keys.indexOf(current);
  for (let i = 0; i < keys.length; i++) {
    index = (index + by + keys.length) % keys.length;
    if (!unavailable.has(keys[index])) return keys[index];
  }
  return keys[(keys.indexOf(current) + by + keys.length) % keys.length]; // All unavailable.
}

/** Prev/next always continue playing: the new lecture starts and the music keeps going. */
function skip(by: number) {
  direction = by;
  playLecture(state.speaker, step(speakers[state.speaker], state.lecture, by), true);
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function random() {
  const speaker = pick(Object.keys(speakers).filter((key) => hasVideos(speakers[key])));
  const genre = pick(Object.keys(music).filter((key) => hasVideos(music[key])));
  playMusic(genre, pick(Object.keys(music[genre].videos)), playing);
  playLecture(speaker, pick(Object.keys(speakers[speaker].videos)), playing);
  // The React app returned to the home view; the hash is re-applied on page load.
  if (location.pathname !== '/') navigate('/');
}

// --- Progress and volume (desktop bar) ---------------------------------------

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Range inputs show their filled part through --p (see Player.scss). */
function setFill(input: HTMLInputElement) {
  const max = Number(input.max) || 100;
  input.style.setProperty('--p', `${(Number(input.value) / max) * 100}%`);
}

/** True while the user drags the seek bar, so polling doesn't fight the drag. */
let seeking = false;

function updateProgress() {
  const seek = document.querySelector<HTMLInputElement>('[data-seek]');
  if (!seek || seeking || !lecturePlayer?.getDuration) return;
  const duration = lecturePlayer.getDuration() || 0;
  const current = lecturePlayer.getCurrentTime() || 0;
  seek.value = String(duration ? Math.round((current / duration) * 1000) : 0);
  seek.disabled = !duration;
  setFill(seek);
  const cur = document.querySelector('[data-time="current"]');
  const dur = document.querySelector('[data-time="duration"]');
  if (cur) cur.textContent = formatTime(current);
  if (dur) dur.textContent = formatTime(duration);
}

function setupProgressAndVolume() {
  const seek = document.querySelector<HTMLInputElement>('[data-seek]');
  if (seek) {
    const preview = () => {
      const duration = lecturePlayer?.getDuration?.() || 0;
      const cur = document.querySelector('[data-time="current"]');
      if (cur) cur.textContent = formatTime((Number(seek.value) / 1000) * duration);
      setFill(seek);
    };
    seek.addEventListener('input', () => {
      seeking = true;
      preview();
    });
    seek.addEventListener('change', () => {
      const duration = lecturePlayer?.getDuration?.() || 0;
      if (duration) lecturePlayer!.seekTo((Number(seek.value) / 1000) * duration, true);
      seeking = false;
    });
  }
  window.setInterval(updateProgress, 500);

  document.querySelectorAll<HTMLInputElement>('[data-volume]').forEach((input) => {
    const kind = input.dataset.volume as 'lecture' | 'music';
    input.value = String(volume[kind]);
    setFill(input);
    input.addEventListener('input', () => {
      volume[kind] = Number(input.value);
      setFill(input);
      // Moving the slider unmutes, like most players.
      if (kind === 'lecture') volume.lectureMuted = false;
      else volume.musicMuted = false;
      applyVolume(kind);
      saveVolume();
    });
  });
  renderVolume();
}

function applyVolume(kind: 'lecture' | 'music') {
  const player = kind === 'lecture' ? lecturePlayer : musicPlayer;
  const muted = kind === 'lecture' ? volume.lectureMuted : volume.musicMuted;
  player?.setVolume(muted ? 0 : volume[kind]);
  renderVolume();
}

function toggleMute(kind: 'lecture' | 'music') {
  if (kind === 'lecture') volume.lectureMuted = !volume.lectureMuted;
  else volume.musicMuted = !volume.musicMuted;
  applyVolume(kind);
}

function renderVolume() {
  for (const kind of ['lecture', 'music'] as const) {
    const muted = (kind === 'lecture' ? volume.lectureMuted : volume.musicMuted) || volume[kind] === 0;
    const button = document.querySelector<HTMLElement>(`[data-mute="${kind}"]`);
    button?.classList.toggle('muted', muted);
    button?.setAttribute('aria-label', `${muted ? 'Unmute' : 'Mute'} ${kind}`);
    button?.setAttribute('title', `${muted ? 'Unmute' : 'Mute'} ${kind}`);
    button?.querySelector('i')?.classList.toggle('fa-volume-up', !muted);
    button?.querySelector('i')?.classList.toggle('fa-volume-off', muted);
    document.querySelector(`[data-volume="${kind}"]`)?.closest('.level')?.classList.toggle('muted', muted);
  }
}

// --- YouTube setup ----------------------------------------------------------

function createPlayers(YT: YTNamespace) {
  const playerVars = { playsinline: 1, rel: 0 };

  lecturePlayer = new YT.Player(isMobile ? 'mobile-video' : 'speaker-video', {
    videoId: state.lecture,
    playerVars,
    events: {
      onReady: (e) => {
        e.target.setVolume(volume.lecture);
        if (playing) e.target.playVideo();
      },
      onStateChange: (e) => {
        // Keep the controls in sync when the video's own controls (or a tap on mobile) are used.
        if (e.data === YT.PlayerState.PLAYING) {
          switchingUntil = 0;
          lectureErrors = 0;
          if (!playing) {
            playing = true;
            musicPlayer?.playVideo();
            render();
          }
        } else if (e.data === YT.PlayerState.PAUSED && playing) {
          if (Date.now() < switchingUntil) return; // Outgoing video during a switch.
          pause();
        } else if (e.data === YT.PlayerState.ENDED) {
          skip(1);
        }
      },
      // Many old videos have been removed from YouTube; skip past them.
      onError: () => {
        unavailable.add(state.lecture);
        render();
        const count = Object.keys(speakers[state.speaker].videos).length;
        if (++lectureErrors >= count) return;
        playLecture(state.speaker, step(speakers[state.speaker], state.lecture, direction), playing);
      },
    },
  });

  musicPlayer = new YT.Player('music-video', {
    videoId: state.music,
    playerVars,
    events: {
      onReady: (e) => {
        e.target.setVolume(volume.music);
        if (playing) e.target.playVideo();
      },
      onStateChange: (e) => {
        if (e.data === YT.PlayerState.PLAYING) musicErrors = 0;
        if (e.data === YT.PlayerState.ENDED) {
          playMusic(state.genre, step(music[state.genre], state.music, 1), true);
        }
      },
      onError: () => {
        unavailable.add(state.music);
        render();
        const count = Object.keys(music[state.genre].videos).length;
        if (++musicErrors >= count) return;
        playMusic(state.genre, step(music[state.genre], state.music, 1), playing);
      },
    },
  });
}

function loadYouTube() {
  if (window.YT?.Player) return createPlayers(window.YT);
  window.onYouTubeIframeAPIReady = () => createPlayers(window.YT!);
  const script = document.createElement('script');
  script.src = 'https://www.youtube.com/iframe_api';
  script.async = true;
  document.head.append(script);
}

// --- Navigation -------------------------------------------------------------

/**
 * Replace only the page content ([data-page]) on navigation. The default swap
 * re-parents persisted elements, which reloads iframes in browsers without
 * Element.moveBefore() and would stop playback.
 */
function installSwap() {
  document.addEventListener('astro:before-swap', (event) => {
    const next = event.newDocument.querySelector('[data-page]');
    const current = document.querySelector('[data-page]');
    if (!next || !current) return; // Fall back to Astro's default swap.
    event.swap = () => {
      swapFunctions.deselectScripts(event.newDocument);
      swapFunctions.swapRootAttributes(event.newDocument);
      swapFunctions.swapHeadElements(event.newDocument);
      current.replaceWith(document.adoptNode(next));
    };
  });

  document.addEventListener('astro:page-load', () => {
    shuffleBooks();
    markActiveLink();
    setupBioToggles();
    updateBookPagers();
    followPage();
    render();
  });
}

// --- Events -----------------------------------------------------------------

function activate(target: HTMLElement) {
  // Edit-mode controls (see src/lib/editor.ts) live inside rows; they must not play.
  if (target.closest('[data-editor]')) return false;

  // Home page tile play button: start that speaker's first lecture, or play/pause if
  // it's already the current speaker.
  const tilePlay = target.closest<HTMLElement>('[data-play-speaker]')?.dataset.playSpeaker;
  if (tilePlay && hasVideos(speakers[tilePlay])) {
    if (tilePlay === state.speaker) playing ? pause() : play();
    else {
      direction = 1;
      playLecture(tilePlay, firstVideo(speakers[tilePlay]));
    }
    return true;
  }

  // Speaker page header: a random lecture from this speaker (not the current one).
  const shuffleSlug = target.closest<HTMLElement>('[data-shuffle-speaker]')?.dataset.shuffleSpeaker;
  if (shuffleSlug && hasVideos(speakers[shuffleSlug])) {
    const ids = Object.keys(speakers[shuffleSlug].videos).filter((id) => id !== state.lecture && !unavailable.has(id));
    direction = 1;
    playLecture(shuffleSlug, ids.length ? pick(ids) : firstVideo(speakers[shuffleSlug]));
    return true;
  }

  // Speaker page header: full screen, listing this page's speaker.
  if (target.closest('[data-expand-page]')) {
    if (!expanded) setExpanded(true);
    followPage();
    render();
    return true;
  }

  const mute = target.closest<HTMLElement>('[data-mute]')?.dataset.mute;
  if (mute === 'lecture' || mute === 'music') {
    toggleMute(mute);
    return true;
  }

  // Full-screen list: open a section (the other collapses), or browse a genre.
  const section = target.closest<HTMLElement>('[data-queue-section]')?.dataset.queueSection;
  if (section === 'lecture' || section === 'music') {
    openSection = section;
    render();
    return true;
  }
  const queueGenre = target.closest<HTMLElement>('[data-queue-genre]')?.dataset.queueGenre;
  if (queueGenre && Object.hasOwn(music, queueGenre)) {
    musicTarget = queueGenre;
    render();
    return true;
  }

  const booksPage = target.closest<HTMLElement>('[data-books-page]');
  if (booksPage) {
    pageBooks(booksPage);
    return true;
  }

  // Speaker page bio: "Read more" / "Show less".
  const bioToggle = target.closest<HTMLElement>('[data-bio-toggle]');
  if (bioToggle) {
    const open = bioToggle.closest('.about')!.classList.toggle('open');
    bioToggle.textContent = open ? 'Show less' : 'Read more';
    bioToggle.setAttribute('aria-expanded', String(open));
    return true;
  }

  const row = target.closest<HTMLElement>('[data-play]');
  if (row) {
    const list = row.closest<HTMLElement>('[data-collection]');
    const collection = list?.dataset.collection;
    const id = row.dataset.play!;
    if (!collection) return;
    direction = 1; // If this one is unavailable, continue forward through the list.
    if (list!.dataset.kind === 'lecture') playLecture(collection, id);
    else {
      playMusic(collection, id);
      if (!playing) play();
    }
    return true;
  }

  const control = target.closest<HTMLElement>('[data-control]')?.dataset.control;
  if (control === 'toggle') playing ? pause() : play();
  else if (control === 'prev') skip(-1);
  else if (control === 'next') skip(1);
  else if (control === 'expand') setExpanded(!expanded);
  else if (target.closest('[data-random]')) random();
  else return false;
  return true;
}

document.addEventListener('click', (e) => {
  if (!(e.target instanceof HTMLElement)) return;
  // The sidebar's title and Home link close the full-screen player; the router then
  // navigates home as usual (only [data-page] is swapped, so playback continues).
  if (expanded && e.target.closest('.Sidebar a[href="/"]')) setExpanded(false);
  activate(e.target);
});

// Edit mode changed the in-memory content without a reload (see src/lib/editor.ts):
// refresh the marquee, thumbnails' titles and active/unavailable rows.
document.addEventListener('content:changed', () => render());

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && expanded && !(e.target instanceof HTMLElement && e.target.closest('[data-editor]'))) {
    setExpanded(false);
    return;
  }
  if ((e.key === 'Enter' || e.key === ' ') && e.target instanceof HTMLElement && e.target.matches('[data-play], [data-control]')) {
    e.preventDefault();
    activate(e.target);
  }
});

window.addEventListener('resize', updateBookPagers, { passive: true });

installSwap();
setupProgressAndVolume();
loadYouTube();
