---
title: dsh 0.1.0-rc.7 shipped. The shell here stays at rc.6, on purpose
summary: The token stylesheets are byte-identical between the two releases. The compiled class names are not, and those hashed strings are the contract community skins are written against.
tags: how-themes-work, dsh-releases
---

DeepSeek Harness tagged `0.1.0-rc.7` today. The mock shell this site renders
themes on is still 0.1.0-rc.6, and it is going to stay there for a while.

Here is why, in the order we checked it.

**The token layer did not change.** `base.css`, `design-platform.css`,
`scrollbar.css`, `gradient-shadow-text.css` and `shiki.css` are byte-identical
between rc.6 and rc.7. Every colour this site resolves comes out of those
files, so nothing about the signatures moves.

**The class names did.** The shell's visible chrome is compiled CSS modules,
which means the class names carry a content hash: `.hHd-Xa_root` for the
sidebar, `.pI_x6G_frame` for the app frame, `.gdEzaW_bubble` for a user
message. Those hashes change when the module changes, and in rc.7 the
conversation package moved files around.

**Skins are written against the hashes.** A theme that restyles the chrome
directly, which many of the best ones do, has those strings typed into its
stylesheet. Re-vendoring the shell at rc.7 would swap them out, and every skin
that targets the rc.6 chrome would stop matching, in a preview whose entire
job is to show you what the skin does.

So the honest thing is to hold. The mock is a 0.1.0-rc.6 shell, the theme page
says 0.1.0-rc.6 on the title bar, and when enough of the registry has moved to
a newer set of hashes, the shell will move with it and the pictures will be
retaken.

One thing did move: the registry now records `verifiedAgainst: 0.1.0-rc.7` for
the 19 themes admitted today, because that is the release their evidence was
checked against. Older rows keep the version they were proven against. A mixed
column is more useful than a tidy one that quietly backdates a claim.
