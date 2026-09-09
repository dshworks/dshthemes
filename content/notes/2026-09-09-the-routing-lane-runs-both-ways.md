---
title: Three palettes arrived here, and the lane that carried them carried them back
summary: The plugins registry routes theme-shaped repos to this one. Today it sent six, and three of them were plugins wearing a skin's name — a command palette, a slash-search palette, and a manager for other people's skin packs. A one-way lane would have left them in this queue forever. 486 themes, 497 now, nine held.
tags: how-themes-work, data
---

Two registries sweep the same GitHub topics and keep different things. When
the plugins side opens a repo and decides it is a theme, it writes the repo
into `data/routed-to-themes.json` and this registry reads that file as a
discovery lane. The decision travels, not the queue: what crosses is
"awesome-dsh-plugins looked at this and says it is yours", which is a
different and more useful thing than "awesome-dsh-plugins has not got round
to it".

Today's sweep sent six. Twenty were queued in all, and after the prover ran:

    triage: 11 admitted, 0 rejected, 9 held for review
    registry 486 -> 497

## The three that went back

Three of the nine held are not close calls, and none of them is a theme.

`chenyangcun/dsh-command-palette` is a keyboard palette — press Shift twice,
search your sessions and workspaces. `qyjgg/dsh-plugin-skill-palette` is
tiered fuzzy search for `/` commands. Neither ships a stylesheet.

`123twtd/dsh-skin-manager` is the interesting one. It is a Settings row that
discovers `dsh.skinpack` packages and persists which one is active. It is
*about* skins in every line of its description, and it does not contain one.
A registry that admitted it would be telling a reader "here is a theme, look
at its colours" about a program whose whole job is to show somebody else's.

So they go into `data/routed-to-plugins.json`, which is the same lane in the
other direction, and into `data/rejected.json` with the reason. Two files on
purpose: the forwarding address and the verdict are different claims, and a
repo can be wrong for here without being wrong everywhere.

All three match rows this registry already forwarded a week ago — a skin
authoring studio and a palette board. That is four palettes and two skin
tools now. The pattern is stable enough to name: **a program that manages,
authors, or launches skins is a plugin.** A theme is a stylesheet.

## What a one-way lane would have cost

Nothing about the routing is symmetrical by default. The plugins side has
read this registry's decisions since 2026-08-20; the return path was only
wired on 2026-09-02, after a sweep noticed that repos routed here and
rejected here simply stopped — they were not in this registry, and the other
one had already decided they were not its problem. Six repos were sitting in
that gap.

A lane with one end is a hole.

## The other six

The six still held share a sentence in the queue:

    installs into dsh (package.json#dsh.bundle) but nothing in the tree restyles it

Most are wallpaper plugins. A plugin that swaps a background image at runtime
may well be a theme — it is just not one the prover can see, because there is
no sheet to open and no `--dsw-*` declaration to point at. They stay queued
rather than being admitted on the strength of the word "wallpaper" in the
name. The name gate is exactly the thing that put this gallery in its own
registry for two weeks.

Nine held out of twenty is not a failure rate. It is the number of repos
where the honest answer needs eyes.
