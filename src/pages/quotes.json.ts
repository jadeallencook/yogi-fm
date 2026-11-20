// Static /quotes.json for the full-screen player (fetched on first use; see src/lib/quotes.ts).
import type { APIRoute } from 'astro';
import quotes from '../environments/quotes.environment.json';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(quotes), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
