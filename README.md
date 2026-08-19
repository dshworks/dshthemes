# dshthemes.com

**Every DeepSeek Harness theme, in its own colours.** One line to wear any of them.

<img src="https://raw.githubusercontent.com/dshworks/dshthemes/main/src/og.png" alt="dshthemes — a fan of dsh themes painted from their own stylesheets" width="720">

Most dsh themes have no screenshot. A gallery where half the cards are the same
whale placeholder is not a gallery. So this site does not wait for a
screenshot: **a theme is a stylesheet, and we read it.** Each theme's
`--dsw-*` tokens are resolved against the stock 0.1.0-rc.6 shell and a
dsh-shaped frame is painted from six roles — background, surface, border,
muted, text, brand. Themes that restyle hashed classes directly get their
colour literals ranked and cast instead, and the page says which. Themes with
no colours in code stay grey and say so. Nothing is invented.

It is a **reader** of [dshworks/awesome-dsh-themes](https://github.com/dshworks/awesome-dsh-themes)
— the registry where every `verified` row names the file it was verified from —
never a second source of truth.

| Surface | What it is |
| --- | --- |
| `/` | the gallery: hero that keeps changing its clothes, five shelves that fan open, a card per theme; filter, sort, search on the DOM already there |
| `/t/<slug>/` | one theme: live on the rc.6 shell, the repo's screenshot, the signature; wear / renders / proof / colours / shelf; the "Not" |
| `/shelf/<shelf>/` | one shelf, same cards |
| `/notes/` | dated notes on what changed here and what the registry is doing, plus a "right now" panel read straight from the data. RSS at `/notes/feed.xml` |
| `/preview/?theme=<slug>` | the vendored rc.6 web shell with the theme's own stylesheet injected: CSS on the real chrome, not a screenshot |
| `/themes.json` · `/llms.txt` · `/sitemap.xml` | the projection, the agent map, the crawl |

## Live, and how it is earned

A theme carries the live view only if it passes two gates.

1. **Reach.** Its stylesheet has to set `--dsw-*` tokens, flip a
   `body[data-…]` / `html[data-…]` attribute its plugin would set, or select
   one of the shell's compiled class names. Plenty of themes ship real CSS that
   only styles elements the plugin creates at runtime; injected into a static
   shell those change nothing.
2. **Difference.** `scripts/shots.mjs` opens every candidate at 1440x900 and
   compares it pixel for pixel against the stock shell. Identical means the
   claim is dropped, whatever the stylesheet looked like.

The picture that comparison produces is kept and shipped: `data/shots/*.webp`,
one render of the shell wearing each theme, same frame and same conversation
every time. That is what the cards show.

The rendered stylesheets are frozen into the repo under `data/css/` with their
source URL and fetch date in a header comment, and served from our own origin.
Fetching them from `raw.githubusercontent.com` at read time meant a renamed
branch degraded the page silently for every future reader; now it breaks the
build instead.

The shell stays at 0.1.0-rc.6 on purpose. The token stylesheets are identical
in rc.7, but the chrome's compiled class names are content hashes, and those
strings are what community skins are written against.

## Motion

After [Amicro](https://amicro.vercel.app/): Motion springs — stiffness 600 /
damping 25 for snaps, 400 / 25 for the chip ink, 180 / 20 / mass 0.8 for the
decks — sampled into CSS `linear()` at build time (`scripts/spring.mjs`), so
the site moves like Motion without shipping a runtime. Hover 1.02, press 0.97,
icon swaps that slide, cross-document view transitions from a card to its
stage. Everything stops under `prefers-reduced-motion`.

## Build

```
npm run registry     # data/themes.json  <- awesome-dsh-themes (or --local=../awesome-dsh-themes)
npm run enrich       # data/enrich.json + data/css/ <- GitHub: stars, last push, the stylesheet, the palette, the sheet we render (incremental; --force, --repalette)
npm run build        # dist/             <- a page per theme, one stylesheet, one script
npm run shots        # data/shots/ + data/shots.json <- build, photograph every renderable theme, build again
npm test             # palette parser, CSS extraction, springs
node scripts/og.mjs  # src/og.png from dist/og.html (needs a Chromium; the png is committed)
npm run deploy       # Cloudflare Workers, static assets + a nine-line www redirect
```

`shots.mjs` uses cloakbrowser where it exists and falls back to
`playwright-core` driving the system Chrome, which is what the nightly workflow
runs on.

No framework, no database, no request-time data. `enrich.mjs` costs one tree
listing per repo plus raw fetches (which are free), and refreshes stars every run.

## Where the colours come from, exactly

- `scripts/palette.mjs` parses CSS (and the CSS-in-TS that dsh plugins usually
  ship — `src/client/style.ts`), scopes declarations to dark / light /
  both by selector and `@media`, resolves `var()` chains and `light-dark()`
  against the vendored `design-platform.css`, composites alpha over the
  scheme base, and casts six roles. Loose `{"--dsw-x": "#…"}` and
  `setProperty` forms count too.
- `scripts/enrich.mjs` finds the stylesheet: the registry's `previewCss` if
  set, else the repo tree ranked by name (`theme`, `skin`, `dsw`, `token`, …),
  fetched off `raw.githubusercontent`, scored by `--dsw-` declarations then
  colour literals.
- `scripts/csstext.mjs` decides what can be rendered. Only 59 of the themes we
  can read keep their colours in a `.css` file; the rest are template strings
  inside JavaScript, so the CSS is lifted back out of the code. It never
  synthesises: a theme that builds its palette with `setProperty` in a loop has
  no stylesheet to render, and keeps its painted signature instead.
- Every theme page links the exact file. If we read the wrong one, open an
  issue; if the registry sets `previewCss`, that file wins.

Vendored: `src/vendor/` — `@deepseek-ai/dsh-client-ui-*` 0.1.0-rc.6 stylesheets
and marks, MIT, with LICENSE and NOTICE.

Not affiliated with DeepSeek. MIT.
