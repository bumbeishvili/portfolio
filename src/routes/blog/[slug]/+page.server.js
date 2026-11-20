import { entries as all, loadDocument } from '$lib/server/content.js';

export const entries = () => all('posts');

export const load = ({ params }) => loadDocument('posts', params.slug);
