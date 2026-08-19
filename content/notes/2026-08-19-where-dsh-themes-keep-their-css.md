---
title: Only 59 of 332 dsh themes keep their colours in a .css file
summary: We read the stylesheet of every theme in the registry. Four out of five are not stylesheets. They are JavaScript, and that one fact decides most of what a theme gallery can show you.
tags: how-themes-work, data
---

A dsh theme is a plugin, and a plugin ships code. So when we go looking for
"the theme's stylesheet", what we find is usually not a stylesheet.

Across the 332 themes in the registry where we could identify a source of
colour, here is the file it lives in:

| Extension | Themes |
| --- | --- |
| `.js` | 213 |
| `.css` | 59 |
| `.ts` | 41 |
| `.json` | 9 |
| `.mjs` | 7 |
| `.tsx` | 3 |

Four out of five themes keep their CSS inside code. The usual shape is a
template string exported from `src/client/style.ts`, injected into the page by
the plugin when it loads:

```ts
export const style = `
  body[data-dsh-mine] {
    --dsw-alias-bg-primary: #0d1117;
    --dsw-alias-label-primary: #ebf0f6;
  }
`
```

That is a completely reasonable way to write a dsh plugin. It is also the
reason a gallery that goes looking for `*.css` finds a quarter of the work and
concludes the rest has no colours. Our first pass at this site did exactly
that and found 83 of 325.

### Three kinds of theme, and only two of them can be shown

Reading the code instead of the file extension splits the registry three ways.

**The sheet is a sheet.** 67 themes ship CSS a browser will accept as it
stands, whether the file is named `.css` or the CSS is a string we can lift
whole out of the code around it. These are the ones we can put on the shell
and photograph.

**The sheet is assembled at runtime.** A large group builds its palette as a
JavaScript object and applies it with `setProperty` in a loop. There is no
stylesheet anywhere in the repository. It exists only after the plugin runs.
We can still read the colours, which is what the painted signature is, but
there is nothing to inject, so there is nothing to render.

**The CSS styles elements that do not exist yet.** This is the subtle one.
Plenty of themes ship a real `.css` file that selects `.naiwa-brand-wordmark`
or `.pet-layer`, classes the plugin's own JavaScript adds to the page. Inject
that sheet into a copy of the shell with no plugin running and precisely
nothing happens.

That last group is why this site now checks, rather than assumes. A stylesheet
earns the "live" label only if it sets `--dsw-*` tokens, flips a `body[data-…]`
or `html[data-…]` attribute, adds a host class, or names one of the shell's own
compiled class names, and then only if the render actually comes back different
from the stock shell. 130 sheets cleared the first test today and 86 cleared
the second.

### If you are writing a theme

Nothing here is a rule about how you should build. But if you would like your
theme to be visible in galleries, in issue threads, and in anything that reads
repositories rather than running them, one habit does most of the work: keep
the tokens in a real `.css` file and import it, even if the rest of the plugin
is TypeScript. Everything downstream can then read it, ours and everybody
else's.

If your theme is one of the ones we cannot render, the theme is fine. Our
reach is what is short.
