// Titles and descriptions of the tag pages (/all/<tag>/), as shown in search results.
// A tag is a short label. Here it is written the way people search for it: "d3" is "D3.js",
// "d3.js" is "D3.js", "map" is "interactive map", "pie" is "pie chart". The tags themselves
// stay as they are on the pages.

/** A tag written out, when its label is an abbreviation or has a spelling of its own. */
const names = {
	// technologies
	'd3.js': 'D3.js',
	'three.js': 'Three.js',
	webgl: 'WebGL',
	svelte: 'Svelte',
	react: 'React',
	'react three fiber': 'React Three Fiber',
	typescript: 'TypeScript',
	tailwind: 'Tailwind CSS',
	'node.js': 'Node.js',
	'next.js': 'Next.js',
	python: 'Python',
	mapbox: 'Mapbox',
	gsap: 'GSAP',
	figma: 'Figma',
	blender: 'Blender',
	supabase: 'Supabase',
	stripe: 'Stripe',
	postgresql: 'PostgreSQL',
	cloudflare: 'Cloudflare',
	aws: 'AWS',
	azure: 'Azure',
	vue: 'Vue',
	angular: 'Angular',
	mediapipe: 'MediaPipe',
	wasm: 'WebAssembly',
	tableau: 'Tableau',
	ffmpeg: 'FFmpeg',
	webrtc: 'WebRTC',
	svg: 'SVG',
	// kinds of chart and of work
	map: 'interactive map',
	tree: 'tree diagram',
	network: 'network graph',
	pie: 'pie chart',
	radar: 'radar chart',
	rose: 'rose chart',
	chord: 'chord diagram',
	calendar: 'calendar chart',
	trendline: 'trend line',
	hierarchy: 'hierarchy chart',
	configurator: 'product configurator',
	storytelling: 'data storytelling',
	particles: 'particle animation',
	shaders: 'shader',
	sankey: 'Sankey diagram',
	// everything else
	'3d': '3D',
	'3d modeling': '3D modeling',
	'3d rendering': '3D rendering',
	'3d animation': '3D animation',
	drag: 'drag interaction',
	embed: 'embeddable',
	ai: 'AI',
	cms: 'CMS',
	saas: 'SaaS',
	'api integration': 'API integration',
	auth: 'authentication',
	letf: 'leveraged ETF',
	webby: 'Webby Award',
	wysiwyg: 'WYSIWYG editor',
	baking: 'texture baking',
	'cron jobs': 'cron job'
};

/** Tags that name a technology: "19 projects built with Three.js". */
const technologies = new Set([
	'd3.js', 'three.js', 'webgl', 'svelte', 'react', 'react three fiber', 'typescript', 'tailwind', 'node.js', 'next.js', 'python', 'mapbox',
	'deck.gl', 'gsap', 'canvas', 'figma', 'blender', 'supabase', 'stripe', 'postgresql', 'cloudflare', 'aws', 'azure', 'vue',
	'angular', 'mediapipe', 'wasm', 'tableau', 'ffmpeg', 'webrtc', 'svg'
]);

/** Tags that name a kind of chart or of work, which people look up as examples: "org chart examples". */
const examples = new Set([
	'chart', 'map', 'dashboard', 'org chart', 'tree', 'sankey', 'globe', 'network', 'timeline', 'diagram', 'bubble chart',
	'treemap', 'pie', 'radar', 'rose', 'chord', 'calendar', 'hex map', 'circle packing', 'mind map', 'trendline', 'class diagram',
	'data table', 'hierarchy', 'configurator', 'game', 'scrollytelling', 'storytelling', 'particles', 'shaders', 'animation',
	'virtual tour', 'simulation'
]);

// small numbers are written out, the way a person would
const words = [, 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];

// names that keep their small first letter at the start of a title
const small = new Set(['deck.gl']);
const capital = (text) => (small.has(text) ? text : text.charAt(0).toUpperCase() + text.slice(1));

/**
 * The title and description of a tag page: `{ title, description }`.
 * "Org chart examples" / "5 org chart examples, including A and B."
 * `projects` are the cards on the page, in the order they are shown.
 */
export function tagMeta(tag, projects) {
	const name = names[tag.name] ?? tag.name;
	const kind = technologies.has(tag.name) ? 'technology' : examples.has(tag.name) ? 'example' : 'topic';
	const one = projects.length === 1;
	const count = words[projects.length] ?? String(projects.length); // "Five", "12"

	const what =
		kind === 'technology'
			? `${count} ${one ? 'project' : 'projects'} built with ${name}`
			: kind === 'example'
				? `${count} ${name} ${one ? 'example' : 'examples'}`
				: /^\d/.test(name)
					? `${count} ${one ? 'project' : 'projects'} in ${name}` // "22 projects in 3D", not "22 3D projects"
					: `${count} ${name} ${one ? 'project' : 'projects'}`;

	const [first, second] = projects.map((project) => project.title.replace(/\s+/g, ' ').trim());
	const which = one ? first : projects.length === 2 ? `${first} and ${second}` : `including ${first} and ${second}`;

	return {
		title: `${capital(name)} ${kind === 'example' ? 'examples' : 'projects'}`,
		description: `${what}, ${which}.`
	};
}
