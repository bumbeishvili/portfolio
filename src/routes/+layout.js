// The whole site is static: every page is rendered to HTML at build time.
export const prerender = true;

// Detail pages have no trailing slash (/project/org-chart). List pages opt in to one
// in their own +page.server.js (/gl/, /blog/), which keeps every URL the same as before.
export const trailingSlash = 'never';
