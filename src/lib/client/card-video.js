// The clip on a project card. The card first shows a still of the clip's first frame (a plain
// <img>, so it loads fast and search engines see a picture with a description). The clip itself is
// fetched when the card is about to come into view, plays while at least half of it is on screen
// and pauses when it leaves, so a page of a hundred cards neither downloads nor plays a hundred
// videos. Only a handful play at the same time (see `limit`). Visitors who have asked their
// device for less motion get the stills only.

/** Fetches a clip a little before its card is on screen. */
let near;
/** Plays a clip while at least half of its card is on screen. */
let visible;
/** The address of each clip, kept until its card is first seen. */
const sources = new WeakMap();
/** The clips at least half on screen right now. */
const wanted = new Set();

// How many clips play at the same time. A phone screen can show a dozen small cards at once, and
// decoding that many videos together keeps a phone busy for seconds; the rest show their still
// until a playing one scrolls away.
const limit = () => (typeof innerWidth === 'number' && innerWidth < 700 ? 6 : 12);

/** Plays the topmost wanted clips, up to the limit, and pauses every other one. */
function arrange() {
	const order = [...wanted].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
	order.forEach((video, index) => {
		if (index < limit()) {
			if (!video.getAttribute('src')) video.src = sources.get(video);
			if (video.paused) video.play().catch(() => {});
		} else if (!video.paused) {
			video.pause();
		}
	});
}

const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function watch(video) {
	near ??= new IntersectionObserver(
		(entries) => {
			for (const { target, isIntersecting } of entries) {
				if (!isIntersecting || target.getAttribute('src')) continue;
				target.preload = 'metadata';
				target.src = sources.get(target);
			}
		},
		{ rootMargin: '300px 0px' }
	);
	visible ??= new IntersectionObserver(
		(entries) => {
			for (const { target, intersectionRatio } of entries) {
				if (intersectionRatio >= 0.5) wanted.add(target);
				else {
					wanted.delete(target);
					if (!target.paused) target.pause();
				}
			}
			arrange();
		},
		// told when a card passes the half-way mark, in either direction, and when it leaves
		{ threshold: [0, 0.5] }
	);
	near.observe(video);
	visible.observe(video);
}

// Which copy of the clip a card gets. The phone-size one (480px wide) on a narrow screen, where a
// card is under 200px wide, and on any screen where the card needs no more pixels than that copy
// has (a 300px card on a standard-density monitor). The full one otherwise, so it stays sharp on
// large and high-density screens.
function pick(clip, video) {
	if (!clip.small || typeof innerWidth !== 'number') return clip.src;
	if (innerWidth < 700) return clip.small;
	const width = video.clientWidth || video.parentElement?.clientWidth || 0;
	return width && width * (window.devicePixelRatio || 1) <= 520 ? clip.small : clip.src;
}

/**
 * Svelte action for the <video> of a card.
 * @param {HTMLVideoElement} video
 * @param {{ src: string, small?: string }} clip address of the clip, and of its phone-size copy
 */
export function cardVideo(video, clip) {
	if (calm()) return {};
	const src = pick(clip, video);

	// the clip lies on top of the still and is shown once it is really playing
	const show = () => video.classList.add('is-playing');
	video.addEventListener('playing', show);
	sources.set(video, src);
	watch(video);

	return {
		update(nextClip) {
			const next = pick(nextClip, video);
			sources.set(video, next);
			if (video.getAttribute('src') && video.getAttribute('src') !== next) {
				video.classList.remove('is-playing');
				video.src = next;
			}
		},
		destroy() {
			near?.unobserve(video);
			visible?.unobserve(video);
			wanted.delete(video);
			video.removeEventListener('playing', show);
		}
	};
}
