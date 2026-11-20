import { projectsJson } from '$lib/server/feeds.js';

export const prerender = true;

export const GET = () => new Response(projectsJson(), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
