import { rss } from '$lib/server/feeds.js';

export const prerender = true;

export const GET = () => new Response(rss(), { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
