// Pure functions: read a theme's CSS, resolve its --dsw-* tokens against the
// vendored rc.6 defaults, and return the handful of colours a card needs.
//
// This is a signature, not a render. It answers "what colours does this theme
// actually declare" from the theme's own stylesheet, so a card can be painted
// for a theme that has no screenshot. Where the theme sets no tokens at all it
// falls back to the colour literals it does contain, and says so (`source`).

const TOKEN_RE = /--([a-zA-Z0-9_-]+)\s*:\s*([^;{}]+?)\s*(?:;|(?=\}))/g;

// The six roles a card paints, each with the token order tried.
export const ROLES = {
  bg: ["dsw-alias-bg-base", "dsw-alias-bg-layer-1"],
  surface: ["dsw-alias-bg-layer-1", "dsw-alias-bg-layer-2", "dsw-alias-bg-base"],
  text: ["dsw-alias-label-primary", "dsw-alias-label-primary-foreground"],
  muted: ["dsw-alias-label-secondary", "dsw-alias-label-tertiary", "dsw-alias-label-dimmed"],
  brand: ["dsw-alias-brand-primary", "dsw-alias-button-primary-fill", "dsw-static-deepseek-500"],
  border: ["dsw-alias-border-l1", "dsw-alias-border-l2", "dsw-alias-border-l3"],
};

export function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

// Split a stylesheet into { selector, media, decls } blocks. Handles one level
// of @media nesting (prefers-color-scheme) and ignores other at-rules' bodies
// (@font-face, @keyframes) since they carry no tokens we want.
export function parseBlocks(css) {
  const src = stripComments(css);
  const out = [];
  const stack = []; // media strings
  let i = 0;
  const n = src.length;
  while (i < n) {
    const open = src.indexOf("{", i);
    if (open < 0) break;
    const head = src.slice(i, open).trim();
    const lastSemi = head.lastIndexOf(";");
    const selector = (lastSemi >= 0 ? head.slice(lastSemi + 1) : head).trim();
    if (/^@media/i.test(selector) || /^@supports/i.test(selector) || /^@layer/i.test(selector) || /^@container/i.test(selector)) {
      stack.push(selector);
      i = open + 1;
      continue;
    }
    if (selector.startsWith("@")) {
      // skip the whole at-rule body
      let depth = 1;
      let j = open + 1;
      while (j < n && depth > 0) {
        if (src[j] === "{") depth++;
        else if (src[j] === "}") depth--;
        j++;
      }
      i = j;
      continue;
    }
    // ordinary rule: find matching close (no nesting expected, but be safe)
    let depth = 1;
    let j = open + 1;
    while (j < n && depth > 0) {
      if (src[j] === "{") depth++;
      else if (src[j] === "}") depth--;
      j++;
    }
    const body = src.slice(open + 1, j - 1);
    const decls = [];
    let m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(body))) decls.push([m[1], m[2].trim()]);
    if (decls.length) out.push({ selector, media: stack.join(" "), decls });
    i = j;
    // pop closed media blocks: count stray '}' immediately following
    while (i < n) {
      const k = src.slice(i).search(/\S/);
      if (k < 0) { i = n; break; }
      if (src[i + k] === "}") { stack.pop(); i = i + k + 1; } else { i = i + k; break; }
    }
  }
  return out;
}

