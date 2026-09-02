---
title: This gallery was listed as a theme, and the prover that listed it was ours
summary: A theme's receipt is a stylesheet that declares a --dsw-* token. Our regex accepted a stylesheet that merely reads one — var(--dsw-bg) — and on that evidence admitted a launcher, a skin-authoring tool, and this site. Then the name gate admitted a model switcher because "skin" was in its slug, a row a human had parked the day before. 477 themes, 478 now, five rows opened, two rules rewritten.
tags: how-themes-work, data, corrections
---

Since 2026-08-19 the registry this site reads has carried a row called
`dshthemes`. Repository `dshworks/dshthemes`. Evidence
`src/chrome.css#--dsw-tokens`. Status verified. It is this website.

Nobody added it by hand. The prover found it in the `dsh-theme` topic, opened
its files, found a stylesheet with `--dsw-` in it, and wrote the receipt. Every
check we run passed it for two weeks, including the one that checks the
receipt still holds. It held. `src/chrome.css` does contain `--dsw-` tokens: it
*reads* them, so that a theme card's chrome can borrow the theme's own colours.
It does not set a single one.

## A mention is not an override

A skin restyles the harness by declaring tokens: `--dsw-bg: #1d1b16;`. A panel
that wants to blend in *consumes* them: `background: var(--dsw-bg)`. Both
contain the string `--dsw-bg`. The regex the prover ran over stylesheets was
`/--dsw-[a-z0-9-]+/`, which is to say it could not tell the two apart, and so
"a stylesheet overriding dsh's design tokens" in our evidence table meant, in
practice, "a stylesheet in which the tokens are mentioned".

Twelve listed rows rest on that receipt. We opened all twelve today. Seven
declare tokens. Five only consume them:

| row | what the file does | what it is |
|---|---|---|
| `dsh-skin-bd2-yustia` | `yustia.module.css` reads tokens | a real skin — `client.js` declares 199 of them; receipt moved |
| `dsh-skin-chengzi` | `patches.css` reads tokens | a real skin — `skin.css` declares 180; receipt moved |
| `dsh-plugin-palette-board` | `palette.module.css` reads tokens | a Raycast-style launcher that wants to match the UI |
| `dsh-skin-studio` | `studio.module.css` reads tokens | a settings page for *authoring* skins |
| `dshthemes` | `src/chrome.css` reads tokens | this site |

Two of the five are skins whose override lives one file over. The prover
stopped at the first sheet that matched. Three are not skins at all, and one of
those three is us.

The regex now wants the declaration: `--dsw-bg:` in a sheet, `"--dsw-bg":` in a
token map, `--dsw-bg: ${x}` in a template literal. And it runs over scripts
too, smallest first, because a skin that ships its whole sheet from
`client.js` is still a skin; `dsh-theme-taojian` went from a bare bundle
receipt to `client.js#--dsw-tokens` on that pass alone.

## The name gate proved nothing twice

The second rule was subtler. When the prover finds an install path but no
restyle signal anywhere in the tree, it used to ask: does the repo call itself
a skin? If so, admit. That reads as caution. For the topic lane it is
circular: the name is what put the row in the queue. Asking it again admits
every install-only repo whose slug contains the right word.

Yesterday a human opened `dsh-ui-skin-switcher`, saw a model and
reasoning-effort switcher with no stylesheet, and parked it with a note. The
next run re-decided the row by machine, read "skin" in the slug, and listed it.
The note was never read, because nothing in the script knew that a note could
mean a person had already looked.

Two changes. An install path with no restyle signal is now held in every lane,
never admitted on the name and never rejected either: a launcher and a skin
look identical from outside, and that is a person's call. And a candidate can
carry `hold: "<why>"`, which the script treats as that call already made and
leaves alone on every later run.

## The lane back

Three of today's rows are plugins wearing a skin's name. The plugins registry
routes theme-shaped repos here by name, and until today a verdict of "not a
theme" had nowhere to go: the repo sat in both queues and was re-routed by its
name every morning. `data/routed-to-plugins.json` is now the forwarding
address; the plugins registry reads it as a discovery lane and will not send
those repos back. The skin studio and the palette board are listed over there
tonight, proven on their bundle manifests, which is what they are.

## What moved

477 themes yesterday, 478 today. In: `diana-dsh-theme`,
`dsh-minimalist-themes`, `dsh-theme-taojian`. Out: `dsh-plugin-palette-board`
and this site. Three judgments recorded in `rejected.json` with no recheck
date, because they are about what the projects are, not about the day we
looked. And the 362 listed rows whose receipt is an install path rather than a
restyle path are unchanged by any of this; today's rule governs new rows, and
re-proving the old ones is the next job, not a footnote to this one.

*Later the same morning:* the first sweep to run after this change brought two
rows in through the plugins registry's routing lane, `dsh-theme-prts` on a
stylesheet declaration and `dsh-client-background` on a declaration written
from `src/client/background.ts` — a receipt the prover could not have produced
the day before. 480.
