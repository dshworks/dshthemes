---
title: dsh 0.1.5 is what npx installs. The tokens held; the chat classes did not
summary: Checked against the rc.6 shell this site renders. All 350 --dsw-* tokens are still declared and every colour resolves the same, except inline code. The chat chrome moved to a new package with new class hashes, and 30 of the 42 frozen stylesheets that target a hashed class lose at least one of those targets. The shell here stays at rc.6.
tags: how-themes-work, dsh-releases
---

npm's `latest` tag for `@deepseek-ai/dsh` is 0.1.5-rc.2 now
(`npm view @deepseek-ai/dsh dist-tags`); dsh.works' nightly census first read
it on the 0.1.5 line on 2026-09-10. The mock shell this site paints themes on is still 0.1.0-rc.6,
for the reason in [the rc.7 note](/notes/why-the-shell-stays-at-rc6/): a skin
targets two things, and only one of them is stable by design. So the same
two checks, run again against 0.1.5-rc.2 on 2026-09-18 with
[`scripts/skin-contract.mjs`](https://github.com/dshworks/dshthemes/blob/main/scripts/skin-contract.mjs).

## The tokens held

All 350 `--dsw-*` names declared by the rc.6 sheets are still declared in
`@deepseek-ai/dsh-client-ui-theme@0.1.5-rc.2`. Seven are new:
`--dsw-corner-shape`, `--dsw-alias-link` and five `--dsw-elevation-*`.

Values, compared after normalising notation (the new package ships minified
CSS, so `rgba(0, 0, 0, 0.16)` is now `#00000029`): every colour token resolves
to the same colour except one. `--dsw-alias-markdown-inline-code` moved from
the bluish neutral ramp to the plain one.

The other 51 changed values are all `--dsw-font-markdown-*` sizes and line
heights. They were fixed px; they now follow a user content font size that
the shell publishes as `--dsh-content-font-size`, with body text falling back
to 14px where it was 16px:

```
rc.6        --dsw-font-markdown-h1-font-size: 24px
0.1.5-rc.2  --dsw-font-markdown-h1-font-size: calc(21px + var(--dsh-content-font-delta))
```

A theme that only sets colour tokens looks the same on 0.1.5 as it does
here. A theme that pins a markdown font size in px now overrides the user's
setting, whatever it is.

## The chat classes did not

The chrome is compiled CSS modules, so its class names carry a content hash,
and skins that restyle the chrome have those strings typed in. Across every
`@deepseek-ai/dsh-client-ui-*` package the web app depends on, rc.6 ships 64
hashed module prefixes and 0.1.5-rc.2 ships 87. 48 of the 64 survive.

The frame, the sidebar, the conversation root, the hero, the input bar and
the workspace rows keep their rc.6 hashes. The six chat modules this site's
mock conversation is built from do not. The message bubble (`gdEzaW_`), the
chat view (`Md3f7G_`), assistant markdown (`Sxvs8a_`), the reasoning row
(`QWLzlG_`) and the command card (`_Xvjua_`) moved out of
`dsh-client-ui-conversation` into a new `dsh-client-ui-chat` package with new
hashes, and the stats line (`FJxK0a_`) is gone, replaced by a `StatsPills`
module.

Against the 218 stylesheets frozen under `data/css/`:

| frozen stylesheets | count |
|---|---|
| target an rc.6 hashed class | 42 |
| every target still ships in 0.1.5-rc.2 | 12 |
| some targets gone | 27 |
| every target gone | 3 |
| already target a hash new in 0.1.5-rc.2 | 4 |

The most-lost target is the message bubble, in 19 sheets. Then the chat view
and assistant markdown at 12 each, and the workspace browser and details
panel at 11.

## What that means here

A live preview on this site is a skin on the rc.6 shell. For the 30 sheets
that lose a target, the rules aimed at the chat chrome paint here and not on
0.1.5; the token half of the same theme still works there. The theme pages do
not say which half is which yet.

The shell stays at rc.6. Four sheets target 0.1.5 hashes against 42 that
target rc.6 ones, and moving now would drop rules from 30 themes to pick up
four. When the registry's sheets move, the shell moves with them and
the pictures are retaken.
