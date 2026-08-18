#!/usr/bin/env node
// Render dist/ from data/themes.json (the registry) + data/enrich.json (what
// we derived). Plain HTML, one stylesheet, one script. Every theme gets a real
// URL. Nothing here is fetched at request time.

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { springCss } from "./spring.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const DIST = join(ROOT, "dist");
const SITE = "https://dshthemes.com";
const REGISTRY_URL = "https://github.com/dshworks/awesome-dsh-themes";

const registry = JSON.parse(readFileSync(join(ROOT, "data", "themes.json"), "utf8"));
const enrich = JSON.parse(readFileSync(join(ROOT, "data", "enrich.json"), "utf8"));
const today = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// model
const SHELVES = {
  skin: { slug: "skins", label: "Skins", one: "skin", blurb: "restyle the chrome: backgrounds, characters, whole looks" },
  tokens: { slug: "token-skins", label: "Token skins", one: "token skin", blurb: "--dsw-* palettes on the stock shell, the cleanest kind" },
  companion: { slug: "companions", label: "Companions", one: "companion", blurb: "something that lives on the page with you" },
  fun: { slug: "fun", label: "Fun", one: "fun one", blurb: "effects, seasons, jokes that ship" },
  runtime: { slug: "runtime", label: "Runtime", one: "runtime", blurb: "the theme engine itself" },
};
const shelfBySlug = Object.fromEntries(Object.entries(SHELVES).map(([k, v]) => [v.slug, k]));

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const daysAgo = (d) => (d ? Math.max(0, Math.round((Date.parse(today) - Date.parse(d)) / 86400000)) : null);
const ago = (n) => (n == null ? "unknown" : n === 0 ? "today" : n === 1 ? "yesterday" : n < 30 ? `${n}d ago` : n < 365 ? `${Math.round(n / 30)}mo ago` : `${(n / 365).toFixed(1)}y ago`);

function categoryOf(t) {
  if (t.category) return t.category;
  if (t.official || t.kind === "runtime") return "runtime";
  return "skin";
}
function installOf(t) {
  if (t.install) return t.install;
  if (t.official || t.kind === "runtime") return null;
  return `dsh plugin --profile web add github:${t.repo}`;
}

const themes = registry.themes.map((t) => {
  const e = enrich.repos[t.repo] || {};
  const shelf = categoryOf(t);
  const pal = e.palette && e.palette.source ? e.palette : null;
  const evPath = t.evidence ? t.evidence.split("#")[0] : null;
  const branch = e.branch || "HEAD";
  return {
    ...t,
    slug: slugify(t.name),
    owner: t.repo.split("/")[0],
    shelf,
    shelfInfo: SHELVES[shelf],
    url: `/t/${slugify(t.name)}/`,
    repoUrl: t.path ? `https://github.com/${t.repo}/tree/${branch}/${t.path}` : `https://github.com/${t.repo}`,
    evidencePath: evPath,
    evidenceUrl: evPath ? `https://github.com/${t.repo}/blob/${branch}/${evPath}` : null,
    install: installOf(t),
    license: t.license || e.ghLicense || null,
    homepage: e.homepage || null,
    stars: typeof e.stars === "number" ? e.stars : null,
    pushedAt: e.pushedAt || null,
    pushedDays: daysAgo(e.pushedAt),
    palette: pal,
    css: e.css || null,
    cssBlobUrl: e.css ? `https://github.com/${t.repo}/blob/${branch}/${e.css.path}` : null,
    hasLive: Boolean(t.previewCss),
    hasShot: Boolean(t.preview),
    signature: pal ? pal[pal.leads] : null,
  };
});
themes.sort((a, b) => a.name.localeCompare(b.name));
const bySlug = new Map(themes.map((t) => [t.slug, t]));
if (bySlug.size !== themes.length) throw new Error("slug collision");

const stats = {
  total: themes.length,
  shots: themes.filter((t) => t.hasShot).length,
  live: themes.filter((t) => t.hasLive).length,
  signatures: themes.filter((t) => t.palette).length,
  fromTokens: themes.filter((t) => t.palette && t.palette.source === "tokens").length,
  verified: themes.filter((t) => t.status === "verified").length,
  shelves: Object.fromEntries(Object.keys(SHELVES).map((k) => [k, themes.filter((t) => t.shelf === k).length])),
  updated: registry.updated,
  enriched: enrich.updated,
  verifiedAgainst: registry.themes[0]?.verifiedAgainst || "0.1.0-rc.6",
};

// ---------------------------------------------------------------------------
// pieces
const ICONS = {
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
  github: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"/></svg>',
};

