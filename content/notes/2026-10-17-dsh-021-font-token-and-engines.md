---
title: dsh 0.2.1 moves the font token to body, and reads engines.dsh first
summary: dsh 0.2.1-rc.2 is on npm's next tag. It declares --dsw-font-family on body, so a skin that sets the token on :root or html stops reaching dsh's own components; 12 listed skins do. Its install check now reads engines.dsh before the dsh peers, and refuses 23 listed themes that 0.2.0-rc.2 installs. Everything else held: 403 tokens, and every hashed class a frozen sheet targets.
tags: how-themes-work, dsh-releases
---

dsh 0.2.1-rc.2 went to npm's `next` tag on 2026-10-17
(`npm view @deepseek-ai/dsh dist-tags`). `latest` is still 0.2.0-rc.2. Two
things change for a theme author before 0.2.1 reaches `latest`.

## Set the font token on body

0.2.1 lets the user pick text, code and terminal fonts in Settings
([849e9ebd8d](https://github.com/deepseek-ai/deepseek-harness/commit/849e9ebd8d)).
To do it, `dsh-client-ui-theme`'s
[base.css](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.2/packages/client/ui-theme/src/styles/base.css)
now declares the token twice:

```css
:root { --dsw-font-family: var(--dsh-font-family-text-default); }
body  { --dsw-font-family: var(--dsh-font-family-text, var(--dsh-font-family-text-default)),
                          var(--dsh-font-family-text-default); }
```

A custom property declared on `body` wins over the one `body` would inherit
from `html`, so a skin's `:root { --dsw-font-family: ... }` no longer reaches
anything inside the page. `!important` does not help: it ranks declarations on
the same element, and these are on two.

The fix is one selector that outranks base.css's bare `body`:

```css
html body { --dsw-font-family: "Your Font", sans-serif; }
```

`body[data-your-skin]`, which many skins already use to switch themselves on,
works as well. A bare `body` ties with base.css, and then whichever stylesheet
loads last wins. We checked all of it in Chromium, with the two rules above and
the skin's rule loaded both before and after them: `:root` and `html` always
resolve to dsh's stack, `body` only when the skin loads last, and `html body`
and `body[data-skin]` always resolve to the skin's font.

Doing so also overrides the font the user picks in Settings. If you would
rather follow their choice, leave the token alone and set `font-family` only
where the skin needs a display face.

Of the 272 stylesheets this site has frozen, 41 set `--dsw-font-family` and 12
set it only on `:root` or `html`: [dsh_theme_terraria](/t/dsh-theme-terraria/), [dsh-theme-dishuhai](/t/dsh-theme-dishuhai/), [dsh-endfield-theme](/t/dsh-endfield-theme/), [liuli-theme](/t/liuli-theme/), [dsh-theme-hacker-terminal](/t/dsh-theme-hacker-terminal/), [dsh-arcaea-theme](/t/dsh-arcaea-theme/), [dsh-claude-theme-aklnaaw](/t/dsh-claude-theme-aklnaaw/), [dsh-plugin-gemini-theme](/t/dsh-plugin-gemini-theme/), [dsh-rhine-skin](/t/dsh-rhine-skin/), [dsh-skin-crt](/t/dsh-skin-crt/), [pixel-skin](/t/pixel-skin/), and
[dsh-claude-theme-kc0ed](/t/dsh-claude-theme-kc0ed/). The first 11 also name a
font directly on some selectors, and those keep working; what they lose is the
font on everything that reads the token. dsh-claude-theme-kc0ed reaches fonts
only through it.

## Widen the range dsh reads

Since 0.2.1-alpha.4 the install check reads a package's own `engines.dsh`
first. If one is there it decides alone, and the `@deepseek-ai/dsh-*` peers are
not read; without one, the peer rule is
[unchanged](/notes/dsh-020-and-the-peer-gate/). A non-object `engines`, such as
`"engines": "node >= 20"`, refuses the package outright
([the rule](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.1-rc.2/packages/boot/app-boot/src/plugin-compatibility.ts#L55-L74)).

We read the `package.json` each listed theme's receipt points at, 544 of 588
third-party rows, and applied each version's rule. 0.2.0-rc.2 refuses 90;
0.2.1-rc.2 refuses 111. The 23 it adds:

- [dsh-skin-abyssal](/t/dsh-skin-abyssal/): `engines.dsh` "0.1.7-rc.2 || 0.2.0-rc.2"
- [dsh-skin-prts-tenebris](/t/dsh-skin-prts-tenebris/): `engines.dsh` "0.1.7-rc.2 || 0.2.0-rc.2"
- [dsh-theme-prts](/t/dsh-theme-prts/): `engines.dsh` "0.2.0-rc.2"
- [majia7-dsh-skin](/t/majia7-dsh-skin/): `engines.dsh` ">=0.1.1-rc.2 <0.2.0"
- [dsh-sprite-pet](/t/dsh-sprite-pet/): `engines.dsh` "0.1.5-rc.2"
- [dsh-universal-palette](/t/dsh-universal-palette/): `engines.dsh` "0.1.2-rc.1"
- 17 by a dsh peer range that stops short of 0.2.1, for example an exact
  `0.2.0-rc.2` or a `<0.2.0` cap that admitted 0.2.0-rc.2 only because a
  prerelease sorts below its release: [dsh-arcaea-theme](/t/dsh-arcaea-theme/), [dsh-asuka-school-theme](/t/dsh-asuka-school-theme/), [dsh-client-ui-skin-qingxiao](/t/dsh-client-ui-skin-qingxiao/), [dsh-eye-care](/t/dsh-eye-care/), [DSH-Liquid-Glass-Theme](/t/dsh-liquid-glass-theme/), [dsh-liya-skin](/t/dsh-liya-skin/), [dsh-neubrutalism-theme](/t/dsh-neubrutalism-theme/), [dsh-paper-theme-blaczz](/t/dsh-paper-theme-blaczz/), [dsh-pet-corner](/t/dsh-pet-corner/), [dsh-plugin-gouden-leeuw-theme](/t/dsh-plugin-gouden-leeuw-theme/), [dsh-theme-library](/t/dsh-theme-library/), [dsh-theme-native](/t/dsh-theme-native/), [dsh-theme-studio](/t/dsh-theme-studio/), [dsh-webui-background](/t/dsh-webui-background/), [dsh-whale-pet-rongzi5](/t/dsh-whale-pet-rongzi5/), [EAC-skin-packages](/t/eac-skin-packages/), [ui-song-theme](/t/ui-song-theme/).

One range in `engines.dsh`, or in the peers when there is no `engines.dsh`,
fixes it, for example `">=0.2.0-rc.2 <0.3.0-0"`. dsh never installs a peer,
so a wider range cannot pull a newer harness into an older host.

## What held

0.2.0-rc.2 against 0.2.1-rc.2, with the extraction
[`scripts/skin-contract.mjs`](https://github.com/dshworks/dshthemes/blob/main/scripts/skin-contract.mjs)
uses:

- **Tokens.** 403 names at both. None added, none removed, one value changed:
  `--dsw-font-family`, above.
- **Hashed classes.** All 115 module prefixes kept, 13 new. 46 frozen sheets
  target a 0.2.0-rc.2 class and none loses one.

The rc.6 shell this site paints on is not affected, so the live views do not
change.
