---
title: dsh 0.2.1-rc.5 is latest. The skin contract held; exact versions did not
summary: 0.2.1-rc.5 has been npm's latest since 2026-10-29. For a skin nothing moved: the same 403 tokens with the same values, every hashed class a frozen sheet targets, and the same install check. What moved is the version that check reads. 4 listed themes that pin 0.2.1-rc.2 exactly are refused now, and 4 that pin rc.5 exactly will be refused by the next release. Write a range.
tags: how-themes-work, dsh-releases
---

npm's `latest` and `next` tags for `@deepseek-ai/dsh` both point at
0.2.1-rc.5, published 2026-10-29 (`npm view @deepseek-ai/dsh dist-tags`). It
is rc.3 plus a handful of web UI and ACP fixes, 13 commits in all.

## What held

Tag to tag against 0.2.1-rc.2, which was `latest` before it:

- `dsh-client-ui-theme`'s
  [styles/](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.1-rc.5/packages/client/ui-theme/src/styles)
  are byte-identical: 403 `--dsw-*` tokens, no value changed. So is the
  ThemeRuntime in `client/index.ts`.
- All 128 hashed module prefixes rc.2 compiles are still there, plus one new
  one for the entry-customization menu. The 44 sheets frozen here that aim at
  a live class keep every target.
- The install check,
  [`plugin-compatibility.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.5/packages/boot/app-boot/src/plugin-compatibility.ts),
  is byte-identical: an own `engines.dsh` decides alone, otherwise every
  `@deepseek-ai/dsh-*` peer must admit the running version
  ([the rule](/notes/dsh-021-font-token-and-engines/)).

## What moved: the version the check reads

We read the `package.json` behind each listed third-party theme that has one,
707 of 747, and applied the rule at each version. 0.2.1-rc.2 refuses 104; 0.2.1-rc.5
refuses 99.

Nine install now that did not on rc.2, because their range starts at rc.3 or
later. Four are refused now that installed on rc.2, because they name rc.2 and
nothing after it:

- [dsh-asuka-school-theme](/t/dsh-asuka-school-theme/): 13 peers, each `0.2.1-rc.2`
- [dsh-eye-care](/t/dsh-eye-care/): `^0.1.0-rc.6 || 0.2.0-rc.2 || 0.2.1-rc.2`
- [dsh-theme-inkstone-fuguang1](/t/dsh-theme-inkstone-fuguang1/): `engines.dsh` `0.2.1-rc.2`
- [gord-dsh-saber-theme](/t/gord-dsh-saber-theme/): `engines.dsh` `0.2.0-rc.2 || 0.2.1-rc.2`

And four that install on rc.5 are refused by whatever comes next, rc.6 or
0.2.1, because their lists end at rc.5:

- [dsh-claude-desktop-theme](/t/dsh-claude-desktop-theme/): `engines.dsh` `0.2.1-rc.3 || 0.2.1-rc.5`
- [dsh-theme-plugin-gulagala](/t/dsh-theme-plugin-gulagala/): `engines.dsh` `0.2.1-rc.5`
- [dsh-theme-prts](/t/dsh-theme-prts/): `engines.dsh` `0.2.1-rc.2 || 0.2.1-rc.3 || 0.2.1-rc.5`
- [dsh-theme-studio](/t/dsh-theme-studio/): 12 peers, each a list of 21 versions, 0.1.5-rc.2 through 0.2.2-alpha.2

Three of these were among the six themes that
[fixed their range](/notes/dsh-021-font-token-and-engines/) after 0.2.1-rc.2
went out. They fixed it by adding the new version to a list. The other three,
[dsh-skin-abyssal](/t/dsh-skin-abyssal/),
[dsh-skin-prts-tenebris](/t/dsh-skin-prts-tenebris/) and
[dsh-whale-pet-rongzi5](/t/dsh-whale-pet-rongzi5/), wrote a range, and have
not needed touching since.

## Write a range

A list of versions is a promise to republish after every dsh release. dsh
shipped five 0.2.1 release candidates between 2026-10-17 and 2026-10-29. A range carries the
same meaning without the upkeep:

```json
"engines": { "dsh": ">=0.2.0-rc.2 <0.3.0-0" }
```

That takes every 0.2 prerelease from rc.2 on, and 0.2.x itself. The `-0` on
the upper bound keeps 0.3.0's prereleases out. Without it they would sort
below 0.3.0 and be let in. If you also declare `@deepseek-ai/dsh-*` peers for
dsh versions before 0.2.1-alpha.4, which ignore `engines`, give them the same
range.