const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${Object.entries(ICONS).map(([k, v]) => v.replace("<svg", `<symbol id="i-${k}"`).replace("</svg>", "</symbol>").replace(/ aria-hidden="true"/, "")).join("")}</defs></svg>`;
const use = (k) => `<svg aria-hidden="true"><use href="#i-${k}"/></svg>`;

function palStyle(sig) {
  if (!sig) return "";
  return `--c-bg:${sig.bg};--c-surface:${sig.surface};--c-text:${sig.text};--c-muted:${sig.muted};--c-brand:${sig.brand};--c-border:${sig.border}`;
}
function palAttrs(t) {
  if (!t.palette) return "";
  const d = t.palette.dark, l = t.palette.light;
  return ` data-pal-dark="${esc(palStyle(d))}" data-pal-light="${esc(palStyle(l))}"`;
}

// The painted frame. `sig` is one scope's palette; null paints the honest blank.
function mini(sig, { cls = "", note = null, shot = null, light = false } = {}) {
  const style = sig ? ` style="${esc(palStyle(sig))}"` : "";
  const classes = ["mini", cls, sig ? "" : "blank", light ? "is-light" : ""].filter(Boolean).join(" ");
  const shotImg = shot ? `<img class="m-shot" src="${esc(shot)}" alt="" loading="lazy" decoding="async">` : "";
  return `<div class="${classes}"${style} aria-hidden="true">
<div class="m-side"><span class="m-brand"></span><span class="m-row"></span><span class="m-row on"></span><span class="m-row"></span><span class="m-row"></span><span class="m-row"></span></div>
<div class="m-main"><div class="m-hero"><span class="m-title"></span><span class="m-sub"></span></div><div class="m-composer"><span class="m-input"></span><span class="m-send"></span></div></div>${shotImg}${note ? `<span class="m-note">${esc(note)}</span>` : ""}</div>`;
}

function swatches(sig) {
  if (!sig) return "";
  return `<div class="swatches" aria-hidden="true">${["bg", "surface", "border", "muted", "text", "brand"].map((k) => `<i style="background:${sig[k]}"></i>`).join("")}</div>`;
}

function card(t) {
  const visual = t.hasShot
    ? `<img class="shot" src="${esc(t.preview)}" alt="${esc(t.name)} screenshot" loading="lazy" decoding="async">`
    : mini(t.signature, { note: t.signature ? null : "no stylesheet read" });
  const meta = [
    `<span class="shelf">${esc(t.shelfInfo.label)}</span>`,
    t.stars != null ? `<span class="stars">${t.stars}</span>` : "",
    t.pushedDays != null ? `<span title="last push ${esc(t.pushedAt)}">pushed ${ago(t.pushedDays)}</span>` : "",
    t.hasLive ? `<span class="live">live</span>` : "",
    t.status !== "verified" ? `<span class="warn">${esc(t.status)}</span>` : "",
  ].filter(Boolean).join("");
  const wear = t.install
    ? `<button type="button" class="wear" data-cmd="${esc(t.install)}" aria-label="copy install command for ${esc(t.name)}"><span class="ico"><span class="i-a">${use("copy")}</span><span class="i-b">${use("check")}</span></span><span class="lbl"><span class="l-a">Wear it</span><span class="l-b">Copied</span></span></button>`
    : `<a href="${esc(t.repoUrl)}" rel="noopener">${use("github")} Source</a>`;
  return `<article class="card" data-slug="${esc(t.slug)}" data-shelf="${esc(t.shelf)}" data-name="${esc(t.name.toLowerCase())}" data-owner="${esc(t.owner.toLowerCase())}" data-stars="${t.stars ?? -1}" data-pushed="${t.pushedAt || ""}" data-added="${esc(t.added)}" data-live="${t.hasLive ? 1 : 0}" data-shot="${t.hasShot ? 1 : 0}">
