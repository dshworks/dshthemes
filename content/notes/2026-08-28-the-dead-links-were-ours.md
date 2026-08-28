---
title: 94 of 133 theme assets were 404. Nine of them actually were
summary: A theme that would not photograph led to a measurement saying 71% of the images and fonts in dsh themes are dead links. The measurement was true and the conclusion was wrong. Ten authors write asset paths their plugin serves at runtime, and three lines of ours were rewriting those into repository paths that never existed.
tags: how-themes-work, site-update
---

One theme would not photograph. `RizenHNT/dsh-skin-digital-arcade` timed out on
every attempt, the same way each time: the page never reached network idle
inside the 25-second budget, so the render was discarded and the theme shipped
with no picture.

Its stylesheet asks for fifteen files — two webfonts, a background, a set of
sprite atlases — every one of them from `raw.githubusercontent.com`. That is
enough to explain a timeout on a slow day, so we made the shot degrade instead
of fail: on timeout it retries waiting only for `load`, announces itself as
`SLOW`, and takes the picture without the webfont. A shot missing a font still
shows you the theme.

Then we checked how common this was, and got a number that looked like a
story.

## The measurement

We read every remote asset URL in the stylesheets frozen into this site and
fetched each one.

| | |
| --- | --- |
| distinct remote asset URLs | 133 |
| answered 200 | 39 |
| answered 404 | **94** |

Seventy-one percent dead, across 21 themes. The draft of this note was going to
be about theme authors hotlinking assets that later move.

## The conclusion was wrong

Before publishing a sentence about twenty-one people's repositories, we opened
one of them.

`skin.css` in `dsh-skin-digital-arcade` does not say what our frozen copy says.
The author wrote:

```css
@font-face {
  src: url('/skin-assets/fonts/fusion-pixel-12px-latin.otf.woff2');
}
```

A leading slash. That is not a path in their repository — it is a **route their
plugin serves at runtime**, inside dsh, where it resolves and the font loads.
On disk the directory is called `assets/`; `/skin-assets/` is the name it
answers to once the plugin is running. The two were never meant to match.

Our copy said this:

```css
src: url("https://raw.githubusercontent.com/RizenHNT/dsh-skin-digital-arcade/master/skin-assets/fonts/fusion-pixel-12px-latin.otf.woff2");
```

We freeze each theme's stylesheet so the gallery renders from something stable
rather than fetching GitHub on every read, and freezing means making relative
URLs absolute. The function doing it stripped the leading slash and resolved
the rest against the repository:

```js
return new URL(url.replace(/^\//, ""), base).href;
```

That one `replace` invented most of the 94. Once we started looking there were
two more of the same shape:

- **`url(%23n)`** — an SVG fragment reference, `#n` percent-encoded by whatever
  bundled the sheet. The guard tested for a literal `#`, so the encoded
  spelling walked past it into a repository path. Six themes, twelve invented
  URLs.
- **`url(__ARC_FONT_EXO__)`** — a build-time token the plugin substitutes at
  runtime. Not a path in any tree, and never going to be. Four themes, sixteen
  more.

After all three:

| | before | after |
| --- | --- | --- |
| distinct remote asset URLs | 133 | **46** |
| 404 | 94 | **9** |
| themes affected | 21 | **2** |

Nine dead links, across two themes. `INnoVationEE/dsh-endfield-theme` asks for
six images at its repository root that are not there, and `d-dev0101/open-sea-skin`
for three fonts under `website/vendor/fonts/`. That is the real number, and it
is a small maintenance note rather than an exposé.

## The test was the bug

There was an assertion covering this. It required the wrong thing:

```js
assert.match(out, /url\("https:\/\/raw\.githubusercontent\.com\/o\/r\/main\/src\/client\/img\/x\.jpg"\)/);
```

`url('/img/x.jpg')` was *required* to become a repository path. Every run was
green, for as long as the rule and the test agreed with each other. A green
suite is not evidence that a rule is right.

## What is actually true about theme assets

With the invented URLs gone, the picture is smaller and more useful.

**Nine themes** fetch at least one genuinely remote asset — 44 of the 46
references point at `raw.githubusercontent.com`, which is not a CDN and
rate-limits like the thing it is. If you are shipping a theme, an image inlined
as a `data:` URI or served from your own plugin route will outlive a hotlink.
Ten themes already inline theirs.

**Ten themes** serve assets from a plugin route. That is the right way to do
it, and it is invisible to any gallery, ours included. We can show you the
colours and the layout; we cannot show you the wallpaper, because the wallpaper
only exists while dsh is running.

The second group is not a problem to be fixed. It is a limit on what a picture
of a theme can mean, and it belongs printed next to the picture rather than
hidden inside the ones we quietly failed to take.
