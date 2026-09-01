---
title: Twelve themes were in this gallery twice, and every check we run said both were fine
summary: GitHub's API follows a repository rename silently and returns the new name with a 200. So a renamed theme kept passing every proof under its old slug while our discovery met the same repository under its new one and listed it again. One theme, two rows, both verified, each correct on its own. 489 themes, 22 renamed, 12 of them here twice.
tags: how-themes-work, data
---

Ask GitHub's API for `RainbowDashy/dsh-theme-vscode-red` and you get a 200.
You get a full payload, a star count, a license, a default branch. What you do
not get, unless you look at the one field nobody looks at, is the fact that the
repository is not called that any more. It is `RainbowDashy/dsh-theme-palettes`
now. The API followed the rename and answered as though nothing happened.

That is the whole bug, and it took twelve rows to make it visible.

## How one theme becomes two

The registry behind this gallery has two halves that do not talk to each other,
on purpose. `discover.mjs` sweeps GitHub's topics and queues anything
theme-shaped it has not seen. `triage.mjs` opens each candidate's own files and
looks for a path by which it could restyle the UI — a `--dsw-*` override, the
ThemeRuntime, a `dsh.bundle` manifest — and admits it if it finds one.

Now rename a listed theme.

The prover still passes. It asks for the old slug, GitHub answers with the
current repository's files, the `package.json` still declares what it declared,
and the row keeps its `verified` badge. Nothing fails. Nothing even warns.

Meanwhile GitHub's *search* index carries the new name. So discovery meets the
same repository as `dsh-theme-palettes`, finds it in neither the listed set nor
the rejected set, and queues it as a find. Triage proves it — because it really
is a theme and it really does install — and admits it.

Two rows. Two names. Both `status: verified`. Both carrying an `evidence` path
you can click, and both of those paths resolve, because they are the same file
in the same repository.

Every individual check was correct. The system was wrong.

## What the probe found

We asked GitHub for all 489 listed themes, one call each, and compared the name
it answered with against the name we had.

| | n |
| --- | --- |
| listed themes probed | 489 |
| repository renamed since listing | 22 |
| …already listed a second time under the new name | **12** |
| …where the *owner* changed too | 3 |
| listed repositories that now answer 404 | 6 |

Twelve is 2.5% of the shelf, which sounds small until you remember what a
gallery is for. Two cards, two screenshots, two colour signatures, two install
lines, for one thing you can install once.

## Three of them changed hands

`manjiayu20071022/dsh-ui-background` is `MM071022/dsh-ui-background`.
`Vulcan626/dsh-pet` is `ZhanboHua/dsh-pet`. `Henry91200/whale-girl-plus` is
`Henryang777/whale-girl-plus`.

Those are not URL changes. A transfer means the install decision now rests on a
different person, and "should you run this" is a question about a person as
much as about a file. They are recorded separately and flagged, because a
machine should not quietly relabel who you are trusting.

## Two of them are not renames at all

`crack-time` renamed `dsh-client-ui-skin-cottage` **and** `dsh-web-ui-skin`
into the same repository: `crack-time/dsh-archive`.

Follow the rule mechanically and you merge two themes into one and pick a
winner. But nothing was renamed here. Two themes stopped existing separately,
and the archive that holds them is not a theme you install. A machine that
merges those has invented a theme that nobody wrote. They are held for a person
to decide, and they are still listed, unchanged, until one does.

## What changed

`scripts/renames.mjs` probes every listed row, rewrites the slug on the ones
that moved, merges the duplicates, and records all of it in
`data/renamed.json`. Discovery now excludes both ends of every recorded move —
if it only excluded the old slug, the new one would arrive as a find next week
and the whole cycle would run again.

One thing it deliberately does not do: touch `lastVerified` or `evidence`. A
rename does not move files. Re-dating a check nobody re-ran would be exactly
the kind of unfalsifiable freshness this registry exists to argue against, and
it would be so easy to justify — the row *is* newer, in a sense, we *did* just
look at it. We did not look at what those fields are about.

**489 → 477.** Twelve rows fewer and not one theme lost.

## The part worth keeping

The sibling registry, [awesome-dsh-plugins](https://github.com/dshworks/awesome-dsh-plugins),
hit this in August and fixed it. This side had no rename detection at all — and
the reason is worth writing down, because it is not that anyone decided against
it. The plugins registry refreshes star counts on a schedule, that refresh asks
GitHub for each repo, and it noticed renames as a *side effect* of asking. This
registry has no star refresher. So nothing here ever asked, and nobody thought
to, because the question only occurs to you once something has already answered
it by accident.

A duplicate is invisible from inside a row. You can only see it from outside,
by asking every row what it is actually called.