<a class="card-visual" href="${t.url}" tabindex="-1" aria-hidden="true">${visual}${swatches(t.signature)}</a>
<div class="card-body"><h3><a href="${t.url}">${esc(t.name)}</a></h3><p class="desc">${esc(t.description)}</p><div class="card-meta">${meta}</div></div>
<div class="card-actions">${wear}<a href="${t.url}">Open ${use("arrow")}</a></div>
</article>`;
}

function sitebar(current) {
  const links = [["/", "themes"], ["/about/", "about"], ["https://dsh.works/", "plugins"], [REGISTRY_URL, "registry"]];
  return `<header class="sitebar"><a class="sitebar-brand" href="/"><span class="caret">&gt;</span> dsh<i>themes</i></a><nav class="sitebar-links">${links.map(([h, l]) => `<a href="${h}"${h === current ? ' aria-current="page"' : ""}${h.startsWith("http") ? ' rel="noopener"' : ""}>${l}</a>`).join("")}<button type="button" class="themectl" data-themectl>theme: <b>auto</b></button></nav></header>`;
}

function footer() {
  return `<footer class="wrap foot"><span>dshthemes.com reads <a href="${REGISTRY_URL}" rel="noopener">dshworks/awesome-dsh-themes</a> · registry ${esc(stats.updated)} · colours read ${esc(stats.enriched)}</span><span class="spacer"></span><a href="/themes.json">themes.json</a><a href="/llms.txt">llms.txt</a><a href="https://dsh.works/" rel="noopener">dsh.works</a><a href="https://github.com/dshworks/dshthemes" rel="noopener">source</a><span>not affiliated with DeepSeek</span></footer>`;
}

function layout({ title, description, body, path = "/", current = "/", head = "", bodyClass = "" }) {
  const canonical = SITE + path;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="dshthemes">
<meta property="og:type" content="website">
<meta property="og:image" content="${SITE}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#000000">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;700&display=swap">
<link rel="stylesheet" href="/assets/site.css">
<script>(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}})();</script>
${head}
</head>
<body class="${bodyClass}">
${SPRITE}
${sitebar(current)}
${body}
${footer()}
<script src="/assets/app.js" defer></script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// index + shelf pages
const controls = (fixedShelf) => {
  const chips = [["all", "All", stats.total], ...Object.entries(SHELVES).map(([k, v]) => [k, v.label, stats.shelves[k]])].filter(([k, , n]) => n > 0);
  const chipHtml = fixedShelf
    ? chips.map(([k, l, n]) => `<a class="chip" href="${k === "all" ? "/#gallery" : `/shelf/${SHELVES[k].slug}/`}"${k === fixedShelf ? ' aria-current="page"' : ""}>${l}<b>${n}</b></a>`).join("")
    : chips.map(([k, l, n]) => `<button type="button" class="chip" data-shelf="${k}" aria-pressed="${k === "all" ? "true" : "false"}">${l}<b>${n}</b></button>`).join("");
  return `<div class="controls" id="gallery">
<label class="search"><span class="visually-hidden">Search themes</span><input type="search" data-search placeholder="search ${stats.total} themes — name, author, words" autocomplete="off"><kbd>/</kbd></label>
<span class="count-line"><span data-shown>${fixedShelf ? stats.shelves[fixedShelf] : stats.total}</span> shown</span>
<div class="row-2">
<div class="chips" data-chips="shelf"><span class="ink no-anim"></span>${chipHtml}</div>
<div class="chips" data-chips="sort"><span class="ink no-anim"></span><button type="button" class="chip" data-sort="fresh" aria-pressed="true">Fresh</button><button type="button" class="chip" data-sort="stars" aria-pressed="false">Stars</button><button type="button" class="chip" data-sort="new" aria-pressed="false">New</button><button type="button" class="chip" data-sort="az" aria-pressed="false">A–Z</button></div>
<button type="button" class="toggle" data-toggle="live" aria-pressed="false"><i></i>live only</button>
<button type="button" class="toggle" data-toggle="shot" aria-pressed="false"><i></i>screenshots</button>
</div>
</div>`;
};

function galleryPage({ list, fixedShelf = null, hero = "", path, title, description, current }) {
  const body = `<main class="wrap">
${hero}
${controls(fixedShelf)}
<section class="grid" data-grid>${list.map(card).join("\n")}<p class="empty" data-empty hidden>Nothing on this shelf matches. Loosen a filter.</p></section>
</main>`;
  return layout({ title, description, body, path, current });
}

// hero: the frame that keeps changing its clothes. Ranked by how much colour
// the theme actually declares (brand saturation, how far the background sits
// from stock), tokens before literals, so the first thing a visitor sees is
// the range of the registry and not thirty greys.
const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const satOf = ([r, g, b]) => { const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255; const l = (mx + mn) / 2; return mx === mn ? 0 : (l > 0.5 ? (mx - mn) / (2 - mx - mn) : (mx - mn) / (mx + mn)); };
const lumOf = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const colourScore = (t) => {
  const s = t.signature;
  const stockL = t.palette.leads === "light" ? 1 : 0.08;
  return satOf(rgbOf(s.brand)) * 2 + satOf(rgbOf(s.bg)) * 3 + satOf(rgbOf(s.surface)) + Math.abs(lumOf(rgbOf(s.bg)) - stockL) + (t.palette.source === "tokens" ? 0.6 : 0) + Math.min(t.stars ?? 0, 20) / 40;
};
const heroPool = themes
  .filter((t) => t.palette && (t.palette.source === "tokens" ? Math.max(t.palette.dark.changed, t.palette.light.changed) >= 3 : true))
  .map((t) => ({ t, score: colourScore(t) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 36)
  // interleave by hue-ish so neighbours in the cycle differ
  .sort((a, b) => (a.t.name.charCodeAt(0) * 7919 + a.t.name.length) % 97 - (b.t.name.charCodeAt(0) * 7919 + b.t.name.length) % 97)
  .map(({ t }) => ({ slug: t.slug, name: t.name, owner: t.owner, url: t.url, css: t.css?.path || null, sig: t.signature, light: t.palette.leads === "light" }));
const heroFirst = heroPool[0];

const decks = Object.entries(SHELVES).map(([k, v]) => {
  const top = themes.filter((t) => t.shelf === k && t.palette).sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0)).slice(0, 5);
  while (top.length < 5 && top.length > 0) top.push(top[top.length % top.length]);
  return { key: k, ...v, count: stats.shelves[k], top };
}).filter((d) => d.count > 0);

