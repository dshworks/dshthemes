---
title: dsh 0.2.0 is latest. Widen your peer range; the tokens held
summary: 0.2.0-rc.2 is npm latest, and dsh refuses a package whose @deepseek-ai/dsh-* peer range excludes it. 95 listed themes carry a 0.1-era caret that does. One token lost its only reader, PDF text selection. The rest held: 403 tokens, none removed, no value changed, and no frozen stylesheet loses a 0.1.7 class it targets.
tags: how-themes-work, dsh-releases
---

npm's `latest` tag for `@deepseek-ai/dsh` is 0.2.0-rc.2, published 2026-09-29
(`npm view @deepseek-ai/dsh dist-tags`). Two things change for a theme author.
The rest held.

## Widen your dsh peer range

dsh refuses to install a package whose `@deepseek-ai/dsh` or
`@deepseek-ai/dsh-*` peer range excludes the running version, prereleases
included
([`plugin-compatibility.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.0-rc.2/packages/boot/app-boot/src/plugin-compatibility.ts#L61-L77)).
A caret on 0.x stops at the minor, so `^0.1.0-rc.6` refuses 0.2.0-rc.2. This
range takes 0.1, 0.2.0-rc.2 and 0.2.1-alpha.1:

```
"@deepseek-ai/dsh-client-ui-theme": "^0.1.0-rc.6 || ^0.2.0-rc.2"
```

Until the author changes it, a user can allow one exact version:
`dsh plugin allow-version <package@version> --dsh-version 0.2.0-rc.2 --accept-risk`.

Counted on 2026-10-05 off each listed theme's own `package.json`, with the
gate's logic and the semver release dsh pins:

| listed third-party themes | count |
|---|---|
| all | 583 |
| with a `package.json` | 537 |
| declaring a dsh peer | 178 |
| refused by 0.2.0-rc.2 | 95 |
| refused by 0.2.1-alpha.1 | 111 |

The 16 between the last two rows pass today and fail on the next release. 8
pin 0.2.0 exactly or stop below 0.2.1. The other 8 carry a `<0.2.0` bound,
which admits 0.2.0-rc.2 only because rc.2 sorts below 0.2.0.

The registry ported the gate on 2026-09-30
([#63](https://github.com/dshworks/awesome-dsh-themes/pull/63)). A new theme it
refuses is rejected with a recheck date; a listed one stays, stamped with the
last version it passed. That day the count was 106. Since then 11 authors have
widened their range and none has narrowed one.

## Set the new selection token

`--dsw-alias-interactive-bg-hover-accent` is still declared, but its only
reader, PDF-preview text selection, now reads
`--dsw-alias-bg-document-selection`
([`PdfBody.module.css`](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.0-rc.2/packages/client/ui-sidebar-documentpreview/src/client/pdf/PdfBody.module.css#L113-L116)),
which defaults to 40% of `--dsw-static-blue-500`
([`design-platform.css`](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.0-rc.2/packages/client/ui-theme/src/styles/design-platform.css#L169)).

Of the 270 stylesheets frozen under `data/css/`, 69 set the old token, and 49
of those set no `--dsw-static-blue-500`, so on 0.2 their PDF selection is
dsh's stock blue. Set both names; 0.1 ignores the new one.

## What held

0.1.7-rc.2 against 0.2.0-rc.2, with the extraction
[`scripts/skin-contract.mjs`](https://github.com/dshworks/dshthemes/blob/main/scripts/skin-contract.mjs)
uses, run release to release:

- **Tokens.** 395 declared names, now 403. None removed, no value changed.
- **Hashed classes.** 7 of 119 module prefixes are gone, all Schedule's, and
  none was renamed: 0.2.0-rc.2 made Schedule an
  [optional bundle, off by default](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.0-rc.2/packages/boot/app-boot/src/profile.ts#L213-L218),
  and 0.2.1-alpha.1 mounts it again with the same hashes. No frozen sheet
  targets them. 46 target a 0.1.7-rc.2 class, and none loses one.
- **0.2.1-alpha.1**, on the `alpha` tag only, declares the same 403 tokens with
  the same values.

On the rc.6 shell this site paints on, the
[2026-09-18 picture](/notes/dsh-015-and-the-skin-contract/) holds: 48 frozen
sheets target an rc.6 class, 30 lose at least one on 0.2.0-rc.2, and 5 target a
newer hash. The shell stays at rc.6.

## Two registry fixes

- [#64](https://github.com/dshworks/awesome-dsh-themes/pull/64): #63 admitted
  `ReLuckyLucy/dsh-Rhine-Lab-theme` beside its own row under the repo's old
  name. Both map to one page here, so this site's refresh failed on
  `slug collision` at 09:03Z and 09:39Z on 2026-09-30, and went green at 15:52Z
  once #64 folded them. Triage now holds a candidate that a listed row from the
  same owner resolves to.
- [#66](https://github.com/dshworks/awesome-dsh-themes/pull/66): the 2026-10-05
  sweep's first run admitted two themes on test files, `test/theme-tokens.css`
  (dsh's stock token table, copied in for visual tests) and `smoke.mjs`. The
  [2026-09-04 fix](/notes/the-receipt-was-a-test/) filtered scripts, not
  stylesheets. Both are held; neither reached the list.

584 themes.
