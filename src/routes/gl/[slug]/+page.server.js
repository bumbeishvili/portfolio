import { entries as all, loadDocument } from '$lib/server/content.js';

export const entries = () => all('gl');

export const load = ({ params }) => loadDocument('gl', params.slug);