const heroHtml = `<section class="hero">
<div class="hero-copy">
<p class="eyebrow">DeepSeek Harness · community themes · not a store</p>
<h1>Every dsh theme,<br><b>in its own colours.</b></h1>
<p class="lede">A theme is a stylesheet. We read each one, resolve its <code>--dsw-*</code> tokens against the stock rc.6 shell, and paint the harness with what it declares — no screenshot needed, nothing invented. Then you wear it in one line.</p>
<div class="hero-actions"><a class="btn primary" href="#gallery">Browse ${stats.total} themes ${ICONS.arrow}</a><button type="button" class="btn" data-surprise>${ICONS.shuffle} Surprise me</button></div>
<div class="stats"><span><b data-count="${stats.total}">${stats.total}</b>themes</span><span><b data-count="${stats.signatures}">${stats.signatures}</b>colour signatures</span><span><b data-count="${stats.live}">${stats.live}</b>live on the shell</span><span><b data-count="${stats.shots}">${stats.shots}</b>screenshots</span></div>
</div>
<div class="hero-stage">
<a id="hero-mini-link" href="${heroFirst ? heroFirst.url : "/"}" aria-label="open the theme currently shown">${mini(heroFirst?.sig || null, { cls: "mini-lg", light: heroFirst?.light })}</a>
<div class="hero-label"><span class="swap" data-hero-label><span><b>${esc(heroFirst?.name || "")}</b> <i>by ${esc(heroFirst?.owner || "")}</i></span></span><a class="source" href="/about/#signatures">painted from its stylesheet ↗</a></div>
<script>window.__HERO__=${JSON.stringify(heroPool)};</script>
</div>
</section>
<div class="section-head"><h2>Shelves</h2><span class="rule"></span><a href="/about/#shelves">what the shelves mean</a></div>
<section class="decks">${decks.map((d) => `<a class="deck" href="/shelf/${d.slug}/"><div class="deck-cards">${d.top.map((t) => mini(t.signature)).join("")}</div><h3>${esc(d.label)} <b>${d.count}</b></h3><p>${esc(d.blurb)}</p></a>`).join("")}</section>
<div class="section-head"><h2>All themes</h2><span class="rule"></span><a href="${REGISTRY_URL}" rel="noopener">add yours to the registry</a></div>`;

