// Whether the visitor got to the current page by moving around inside the site (as opposed to
// landing on it from a link elsewhere). The Back link uses this: inside the site it steps back
// through the browser history, which returns to the same spot in the list they came from.

export const trail = $state({ inSite: false });
