import { entries as all, loadDocument } from '$lib/server/content.js';

export const entries = () => all('notable-collaborations');

export const load = ({ params }) => loadDocument('notable-collaborations', params.slug);