// ---------------------------------------------------------------------------
// theme page
function themePage(t) {
  const sib = themes.filter((x) => x.shelf === t.shelf && x.slug !== t.slug).sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0)).slice(0, 6);
  const shelfCount = stats.shelves[t.shelf];
  const pal = t.palette;
  const sig = t.signature;
  const views = [];
  if (t.hasLive) views.push(["live", "Live"]);
  if (t.hasShot) views.push(["shot", "Screenshot"]);
  views.push(["paint", "Signature"]);
  const first = views[0][0];
  const stageBody = `
${t.hasLive ? `<div data-view="live"${first !== "live" ? " hidden" : ""}><iframe title="${esc(t.name)} on the dsh shell" src="/preview/?theme=${esc(t.slug)}&scheme=dark&embed=1" loading="lazy" data-preview-frame></iframe></div>` : ""}
${t.hasShot ? `<div data-view="shot"${first !== "shot" ? " hidden" : ""}><img class="shot" src="${esc(t.preview)}" alt="${esc(t.name)} screenshot from its repository" decoding="async"></div>` : ""}
<div data-view="paint"${first !== "paint" ? " hidden" : ""}>${mini(sig, { note: sig ? null : "no stylesheet read", light: pal?.leads === "light" })}</div>
<span class="stage-note" data-stage-note${first === "live" ? "" : " hidden"}>the theme's CSS on the stock rc.6 shell — not a screenshot</span>`;

  const paletteRows = pal ? `<div class="palette" data-palette>${["bg", "surface", "border", "muted", "text", "brand"].map((k) => `<span class="sw"><i data-role="${k}" style="background:${sig[k]}"></i><span><b>${k}</b><span data-hex="${k}">${sig[k]}</span></span></span>`).join("")}</div>
<p class="meta">${pal.source === "tokens" ? `Resolved from <b>${pal.tokenCount}</b> <code>--dsw-*</code> declarations` : `Cast from the colour literals`} in <a href="${esc(t.cssBlobUrl)}" rel="noopener"><code>${esc(t.css.path)}</code></a>${pal.font ? ` · font <b>${esc(pal.font)}</b>` : ""}${pal.images ? " · ships images" : ""}. ${pal.source === "tokens" ? "" : "This theme restyles the chrome directly rather than through tokens, so this is a signature, not its palette."}</p>`
    : `<p class="meta">No stylesheet with colours was found in the repository${t.css ? ` (best candidate: <a href="${esc(t.cssBlobUrl)}" rel="noopener"><code>${esc(t.css.path)}</code></a>)` : ""}. ${t.hasShot ? "The screenshot above is the theme's own." : "Nothing is painted rather than something invented."}</p>`;

  const body = `<main class="wrap wrap-narrow">
<p class="crumbs"><a href="/">themes</a> / <a href="/shelf/${t.shelfInfo.slug}/">${esc(t.shelfInfo.label.toLowerCase())}</a> / ${esc(t.name)}</p>
<div class="tp-head">
<div><h1>${esc(t.name)}</h1><p class="by">by <a href="https://github.com/${esc(t.owner)}" rel="noopener">${esc(t.owner)}</a> · <a href="${esc(t.repoUrl)}" rel="noopener">${esc(t.repo)}${t.path ? "/" + esc(t.path) : ""}</a>${t.stars != null ? ` · ★ ${t.stars}` : ""}${t.pushedDays != null ? ` · pushed ${ago(t.pushedDays)}` : ""}${t.license ? ` · ${esc(t.license)}` : ""}</p></div>
<div class="tp-actions">${t.install ? `<button type="button" class="btn primary wear" data-cmd="${esc(t.install)}"><span class="ico"><span class="i-a">${ICONS.copy}</span><span class="i-b">${ICONS.check}</span></span><span class="lbl"><span class="l-a">Wear it</span><span class="l-b">Copied</span></span></button>` : ""}<a class="btn" href="${esc(t.repoUrl)}" rel="noopener">${ICONS.github} Repo</a></div>
</div>
<p class="tp-lede">${esc(t.description)}</p>
<section class="stage" aria-label="preview">
<div class="stage-bar"><span class="dots"><i></i><i></i><i></i></span><span>${t.hasLive ? "dsh web · 0.1.0-rc.6 shell" : t.hasShot ? "screenshot from the repository" : "colour signature"}</span><span class="spacer"></span>
${views.length > 1 ? `<div class="chips stage-tabs" data-chips="view"><span class="ink no-anim"></span>${views.map(([k, l], i) => `<button type="button" class="chip" data-view-tab="${k}" aria-pressed="${i === 0}">${l}</button>`).join("")}</div>` : ""}
${t.hasLive || pal ? `<div class="chips" data-chips="scheme"><span class="ink no-anim"></span><button type="button" class="chip" data-scheme="dark" aria-pressed="true">Dark</button><button type="button" class="chip" data-scheme="light" aria-pressed="false">Light</button></div>` : ""}
</div>
<div class="stage-body"${palAttrs(t)}>${stageBody}</div>
</section>

<div class="tp-grid">
<div class="panel">
<div class="row"><span class="label">Wear</span><div class="body">${t.install ? `<div class="cmd"><code>${esc(t.install)}</code><button type="button" class="btn wear" data-cmd="${esc(t.install)}"><span class="ico"><span class="i-a">${ICONS.copy}</span><span class="i-b">${ICONS.check}</span></span><span class="lbl"><span class="l-a">Copy</span><span class="l-b">Copied</span></span></button></div><p class="meta">Installs a plugin into your web profile. A plugin runs code in your harness — read the repo before you paste.${t.npm ? ` Also on npm as <code>${esc(t.npm)}</code>.` : ""}</p>` : `<p>${t.official ? "Ships with dsh — nothing to install." : `See the <a href="${esc(t.repoUrl)}" rel="noopener">repository</a> for how this one is applied.`}</p>`}</div></div>
<div class="row"><span class="label">Proof</span><div class="body">${t.evidenceUrl ? `<p><a href="${esc(t.evidenceUrl)}" rel="noopener"><code>${esc(t.evidence)}</code></a></p><p class="meta">The file in the repository that proves the restyle path, as recorded by the registry on ${esc(t.lastVerified)} against dsh ${esc(t.verifiedAgainst)}.</p>` : `<p class="warn">${esc(t.status)}</p><p class="meta">The registry has not recorded a proving file for this entry.</p>`}</div></div>
<div class="row"><span class="label">Colours</span><div class="body">${paletteRows}</div></div>
<div class="row"><span class="label">Shelf</span><div class="body"><p><a href="/shelf/${t.shelfInfo.slug}/">${esc(t.shelfInfo.label)}</a> · ${shelfCount} on this shelf, ${esc(t.shelfInfo.blurb)}.</p><p class="meta">Added to the registry ${esc(t.added)}${t.notes ? ` · ${esc(t.notes)}` : ""}${t.homepage ? ` · <a href="${esc(t.homepage)}" rel="noopener">homepage</a>` : ""}</p></div></div>
</div>
<aside class="tp-side">
${mini(pal ? pal.dark : null, { light: false })}
<p class="cap">Signature, dark ${pal ? `· ${pal.dark.changed} of 6 roles set by the theme` : ""}</p>
${pal ? `<div style="height:.8rem"></div>${mini(pal.light, { light: true })}<p class="cap">Signature, light · ${pal.light.changed} of 6 roles set by the theme</p>` : ""}
</aside>
</div>

<p class="not"><b>Not:</b> this page is not evidence that the theme is safe to run, that it renders like this in your dsh today, or that its author endorses this rendering. The live view is its CSS on a static copy of the rc.6 shell; the signature is derived from its stylesheet on ${esc(stats.enriched)}; the screenshot is whatever the repository published.</p>

${sib.length ? `<section class="also"><div class="section-head"><h2>Also on the ${esc(t.shelfInfo.label.toLowerCase())} shelf</h2><span class="rule"></span><a href="/shelf/${t.shelfInfo.slug}/">all ${shelfCount}</a></div><div class="grid">${sib.map(card).join("")}</div></section>` : ""}
</main>`;
  const description = `${t.name} — ${t.description.slice(0, 150)}${t.description.length > 150 ? "…" : ""} A ${t.shelfInfo.one} for DeepSeek Harness, painted in its own colours.`;
  return layout({ title: `${t.name} — a dsh ${t.shelfInfo.one} by ${t.owner} · dshthemes`, description, body, path: t.url, current: "/" });
}

