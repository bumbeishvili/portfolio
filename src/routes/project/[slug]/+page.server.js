import { entries as all, loadDocument } from '$lib/server/content.js';

// The 2D projects and the ones shown only on the All tab share the /project/ address.
const collections = ['projects', 'more'];

export const entries = () => all(collections);

export const load = ({ params }) => loadDocument(collections, params.slug);
