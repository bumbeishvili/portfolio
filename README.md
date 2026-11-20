# davidb.dev

Personal portfolio, built with [SvelteKit](https://svelte.dev/docs/kit) (v2) and Svelte 5. Every page is
prerendered to static HTML and served by Cloudflare.

Live URL: https://davidb.dev

## Run it

```
npm install
npm run dev        # http://localhost:3002, reloads as you edit
npm run build      # writes the static site to build/
npm run preview    # serves build/ the way it will be deployed
```

Needs Node 20.19+ or 22.12+.

## Where things are

```
src/content/          the content: one markdown file per project / post / page
src/lib/site.js       site title, menu, social links, and the featured projects for the home page
src/lib/components/   header, footer, project grid, post grid, page layouts
src/lib/client/       browser-only behaviour: masonry grids, gallery lightbox, content enhancements
src/lib/server/       reads the markdown files and renders them (build time only)
src/lib/styles/       the stylesheet (SCSS); colours and font sizes are in _variables.scss
src/routes/           one folder per URL
static/               files served as-is: images/, fonts/, robots.txt, the legacy /old/ page
wrangler.jsonc        how the site is published on Cloudflare; cloudflare/ holds its two small scripts
tools/                scripts that record clips, build the project pages and check the site (tools/README.md)
```

Only `tools/gh/hidden-assets.js` is part of the build: it runs before every `npm run build` and needs no
packages. The rest of `tools/` is for maintaining the content. The previous Jekyll site is in the
repository's history, up to the commit before the SvelteKit one.

## Adding a project

1. Put the thumbnail video and any images in `static/images/projects/<name>/`.
2. Add a markdown file to `src/content/projects/` (2D) or `src/content/gl/` (3D), named
   `YYYY-MM-DD-my-project.md`:

   ```
   ---
   title: "My project"
   subtitle: "d3.js, svelte"
   description: Short description for search engines and link previews
   featured_image: "/images/projects/my-project/thumbnail.mp4"
   ---

   Text in markdown, plus any HTML you like.

   <div class="gallery" data-columns="3">
   	<img src="/images/projects/my-project/1.png">
   	<img src="/images/projects/my-project/2.png">
   </div>
   ```

The part of the file name after the date becomes the URL (`/project/my-project` or `/gl/my-project`).
The date only decides the order: cards are sorted newest date first, so change the date to move a card.

The same goes for `src/content/posts/` (blog, `/blog/...`) and `src/content/notable-collaborations/`.

### Projects shown only on the All tab

Files in `src/content/more/` are the rest of the projects: older client work, side projects and tools.
They get a page at `/project/...` like the 2D ones, but are listed only on the All tab, after the other
projects of the same year.

### Thumbnails and columns

A card thumbnail is a short muted clip (`thumbnail.mp4`, about 560px wide) or a still image. The card
grids have two columns and gain one more each time a thumbnail would be drawn wider than 500px, so
thumbnails never grow past that (the `columns-by-thumbnail` mixin in
[src/lib/styles/_mixins.scss](src/lib/styles/_mixins.scss)). A project page usually opens with a larger
clip of the same interaction (`video.mp4`), with a `poster` image.

### Tags

Give a project tags with `tags: [d3, map, dashboard]` in its front matter. They show under its title, and
the row of tags above the All tab filters the list: `/all/map/` shows only the projects tagged `map`.
Each tag shows how many projects it has, and All shows the total.
Shift-click a tag to combine it with the ones already selected: `/all/?tags=d3,map` shows the projects that
have either. One tag has a built page of its own; a combination is filtered in the browser.
A new tag appears in that row as soon as one project uses it. The row shows the eight most used tags; the rest
open with the "Search and more tags" button, which also opens the search box.

### Search

The search box (behind the "Search and more tags" button on the All tab) narrows the list as you type: every word has to appear in a project's
title, technologies (`subtitle`), tags, `description` or year, or in the text of its page (`/search.json`,
fetched when the box is first used). It works together with the tags, and the
text comes back when you return from a project.

### Years

The All tab is grouped under year dividers, most recent first (the current year's projects come first,
without a divider). Every project states its year with
`year: 2024` in the front matter (the date in the file name only decides the order within a year and
on the 2D / 3D tabs). A project without a `year` ends up in an "Undated" group at the bottom.

### The home page

The home page shows a hand-picked set of projects. The list, in display order, is `featured` in
[src/lib/site.js](src/lib/site.js). The 2D and 3D tabs list every project of their kind; All lists both plus
the notable collaborations and the blog posts named in `postsInAll` in the same file.

### Layouts

A file can pick its page layout with `layout:` in the front matter:

| layout    | what it renders                                   | default for                        |
| --------- | ------------------------------------------------- | ---------------------------------- |
| `project` | title + subtitle, then the content                | projects, 3D projects              |
| `post`    | title, then the content                           | blog posts, notable collaborations |
| `page`    | title + subtitle, then the content                | pages (`/about`)                   |
| `tool`    | only the content, full width                      | (interactive tool posts)           |

## What search engines see

Every page gets a title, a description, a canonical address, link-preview tags and structured data
from its front matter:

- `title` becomes the page title ("Title – David B.").
- `description` is the text under the link in search results. Keep it to one plain sentence of at
  most 160 characters; anything longer is cut off.
- The link-preview picture is the first still image on the page (thumbnails are mostly videos,
  which previews cannot show), or `shareImage` from [src/lib/site.js](src/lib/site.js). The `poster`
  of a `<video>` on the page counts as a still image.
- Pictures without alternative text get the page title as theirs.

The home page's title and description are in [src/lib/site.js](src/lib/site.js); the list pages'
are in their `+page.server.js` files.

## Feeds

Generated at build time from the same content ([src/lib/server/feeds.js](src/lib/server/feeds.js)):

- `/projects.xml`: RSS feed of the projects (everything on the All tab, home-page picks first)
- `/projects.json`: the same projects as structured data: type, technologies, description, links
- `/feed.xml`: RSS feed of the blog
- `/llms.txt`: a short markdown index of the whole site for AI agents ([llmstxt.org](https://llmstxt.org))
- `/llms-full.txt`: the text of every page in one file
- `/sitemap.xml`

Every project and post page also carries a schema.org description (JSON-LD) in its `<head>`
([src/lib/server/structured-data.js](src/lib/server/structured-data.js)).

All of these are only as good as the front matter: `description` is the one-line summary crawlers and
AI assistants quote (and the page's meta description), and `subtitle` is read as the list of technologies.
When a description is missing or only a word or two, the first sentence of the page is used instead.

## Deploying

The site is served by Cloudflare as static files:

```
npm run build
npx wrangler deploy        # needs `npx wrangler login` once
```

`wrangler.jsonc` sends every request for davidb.dev to the published files, and `cloudflare/site.js`
answers requests for a part of a video, which Safari needs. Cloudflare takes no file over 25 MB.
More in [tools/README.md](tools/README.md), under Publishing.

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) can still publish `build/` to GitHub Pages
on a push to the `gh-pages` branch, if the repository's Pages source is set to GitHub Actions. It is not
used while the site is on Cloudflare.

## Notes

- The markdown renderer ([src/lib/server/markdown.js](src/lib/server/markdown.js)) is set up to behave like
  kramdown, which the content was originally written for, so existing pages render exactly as before.
- `outlayer` (a dependency of the masonry grid) is pinned to 2.1.0 in `package.json`. That version places
  cards on whole pixels, matching the previous site.
- The build log lists dead links and missing images it finds inside the content (as warnings).
- A page with `hidden: true` in its front matter is left out of the site, with its pictures and clips.
