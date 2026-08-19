---
title: 39 themes rendered on the real dsh shell. Now 86 do, and each one was photographed
summary: Every theme page now renders the shell at desktop proportions, from a stylesheet frozen into the site rather than fetched from GitHub at read time. 86 themes render, up from 39, and every one of them has been photographed there.
tags: site-update
---

Five changes landed on this site today. All of them are about the same
question: when we say a theme renders on the shell, is what you see true?

### The shell was being squeezed, not scaled

The preview frame used to be laid out at whatever width the stage happened to
be, around 940 pixels on a desktop browser. The dsh shell is a desktop layout
with a fixed-width sidebar, so at 940 pixels you were not looking at a smaller
dsh, you were looking at a squeezed one: the sidebar took a third of the frame
and the conversation column collapsed to a band of empty background.

The frame is now always laid out at 1440x900 and scaled to fit the stage. That
is the stage's own 16:10, so it lands exactly on the edges, and what you see is
the theme at desktop proportions, just smaller.

### The stylesheet is frozen into the site

The old live view fetched each theme's CSS from `raw.githubusercontent.com`
when you opened the page. That works right up until a repository renames a
branch or moves a file, and then the page quietly shows you the stock shell
with the theme's name above it. One of the 39 was doing exactly that:
`dsh-miku-skin`'s repository is gone, and its preview had been serving stock
DeepSeek to anyone who opened it. Checking the rest of the registry the same
way turned up four more dead repositories, now marked `broken` upstream.

Every rendered stylesheet is now fetched once, resolved (including its
`url()` wallpapers, which point back at the repo), and committed into this
site under `/theme-css/`. If a theme's file disappears, the build breaks, which
is where somebody sees it.

### 39 became 86

The registry names a stylesheet for 39 themes. For the rest, this site already
finds a stylesheet in order to read its colours. It just was not rendering
what it found, because most of those files are code rather than CSS.

Now the CSS strings get lifted out of the code, and a theme renders if the
sheet actually reaches the shell and then measurably changes it. That took the
live view from 39 themes to 86: 47 verbatim stylesheets and 39 read out of the
JavaScript or TypeScript around them. Each theme page says which, and links the
exact file.

130 sheets passed the first gate. 44 of them failed the second, which is the
next section.

### Nine registry-curated themes lost the badge

Going the other way: nine themes had a stylesheet the registry named and a
"live" tab that showed the stock shell. `dsh-naiwa-theme` styles a replacement
wordmark its plugin injects. `dsh-blur-theme` styles an enhancer layer.
`dsh-yelan-skin` and `dsh-home-ui` hang everything off a host attribute their
plugin sets, then style elements it also creates. In every case a static copy
of the shell has none of those, so injecting the sheet changed nothing.

Two of the nine turned out to be our fault, not theirs, and are fixed:
`dsh-skin-yanisuu` ships the CSS-modules source, where `:global(body)` means
something to the compiler and nothing to a browser, and `dsh-wx-skin` hangs off
`html[data-wx-skin-active]` when we were only mirroring `body[data-…]`. Both
now render.

The rest keep their colour signature and their own screenshot. They no longer
claim to render, because they do not.

### Every card is now a photograph

The last piece: once a theme's stylesheet lives in the build, we can open the
preview in a browser ourselves and take the picture. All 86 now have a real
screenshot of the dsh shell wearing them, at the same 1440x900, in the scheme
their own stylesheet leads with. The gallery is a wall of the same room in
different clothes rather than a grid of swatches.

The room also got furniture. The mock used to be the empty new-session screen,
which meant every picture was a sidebar and a lot of background. It now holds a
short conversation: a user bubble, a reasoning row, a tool call, assistant
prose, and a code block with its banner. Those are the parts most themes
actually restyle, so the picture is both worth looking at and a much wider test
of the stylesheet.

The comparison is also the last gate. Each render is diffed against the stock
shell, and a theme that comes back pixel-identical loses its claim no matter
what its stylesheet looked like. 44 did. Nothing says "live" on this site now
without a picture behind it that differs from the one every other theme would
have produced.