// ---------------------------------------------------------------------------
// about
const aboutBody = `<main class="wrap prose">
<h1>What this is</h1>
<p><b>dshthemes.com</b> shows every community theme for DeepSeek Harness (dsh) in its own colours, and gives you the one line to wear it. It is a reader of <a href="${REGISTRY_URL}" rel="noopener">dshworks/awesome-dsh-themes</a> — the open registry where every <code>verified</code> row names the file it was verified from — and never a second source of truth.</p>
<h2 id="signatures">Colour signatures</h2>
<p>Most themes have no screenshot. Rather than show ${stats.total - stats.shots} whale placeholders, this site reads each theme's stylesheet — a <code>.css</code>, or the template string in <code>src/client/style.ts</code> that dsh plugins usually keep it in — and paints a dsh-shaped frame from six roles: background, surface, border, muted, text, brand.</p>
<ul>
<li><b>From tokens</b> (${stats.fromTokens}): the theme declares <code>--dsw-*</code> custom properties. They are resolved against the stock 0.1.0-rc.6 <code>design-platform.css</code>, following <code>var()</code> and <code>light-dark()</code>, and composited over the scheme's base. This is what the theme says its palette is.</li>
<li><b>From literals</b> (${stats.signatures - stats.fromTokens}): the theme restyles hashed classes directly, so its colour literals are ranked and cast — darkest opaque as background, best contrast as text, most saturated as brand. This is a signature, not a palette, and every page says which.</li>
<li><b>Nothing</b> (${stats.total - stats.signatures}): no colours in code (wallpaper loaders, pets, pure images). The card stays grey and says so. Nothing is invented.</li>
</ul>
<p>Every theme page links the exact file the colours came from. If we read the wrong one, <a href="https://github.com/dshworks/dshthemes/issues" rel="noopener">tell us</a>; if the theme sets <code>previewCss</code> in the registry, that file wins.</p>
<h2>Live on the shell</h2>
<p>${stats.live} themes carry a <code>previewCss</code> in the registry. For those the theme page injects that stylesheet into a static copy of the rc.6 web shell (MIT, vendored from <code>@deepseek-ai/dsh-client-ui-*</code>). It is the theme's CSS on the real chrome, not a screenshot — and not a plugin runtime, so anything the plugin does in JavaScript is absent.</p>
<h2 id="shelves">Shelves</h2>
<table><tr><th>shelf</th><th>count</th><th>meaning</th></tr>${Object.entries(SHELVES).filter(([k]) => stats.shelves[k]).map(([k, v]) => `<tr><td><a href="/shelf/${v.slug}/">${v.label}</a></td><td>${stats.shelves[k]}</td><td>${esc(v.blurb)}</td></tr>`).join("")}</table>
<p>A shelf is where the registry filed it, not a verdict on quality.</p>
<h2>Motion</h2>
<p>The springs (chips, the copy button, the fanning decks) are Motion-style springs — stiffness 600 / damping 25 for snaps, 180 / 20 / mass 0.8 for the fan — sampled into CSS <code>linear()</code> at build time, after <a href="https://amicro.vercel.app/" rel="noopener">Amicro</a>'s vocabulary. No animation runtime ships. Everything stops under <code>prefers-reduced-motion</code>.</p>
<h2>Data</h2>
<p><a href="/themes.json">/themes.json</a> is the site's projection: registry rows plus stars, last push, the stylesheet read and the signature. <a href="/llms.txt">/llms.txt</a> is the map for agents. Registry ${esc(stats.updated)}, colours read ${esc(stats.enriched)}, verified against dsh ${esc(stats.verifiedAgainst)}.</p>
<p>Not affiliated with DeepSeek. Source: <a href="https://github.com/dshworks/dshthemes" rel="noopener">dshworks/dshthemes</a>.</p>
</main>`;