// dark | light | both, from the selector and enclosing media.
export function scopeOf(selector, media = "") {
  const s = selector.toLowerCase();
  const m = media.toLowerCase();
  if (/prefers-color-scheme\s*:\s*dark/.test(m)) return "dark";
  if (/prefers-color-scheme\s*:\s*light/.test(m)) return "light";
  // ":not([data-ds-dark-theme])" is the light hook; do not let it read as dark.
  const sNoNot = s.replace(/:not\(\s*\[data-ds-dark-theme\]\s*\)/g, "");
  const dark = /data-ds-dark-theme|\.dark\b|\[data-theme\s*=\s*['"]?dark|data-dsw-theme\s*=\s*['"]?dark|\[data-color-scheme\s*=\s*['"]?dark|\.theme-dark|\bdark-mode\b/.test(sNoNot);
  const light = /\[data-theme\s*=\s*['"]?light|data-dsw-theme\s*=\s*['"]?light|:not\(\[data-ds-dark-theme\]\)|\.light\b|\.theme-light|\blight-mode\b/.test(s);
  if (dark && !light) return "dark";
  if (light && !dark) return "light";
  return "both";
}

// Declarations written as JS rather than CSS: {"--dsw-x": "#fff"},
// setProperty("--dsw-x", "#fff"), or '--dsw-x': `#fff`. Scope is unknowable
// without running the code, so they land in both scopes.
const LOOSE_RE = /["'`]--([a-zA-Z0-9_-]+)["'`]\s*[:,]\s*["'`]([^"'`\n]{1,120})["'`]/g;
export function looseDecls(text) {
  const out = [];
  let m;
  LOOSE_RE.lastIndex = 0;
  while ((m = LOOSE_RE.exec(text))) out.push([m[1], m[2].trim()]);
  return out;
}

// Build {dark, light} maps of token -> raw value, base sheets first, theme last.
export function collect(sheets) {
  const dark = new Map();
  const light = new Map();
  for (const css of sheets) {
    for (const b of parseBlocks(css)) {
      const scope = scopeOf(b.selector, b.media);
      for (const [k, v] of b.decls) {
        if (scope === "dark" || scope === "both") dark.set(k, v);
        if (scope === "light" || scope === "both") light.set(k, v);
      }
    }
    for (const [k, v] of looseDecls(css)) {
      if (!dark.has(k)) dark.set(k, v);
      if (!light.has(k)) light.set(k, v);
    }
  }
  return { dark, light };
}

const NAMED = {
  white: "#ffffff", black: "#000000", red: "#ff0000", blue: "#0000ff", green: "#008000",
  gray: "#808080", grey: "#808080", silver: "#c0c0c0", navy: "#000080", teal: "#008080",
  purple: "#800080", orange: "#ffa500", pink: "#ffc0cb", yellow: "#ffff00", cyan: "#00ffff",
  magenta: "#ff00ff", transparent: null,
};

// Parse a single colour token to [r,g,b,a] or null.
export function parseColor(v) {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  if (s in NAMED) return NAMED[s] ? [...hexToRgb(NAMED[s]), 1] : [0, 0, 0, 0];
  let m;
  if ((m = /^#([0-9a-f]{3,8})$/.exec(s))) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
  }
  if ((m = /^rgba?\(\s*([^)]+)\)$/.exec(s))) {
    const parts = m[1].replace(/\//g, " ").split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const ch = parts.slice(0, 3).map((p) => (p.endsWith("%") ? Math.round(parseFloat(p) * 2.55) : parseFloat(p)));
    if (ch.some((x) => Number.isNaN(x))) return null;
    let a = 1;
    if (parts[3] != null) a = parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    if (Number.isNaN(a)) a = 1;
    return [...ch.map((x) => Math.max(0, Math.min(255, x))), Math.max(0, Math.min(1, a))];
  }
  if ((m = /^hsla?\(\s*([^)]+)\)$/.exec(s))) {
    const parts = m[1].replace(/\//g, " ").split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const h = parseFloat(parts[0]);
    const sat = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;
    if ([h, sat, l].some((x) => Number.isNaN(x))) return null;
    let a = 1;
    if (parts[3] != null) a = parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    const c = (1 - Math.abs(2 * l - 1)) * sat;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const mm = l - c / 2;
    let [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [Math.round((r + mm) * 255), Math.round((g + mm) * 255), Math.round((b + mm) * 255), Number.isNaN(a) ? 1 : a];
  }
  return null;
}

function hexToRgb(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

export function toHex([r, g, b]) {
  return "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
}

export function composite(rgba, over) {
  const [r, g, b, a] = rgba;
  const [R, G, B] = over;
  return [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)];
}

export function luminance([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function saturation([r, g, b]) {
  const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  if (max === min) return 0;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

// Resolve a raw CSS value to a colour in the given scope, following var()
// references (with fallbacks) and light-dark(). Returns [r,g,b,a] or null.
export function resolveValue(raw, scopes, scope, depth = 0) {
  if (!raw || depth > 12) return null;
  let v = raw.trim();
  // light-dark(a, b)
  let m = /^light-dark\((.+)\)$/i.exec(v);
  if (m) {
    const [a, b] = splitTop(m[1]);
    return resolveValue(scope === "dark" ? b : a, scopes, scope, depth + 1);
  }
  m = /^var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*([\s\S]+))?\)$/.exec(v);
  if (m) {
    const name = m[1].slice(2);
    const own = scopes[scope].get(name);
    const other = scopes[scope === "dark" ? "light" : "dark"].get(name);
    const viaOwn = own ? resolveValue(own, scopes, scope, depth + 1) : null;
    if (viaOwn) return viaOwn;
    const viaOther = other ? resolveValue(other, scopes, scope, depth + 1) : null;
    if (viaOther) return viaOther;
    return m[2] ? resolveValue(m[2], scopes, scope, depth + 1) : null;
  }
  // color-mix(in srgb, A 60%, B) — take A. Approximate, honestly labelled by
  // being a card colour and not a claim.
  m = /^color-mix\([^,]+,\s*([\s\S]+)\)$/i.exec(v);
  if (m) {
    const [a] = splitTop(m[1]);
    return resolveValue(a.replace(/\s+\d+(\.\d+)?%$/, ""), scopes, scope, depth + 1);
  }
  // "rgb(var(--x))" style — expand inner vars first
  if (/var\(/.test(v)) {
    const expanded = v.replace(/var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*([^()]+))?\)/g, (_, name, fb) => {
      const r = resolveRaw(name.slice(2), scopes, scope, depth + 1);
      return r ?? fb ?? "";
    });
    if (expanded !== v) return resolveValue(expanded, scopes, scope, depth + 1);
  }
  // shorthand backgrounds: "#fff url(...)": take the first colour token
  const first = v.split(/\s+(?![^()]*\))/)[0];
  return parseColor(v) || parseColor(first);
}

function resolveRaw(name, scopes, scope, depth) {
  if (depth > 12) return null;
  const own = scopes[scope].get(name) ?? scopes[scope === "dark" ? "light" : "dark"].get(name);
  if (!own) return null;
  const v = own.trim();
  const m = /^var\(\s*(--[a-zA-Z0-9_-]+)\s*(?:,\s*([\s\S]+))?\)$/.exec(v);
  if (m) return resolveRaw(m[1].slice(2), scopes, scope, depth + 1) ?? m[2] ?? null;
  return v;
}

function splitTop(s) {
  const out = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const SCOPE_BG = { dark: [10, 10, 12], light: [255, 255, 255] };

// Given base sheets + theme css, produce { dark, light } palettes and metadata.
export function extractPalette(baseSheets, themeCss) {
  const base = collect(baseSheets);
  const all = collect([...baseSheets, themeCss]);
  const themeOnly = collect([themeCss]);
  const tokenCount = [...new Set([...themeOnly.dark.keys(), ...themeOnly.light.keys()])].filter((k) => k.startsWith("dsw-")).length;
  const result = { tokenCount, dark: null, light: null, source: null, font: null, images: /url\(/.test(themeCss) };

  const fontRaw = themeOnly.dark.get("dsw-font-family") || themeOnly.light.get("dsw-font-family") || themeOnly.dark.get("ds-font-family") || themeOnly.light.get("ds-font-family");
  if (fontRaw) {
    const f = fontRaw.split(",")[0].replace(/['"]/g, "").trim();
    if (f && !/^var\(/.test(f) && f.length < 40) result.font = f;
  }

  for (const scope of ["dark", "light"]) {
    const pal = {};
    let changed = 0;
    for (const [role, tokens] of Object.entries(ROLES)) {
      let hex = null;
      let baseHex = null;
      for (const t of tokens) {
        const rgba = resolveValue(`var(--${t})`, all, scope);
        if (rgba) {
          hex = toHex(composite(rgba, SCOPE_BG[scope]));
          const b = resolveValue(`var(--${t})`, base, scope);
          baseHex = b ? toHex(composite(b, SCOPE_BG[scope])) : null;
          break;
        }
      }
      pal[role] = hex;
      if (hex && hex !== baseHex) changed++;
    }
    pal.changed = changed;
    result[scope] = pal;
  }

  const anyChanged = result.dark.changed + result.light.changed;
  if (anyChanged > 0) {
    result.source = "tokens";
  } else {
    const lit = literalsPalette(themeCss);
    if (lit) {
      result.source = "literals";
      result.dark = lit.dark;
      result.light = lit.light;
      result.leads = lit.leads;
      return result;
    }
    result.source = null;
  }
  // Which scope did the theme actually touch? A dark-only skin should lead dark.
  result.leads = result.dark.changed >= result.light.changed ? "dark" : "light";
  return result;
}

export function mix(aHex, bHex, t) {
  const a = hexToRgb(aHex), b = hexToRgb(bHex);
  return toHex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
}

// Fallback for stylesheets that restyle hashed classes without tokens: rank
// the colour literals they contain and cast roles from them. Opaque colours
// count fully; translucent ones (shadows, overlays) count a little, and
// composited black/white from an rgba() never gets to be the background.
export function literalsPalette(css) {
  const src = stripComments(css);
  const re = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;
  const counts = new Map();
  let m;
  while ((m = re.exec(src))) {
    const c = parseColor(m[0]);
    if (!c || c[3] < 0.35) continue;
    const opaque = c[3] >= 0.98;
    const key = toHex(composite(c, [10, 10, 12]));
    if (!opaque && saturation(c) < 0.08) continue; // translucent grey: a shadow, not a colour
    counts.set(key, (counts.get(key) || 0) + (opaque ? 1 : 0.3));
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  if (ranked.length < 2) return null;
  const rgb = (h) => hexToRgb(h);
  const top = ranked.slice(0, 24);
  const byLum = [...top].sort((a, b) => luminance(rgb(a)) - luminance(rgb(b)));
  const meanLum = top.reduce((s, h) => s + luminance(rgb(h)), 0) / top.length;
  const darkLeads = meanLum < 0.45;

  const cast = (dark) => {
    const bg = dark ? byLum[0] : byLum[byLum.length - 1];
    const others = top.filter((h) => h !== bg);
    const text = [...others].sort((a, b) => contrast(rgb(b), rgb(bg)) - contrast(rgb(a), rgb(bg)))[0];
    if (!text || contrast(rgb(text), rgb(bg)) < 2.5) return null;
    const brand = [...others]
      .filter((h) => h !== text && contrast(rgb(h), rgb(bg)) >= 1.8)
      .sort((a, b) => saturation(rgb(b)) - saturation(rgb(a)))[0] || text;
    const bgL = luminance(rgb(bg));
    const near = others.filter((h) => h !== text && h !== brand && Math.abs(luminance(rgb(h)) - bgL) < 0.06 && saturation(rgb(h)) < 0.5);
    const surface = near[0] || mix(bg, text, 0.06);
    return { bg, surface, text, muted: mix(text, bg, 0.35), brand, border: mix(bg, text, 0.14), changed: 1 };
  };
  const dark = cast(true);
  const light = cast(false);
  if (!dark && !light) return null;
  return { dark: dark || light, light: light || dark, leads: darkLeads ? "dark" : "light" };
}
