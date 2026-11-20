import { entries as all, loadDocument } from '$lib/server/content.js';

export const entries = () => all('talks');

export const load = ({ params }) => loadDocument('talks', params.slug);
