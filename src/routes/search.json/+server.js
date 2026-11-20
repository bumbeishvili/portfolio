import { searchIndex } from '$lib/server/content.js';

export const prerender = true;

// The text of every project page, by address. The search box on the All tab fetches this the
// first time it is used, so that a search also finds words inside the pages, not only in titles.
export const GET = () => new Response(JSON.stringify(searchIndex()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
