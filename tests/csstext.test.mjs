import { test } from "node:test";
import assert from "node:assert/strict";
import { absolutiseUrls, extractCss, looksLikeCss, touchesShell } from "../scripts/csstext.mjs";

test("a .css file is taken as it stands", () => {
  const src = "body { color: red; }";
  assert.deepEqual(extractCss(src, "src/client/skin.css"), { css: src, mode: "verbatim" });
});

test("the template string dsh plugins keep their sheet in comes out whole", () => {
  const src = `
    import { register } from "dsh";
    export const style = \`
      body[data-dsh-mine] {
        --dsw-alias-bg-primary: #101014;
        --dsw-alias-label-primary: #e7e7ea;
        --dsw-alias-brand-primary: #7bd88f;
      }
    \`;
    register({ style });
  `;
  const { css, mode } = extractCss(src, "src/client/style.ts");
  assert.equal(mode, "extracted");
  assert.match(css, /--dsw-alias-brand-primary: #7bd88f/);
  assert.doesNotMatch(css, /register|import/);
});

test("a declaration built from an interpolation is dropped, not shipped broken", () => {
  const src = "const s = `body[data-dsh-x] { color: ${theme.text}; background: #0b0b0d; border-color: #222; font-size: 14px; }`;";
  const { css } = extractCss(src, "style.ts");
  assert.doesNotMatch(css, /\$\{/);
  assert.doesNotMatch(css, /color: ;|color: HOLE/);
  assert.match(css, /background: #0b0b0d/);
  assert.match(css, /font-size: 14px/);
});

test("strings that are not stylesheets stay out", () => {
  assert.equal(looksLikeCss('{"a": 1, "b": 2, "c": 3, "d": 4, "e": 5, "f": 6}'), false);
  assert.equal(looksLikeCss("<div class='x'>{ a: 1; b: 2; c: 3; }</div>"), false);
  assert.equal(looksLikeCss("hello"), false);
  assert.equal(looksLikeCss(".a { color: red; background: blue; border: 0; padding: 4px; margin: 0 auto; }"), true);
});

test("a sheet that only styles the plugin's own elements does not reach the shell", () => {
  const own = ".naiwa-brand-wordmark::before { content: 'x'; color: red; font-size: 21px; }";
  const reach = touchesShell(own);
  assert.equal(reach.tokens + reach.hostAttrs + reach.shellClasses + reach.roots, 0);
});

test("the shell's own compiled class names count as reach", () => {
  const reach = touchesShell(".hHd-Xa_root { background: #000; } .pI_x6G_frame { color: #fff; }");
  assert.equal(reach.shellClasses, 2);
});

test("relative urls are resolved against the sheet's real home", () => {
  // The second assertion here used to require `/img/x.jpg` to resolve to
  // `.../src/client/img/x.jpg`, and that is what shipped: a leading slash was
  // stripped and the rest treated as a repo path. It is the assertion that
  // let 94 of 133 remote assets in the frozen stylesheets be 404s. A test can
  // be the thing that is wrong.
  const css = "body { background: url(./bg.png); } .a { background: url('/img/x.jpg'); }";
  const out = absolutiseUrls(css, "https://raw.githubusercontent.com/o/r/main/src/client/skin.css");
  assert.match(out, /url\("https:\/\/raw\.githubusercontent\.com\/o\/r\/main\/src\/client\/bg\.png"\)/);
  assert.match(out, /url\('\/img\/x\.jpg'\)/, "a root-absolute route must be left exactly as written");
});

test("absolute and data urls are left alone", () => {
  const css = "a { background: url(data:image/png;base64,AAA); } b { background: url(https://x.test/y.png); }";
  assert.equal(absolutiseUrls(css, "https://raw.githubusercontent.com/o/r/main/a.css"), css);
});

test("a root-absolute url is a runtime route, not a repo path", () => {
  // `/skin-assets/bg.webp` is served by the plugin inside dsh. Resolving it
  // against the repo produces a path that has never existed there -- which is
  // how 94 of 133 remote assets in the frozen stylesheets came to be 404.
  const css = "body { background: url('/skin-assets/bg.webp'); }";
  assert.equal(absolutiseUrls(css, "https://raw.githubusercontent.com/o/r/main/skin.css"), css);
});

test("a percent-encoded fragment is still a fragment", () => {
  // Some bundlers write `url(#n)` out as `url(%23n)`. The `#` guard never saw
  // it, so an SVG filter reference became a repository path.
  const css = "filter: url('%23n');";
  assert.equal(absolutiseUrls(css, "https://raw.githubusercontent.com/o/r/main/lib/skin.css"), css);
});

test("a build-time token is not a path", () => {
  const css = "src: url(__ARC_FONT_EXO__);";
  assert.equal(absolutiseUrls(css, "https://raw.githubusercontent.com/o/r/main/src/skin.css"), css);
});

test("a relative url still resolves against the stylesheet", () => {
  const css = "body { background: url('img/bg.png'); }";
  assert.match(
    absolutiseUrls(css, "https://raw.githubusercontent.com/o/r/main/src/skin.css"),
    /url\("https:\/\/raw\.githubusercontent\.com\/o\/r\/main\/src\/img\/bg\.png"\)/,
  );
});

// A WebGL theme keeps its shaders in template strings too, and `cond ? a : b;`
// counts as a declaration to anything that only counts colons. Three sheets
// came back as GLSL on the first run.
test("shader source is not a stylesheet", () => {
  const glsl = `
    float sdRoundedBox(vec2 p, vec2 b, float r) {
      vec2 q = abs(p) - b + r;
      return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
    }
    void main() {
      float d = sdRoundedBox(uv, vec2(0.5), 0.1);
      gl_FragColor = d > 0.0 ? vec4(1.0) : vec4(0.0);
    }
  `;
  assert.equal(looksLikeCss(glsl), false);
  assert.equal(extractCss(`const frag = \`${glsl}\`;`, "client.js").css, "");
});

test("a colon in a ternary is not a declaration", () => {
  const js = "const pick = (a, b, c) => { return a ? b : c; }; const x = { q: 1, w: 2, e: 3 };";
  assert.equal(extractCss(js, "client.js").css, "");
});

// Some themes ship the CSS-modules source rather than its compiled output.
// `:global(body)` is not something a browser understands, so the whole sheet
// was rendering as nothing.
test(":global() is unwrapped the way the compiler would have", () => {
  const src = ":global(body) { background: #101014; } :global([class$='_frame']) { border: 0; }";
  const { css } = extractCss(src, "src/client/skin.module.css");
  assert.match(css, /^body \{/);
  assert.match(css, /\[class\$='_frame'\] \{/);
  assert.doesNotMatch(css, /:global/);
});

test("an attribute-suffix selector reaches the shell too", () => {
  assert.ok(touchesShell("[class$='_frame'] { background: #000; }").shellClasses >= 1);
});
