# Portfolio tools

Scripts that build the project pages under `src/content/more`, record their clips and screenshots,
and keep dates and tags in step with the code. Run everything from this folder.

```sh
cd tools
npm install                                   # sharp and ffmpeg
export NODE_PATH="$(npm root -g):$(pwd)/node_modules"   # Playwright is installed globally
```

## Tag editor

```sh
node tag-editor/server.js        # then open http://localhost:3003
```

Lists every project with its tags. Tags are added from the dropdown or typed in, removed with ×, and
"Quick tag" switches one tag on or off with a click per project. Nothing on the site changes while
you edit: the list is saved to `tag-editor/tags-edited.json`. To put it on the site:

```sh
node meta/set-tags.js            # shows what would change
node meta/set-tags.js --write    # changes the pages
```

A list set this way is final. `meta/apply-tags.js` no longer adds anything to those projects.

A project made with infogr8 (its page says "in partnership with infogr8" or "Friday experiment at
infogr8") gets the `infogr8` tag by itself, from `meta/apply-tags.js`.

`meta/tag-aliases.json` holds spellings that are always replaced, whoever types them: `d3` becomes
`d3.js`, `r3f` becomes `react three fiber`. Add a line there to rename a tag everywhere.

## Hiding a project

Add `hidden: true` to the page's front matter (for a generated page, `hidden: true` in its entry in
`gh/entries*.js`). The page is then not built, no list, tag, feed or sitemap counts it, and its
pictures and clips are left out of the upload. Remove the line, run `node gh/posters.js` and deploy to bring it back.

This repository is public. If the hidden work is not public yet, also add its page and its image
folder to the root `.gitignore`, as the two hidden projects are now.

## Pages

| Script | What it does |
|---|---|
| `gh/generate.js` | Writes the generated pages and their images. `ENTRIES=./entries2.js node gh/generate.js` for the second list. |
| `gh/posters.js` | Makes what each card shows: the still before its clip plays, a phone-size copy of the clip, a light copy of still-image thumbnails, and `src/lib/server/posters.json`. Run it after `gh/generate.js` or whenever a card clip or thumbnail changes. |
| `gh/hidden-assets.js` | Lists the pictures and clips of hidden projects so they are not published. Runs by itself before every build. |
| `gh/slim-media.js` | Makes heavy GIFs, PNGs and page videos lighter and points the pages at the new files. Originals that are not in git history go to `tools/originals/`. |
| `gh/lighthouse.js` | Runs Lighthouse in Playwright's Chromium on a few pages: `node gh/lighthouse.js https://davidb.dev`. |
| `gh/texts.js` | The wording of every generated page. |
| `gh/lint-text.js` | Flags wording that reads as machine-written. |
| `gh/shots.js` | Which screenshots each page shows. |
| `gh/verify7.js` | Opens every project page on the dev server and reports broken pictures. |

## Clips and screenshots

| Script | What it does |
|---|---|
| `vid/run.js` | Records a clip of a live page from a scenario. `SCENARIOS=./scenario-yff.js OUT=vid/out-sel2 node vid/run.js <slug>` |
| `vid/stills.js` | Replays the scenario without the cursor and keeps the screenshots that differ most. |
| `vid/recorder.js` | The recorder both of them use. |

## Dates and tags

| Script | What it does |
|---|---|
| `meta/dates.js`, `meta/compare.js`, `meta/apply-dates.js` | Read each project's commits and set its year to the last stretch of work. |
| `meta/detect.js` | Reads what each project is built with from its code. |
| `meta/tags.js`, `meta/apply-tags.js` | Tags added per project, with the evidence for each. |
| `meta/set-tags.js` | Applies a list made in the tag editor. |

## Publishing

The site is served by Cloudflare (`wrangler.jsonc` in the repository root). From the repository root:

```sh
npm run build
npx wrangler deploy                      # uploads ./build; only changed files are sent
node tools/gh/verify-live.js https://davidb.dev
```

- `davidb.dev/*` is a Cloudflare route to the Worker `davidb-dev`. The domain's DNS records still
  point at GitHub Pages; the route answers before they are used. Removing the route in the
  Cloudflare dashboard (Workers, `davidb-dev`, Domains & Routes) puts the old site back.
- `cloudflare/site.js` runs only for `.mp4` files. It answers requests for a part of a video, which
  Safari needs and Cloudflare's static file serving does not do.
- `www.davidb.dev` is a second small Worker (`cloudflare/www.wrangler.jsonc`) that redirects to `davidb.dev`.
- Cloudflare takes no file over 25 MB. `find build -type f -size +25M` must list nothing.

## What git takes

This repository is public, so `.gitignore` here lets in only the scripts above. The rest stays on
disk and out of git: recordings and screenshots (`vid/out*`, `shots`), the project lists that name
private client repositories or hidden projects (`gh/entries*.js`, `gh/texts.js`, `gh/shots.js`, `gh/tags.json`,
`meta/tags.js`, `meta/sources.js`, the scenarios in `vid/`), the notes
from choosing projects (`local`, `review`, `jobs`) and the early checks of the SvelteKit move
(`early-checks`).
