# dshthemes.com

**Every DeepSeek Harness theme, in its own colours.** One line to wear any of them.

<img src="https://raw.githubusercontent.com/dshworks/dshthemes/main/src/og.png" alt="dshthemes — a fan of dsh themes painted from their own stylesheets" width="720">

Most dsh themes have no screenshot. A gallery of 325 themes where 176 cards
are the same whale placeholder is a gallery of 149. So this site does not wait
for a screenshot: **a theme is a stylesheet, and we read it.** Each theme's
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
| `/` | the gallery: hero that keeps changing its clothes, five shelves that fan open, 325 cards; filter, sort, search on the DOM already there |
| `/t/<slug>/` | one theme: live on the rc.6 shell (39), the repo's screenshot (149), the signature (276); wear / proof / colours / shelf; the "Not" |
| `/shelf/<shelf>/` | one shelf, same cards |
| `/preview/?theme=<slug>` | the vendored rc.6 web shell with the theme's `previewCss` injected — CSS on the real chrome, not a screenshot |
| `/themes.json` · `/llms.txt` · `/sitemap.xml` | the projection, the agent map, the crawl |

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
npm run enrich       # data/enrich.json  <- GitHub: stars, last push, the stylesheet, the palette (incremental; --force, --repalette)
npm run build        # dist/             <- 325 pages, one stylesheet, one script
npm test             # palette parser + springs
node scripts/og.mjs  # src/og.png from dist/og.html (needs a Chromium; the png is committed)
npm run deploy       # Cloudflare Workers, static assets + a nine-line www redirect
```

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
- Every theme page links the exact file. If we read the wrong one, open an
  issue; if the registry sets `previewCss`, that file wins.

Vendored: `src/vendor/` — `@deepseek-ai/dsh-client-ui-*` 0.1.0-rc.6 stylesheets
and marks, MIT, with LICENSE and NOTICE.

Not affiliated with DeepSeek. MIT.
