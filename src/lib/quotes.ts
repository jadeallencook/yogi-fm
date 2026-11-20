/**
 * Speaker quotes (src/environments/quotes.environment.json, from Wikiquote via
 * `npm run fetch-quotes`; see documentation/data.md). Shown on speaker pages
 * (Songs.astro, built in) and in the full-screen player (player.ts, which fetches
 * /quotes.json on first use so the JSON stays out of the player bundle).
 * Text is CC BY-SA 4.0: always show the "Wikiquote" credit link with a quote.
 */
export interface Quote {
  text: string;
  source: string;
  /** The opening of a longer passage. */
  excerpt?: boolean;
}

export interface SpeakerQuotes {
  /** English Wikiquote page title. */
  page: string;
  quotes: Quote[];
}

export const wikiquoteUrl = (page: string) => `https://en.wikiquote.org/wiki/${encodeURIComponent(page.replace(/ /g, '_'))}`;

export const QUOTES_URL = '/quotes.json';
