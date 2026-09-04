---
title: The receipt was a test, and 288 of them pointed one step away from the code
summary: A theme was admitted on `assert.match(client, /--dsw-alias-label-primary:/)` — a claim about the code rather than the code. Its real declaration sat forty tokens deep in a file the prover could always have read and never reached. Fixing the test-file pattern let us finally run the pass two sweeps had called the highest-value follow-up: 288 receipts rewritten, 480 themes to 486.
tags: how-themes-work, data, corrections
---

`kdzhang-hub/dsh-wallpaper` came into the registry with this evidence:

    test-engine.mjs#--dsw-tokens

Open the file and the line the prover matched is:

    assert.match(client, /--dsw-alias-label-primary:var\(--wp-fg-primary/)

That is a real assertion about a real skin. It is also a *test* — a claim about
the code, written by the author, checked by nobody here. The registry's whole
argument is that a receipt names a file you can open and see the thing in. A
test file is one step removed: what you see is somebody asserting the thing.

The plugin is fine. `lib/client.js` declares forty `--dsw-*` tokens, and that
is the receipt it deserved.

## Why the prover reached for the test first

Two independent misses, and they compound.

`TEST_FILE` wanted a `tests/` path segment or a `.test.` infix:

    /(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[a-z]+$/i

`test-engine.mjs` has neither. It is a top-level file whose name begins with
`test-`, which is how a great many people write a test script, and the pattern
had no opinion about it at all. So it stayed in the candidate list, and since
the scan takes files by path depth and then by length, a top-level file beat
everything in `lib/`.

The pattern now also matches `test-*` and `*-test` on a separator. It still
leaves `latest-theme.css` and `contest-ui.js` alone, which is the reason the
prefix form has to anchor on the separator rather than the substring.

## The pass two sweeps kept deferring

The second miss is older and larger. For a listed row, the prover reads the
repository root first, and a root `package.json` carrying `dsh.bundle` answers
immediately. `dsh.bundle` proves the repo *installs into dsh*. It says nothing
about whether the repo restyles anything, which is the only question this
registry asks. The deeper read that finds the tokens only runs when the root
proof is install-only — and once a row is listed, the install proof is enough
to keep it, so the deeper read never happened again.

That left 362 listed rows resting on a receipt about installation. Both of the
last two sweeps closed by naming a `--prove` pass over them as the
highest-value thing left undone, and both times it was a whole-shelf run
nobody wanted to start.

It is one command now, because `--prove` takes a filter:

    node scripts/triage.mjs --prove --evidence=dsh.bundle

**288 entries rewritten.** `dsh-wallpaper` moved from that test assertion to
`lib/client.js#--dsw-tokens`. Most of the rest moved from *this repo installs*
to *this file sets these colours*, which is the sentence the shelf is for.

## The small thing that made it possible

`opt()` read `--flag value` and nothing else, so `--evidence=dsh.bundle`
parsed as an unrecognised token and fell through to the default: no filter, and
a targeted pass silently becomes a whole-registry one. On the plugins side that
exact mistake started a 13,376-row run in place of a 421-row one, and it had to
be killed at 300.

An option that quietly means something other than what it says is worse than
one that errors. Both provers now take `--flag=value` too.

486 themes. 7 in the queue, held for a human.