// ---------------------------------------------------------------------------
// emit
rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, "assets"), { recursive: true });
mkdirSync(join(DIST, "t"), { recursive: true });
mkdirSync(join(DIST, "shelf"), { recursive: true });
mkdirSync(join(DIST, "about"), { recursive: true });

const write = (p, s) => { mkdirSync(dirname(join(DIST, p)), { recursive: true }); writeFileSync(join(DIST, p), s); };

write("assets/site.css", readFileSync(join(SRC, "styles.css"), "utf8").replace("/*SPRINGS*/", springCss()));
write("assets/app.js", readFileSync(join(SRC, "app.js"), "utf8"));
write("assets/chrome.css", readFileSync(join(SRC, "chrome.css"), "utf8"));
cpSync(join(SRC, "vendor"), join(DIST, "vendor"), { recursive: true });
write("favicon.svg", readFileSync(join(SRC, "favicon.svg"), "utf8"));
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
write("_headers", `/assets/*\n  Cache-Control: public, max-age=3600\n/vendor/*\n  Cache-Control: public, max-age=86400\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n`);

const sortedFresh = [...themes].sort((a, b) => (b.pushedAt || "").localeCompare(a.pushedAt || "") || a.name.localeCompare(b.name));
write("index.html", galleryPage({ list: sortedFresh, hero: heroHtml, path: "/", current: "/", title: "dshthemes — every DeepSeek Harness theme, in its own colours", description: `${stats.total} community themes for DeepSeek Harness (dsh), each painted from its own stylesheet, ${stats.live} live on the rc.6 shell, one line to wear any of them.` }));
for (const [k, v] of Object.entries(SHELVES)) {
  const list = sortedFresh.filter((t) => t.shelf === k);
  if (!list.length) continue;
  write(`shelf/${v.slug}/index.html`, galleryPage({ list, fixedShelf: k, path: `/shelf/${v.slug}/`, current: "/", hero: `<div class="section-head" style="margin-top:2.4rem"><h2>Shelf</h2><span class="rule"></span></div><h1 style="font-size:1.6rem;margin-bottom:.4rem">${esc(v.label)} <span style="color:var(--muted);font-weight:300">· ${list.length}</span></h1><p style="color:var(--muted);max-width:60ch;margin-bottom:1.6rem">${esc(v.blurb)}. Every card is painted from the theme's own stylesheet; <a href="/about/#signatures">how</a>.</p>`, title: `${v.label} — ${list.length} dsh themes · dshthemes`, description: `${list.length} DeepSeek Harness themes on the ${v.label.toLowerCase()} shelf: ${v.blurb}. Each in its own colours, one line to wear.` }));
}
for (const t of themes) write(`t/${t.slug}/index.html`, themePage(t));
write("about/index.html", layout({ title: "About — dshthemes", description: "How dshthemes.com paints every dsh theme in its own colours, what the shelves mean, and where the data comes from.", body: aboutBody, path: "/about/", current: "/about/" }));
write("404.html", layout({ title: "Not here — dshthemes", description: "No such page.", body: `<main class="wrap prose"><h1>Not here.</h1><p>No theme lives at this address. Try the <a href="/">gallery</a>, or a <a href="/" data-surprise>random one</a>.</p></main>`, path: "/404", current: "" }));

// preview: mock shell + slug -> {name, css, install} map
const previewData = Object.fromEntries(themes.filter((t) => t.hasLive).map((t) => [t.slug, { name: t.name, css: t.previewCss, install: t.install }]));
write("preview/index.html", readFileSync(join(SRC, "preview.head.html"), "utf8") + readFileSync(join(SRC, "preview.tail.html"), "utf8").replace("/*PREVIEW_DATA*/{}", JSON.stringify(previewData)));

