import { entries as all, loadDocument } from '$lib/server/content.js';

export const entries = () => all('pages', 'page');

export const load = ({ params }) => loadDocument('pages', params.page);