// og.html: the social card, rendered to src/og.png by scripts/og.mjs (needs a
// browser); the build copies whatever og.png exists. Not linked from the site.
const ogPool = heroPool.slice(0, 7);
write("og.html", `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>og</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;700&display=swap">
<link rel="stylesheet" href="/assets/site.css">
<style>
html,body{margin:0;background:#000;color:#e8e8e8;width:1200px;height:630px;overflow:hidden}
:root{color-scheme:only dark}
.og{position:relative;width:1200px;height:630px;padding:70px 80px;box-sizing:border-box;font-family:var(--mono)}
.og .brand{font-size:26px;font-weight:700}.og .brand i{font-style:normal;font-weight:300;color:#9a9a9a}.og .brand .caret{color:#e41478}
.og h1{font-size:60px;font-weight:300;letter-spacing:-.03em;line-height:1.05;margin:36px 0 0;color:#fff;max-width:760px}
.og h1 b{font-weight:700}
.og p{font-size:20px;color:#9a9a9a;margin:26px 0 0;max-width:520px;line-height:1.5}
.og .fan{position:absolute;right:250px;bottom:150px;width:190px;height:122px}
.og .fan .mini{position:absolute;inset:0;aspect-ratio:auto;height:100%;font-size:11px;border-radius:8px;transform-origin:50% 100%;box-shadow:0 20px 40px -18px rgba(0,0,0,.9)}
.og .stat{position:absolute;left:80px;bottom:60px;font-size:16px;color:#9a9a9a}.og .stat b{color:#fff;font-weight:700}
</style></head><body><div class="og">
<div class="brand"><span class="caret">&gt;</span> dsh<i>themes</i>.com</div>
<h1>Every dsh theme,<br><b>in its own colours.</b></h1>
<p>${stats.total} DeepSeek Harness themes, each painted from its own stylesheet. One line to wear any of them.</p>
<div class="fan">${ogPool.map((t, i) => { const n = ogPool.length, d = i - (n - 1) / 2; return mini(t.sig, { light: t.light }).replace(' style="', ` style="transform:translate(${Math.round(d * 52)}px,${Math.round(Math.abs(d) * 8)}px) rotate(${Math.round(d * 10)}deg);z-index:${10 - Math.abs(Math.round(d))};`); }).join("")}</div>
<div class="stat"><b>${stats.signatures}</b> colour signatures · <b>${stats.live}</b> live on the shell · <b>${stats.shots}</b> screenshots</div>
</div></body></html>`);
try { cpSync(join(SRC, "og.png"), join(DIST, "og.png")); } catch { console.error("note: no src/og.png yet — run scripts/og.mjs"); }

// data projection
write("themes.json", JSON.stringify({
  site: SITE, registry: REGISTRY_URL, updated: stats.updated, enriched: stats.enriched, stats,
  themes: themes.map((t) => ({
    slug: t.slug, url: SITE + t.url, name: t.name, repo: t.repo, path: t.path || null, owner: t.owner, shelf: t.shelf, kind: t.kind, official: Boolean(t.official),
    status: t.status, evidence: t.evidence || null, added: t.added, lastVerified: t.lastVerified, verifiedAgainst: t.verifiedAgainst,
    description: t.description, license: t.license, npm: t.npm || null, install: t.install, preview: t.preview || null, previewCss: t.previewCss || null,
    stars: t.stars, pushedAt: t.pushedAt, homepage: t.homepage,
    stylesheet: t.css ? { path: t.css.path, url: t.css.url, tokens: t.css.tokens } : null,
    signature: t.palette ? { source: t.palette.source, leads: t.palette.leads, font: t.palette.font, dark: t.palette.dark, light: t.palette.light } : null,
  })),
}, null, 1));

// sitemap + llms
const urls = ["/", "/about/", ...Object.values(SHELVES).filter((v) => stats.shelves[shelfBySlug[v.slug]]).map((v) => `/shelf/${v.slug}/`), ...themes.map((t) => t.url)];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`);
write("llms.txt", `# dshthemes

> Every DeepSeek Harness (dsh) community theme, painted in its own colours, with the one line to wear it. A reader of the dshworks/awesome-dsh-themes registry — never a second source of truth.

${stats.total} themes · ${stats.signatures} colour signatures (${stats.fromTokens} resolved from --dsw-* tokens, the rest cast from colour literals) · ${stats.live} live on the rc.6 shell · ${stats.shots} screenshots. Registry ${stats.updated}, colours read ${stats.enriched}.

## Pages
- ${SITE}/ : gallery, filter by shelf, sort by fresh / stars / new / a-z
- ${SITE}/about/ : how signatures are derived, what shelves mean
- ${SITE}/themes.json : full projection (registry rows + stars, last push, stylesheet read, signature)
${Object.values(SHELVES).filter((v) => stats.shelves[shelfBySlug[v.slug]]).map((v) => `- ${SITE}/shelf/${v.slug}/ : ${v.label} (${stats.shelves[shelfBySlug[v.slug]]})`).join("\n")}

## Themes
${themes.map((t) => `- ${SITE}${t.url} : ${t.name} — ${t.shelfInfo.one} by ${t.owner}${t.hasLive ? " (live)" : ""}`).join("\n")}
`);

console.error(`built ${themes.length} theme pages, ${stats.signatures} signatures (${stats.fromTokens} tokens), ${stats.live} live, ${stats.shots} shots → dist/`);
