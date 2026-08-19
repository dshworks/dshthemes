/* dshthemes — the one script. Every page reads without it; it only upgrades
 * things already on the page: filters the grid, moves the chip ink, cycles the
 * hero's clothes, swaps the copy icon, drives the preview frame's scheme, and
 * names the element a view transition should carry across pages. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- theme control: auto -> light -> dark ------------------------------------
  const themectl = $("[data-themectl]");
  const applyTheme = (t) => {
    if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
    if (themectl) themectl.querySelector("b").textContent = t || "auto";
  };
  let theme = null;
  try { theme = localStorage.getItem("theme"); } catch {}
  applyTheme(theme);
  themectl?.addEventListener("click", () => {
    theme = theme === "light" ? "dark" : theme === "dark" ? null : "light";
    try { theme ? localStorage.setItem("theme", theme) : localStorage.removeItem("theme"); } catch {}
    applyTheme(theme);
  });

  // ---- chip ink: a pill that slides under the pressed chip (Amicro layoutId) ---
  function inkTo(group, chip, animate = true) {
    const ink = $(".ink", group);
    if (!ink || !chip) return;
    ink.classList.toggle("no-anim", !animate || reduced);
    ink.style.width = chip.offsetWidth + "px";
    ink.style.transform = `translateX(${chip.offsetLeft}px)`;
    if (!animate) requestAnimationFrame(() => ink.classList.remove("no-anim"));
  }
  function initChips(group) {
    const pressed = $('[aria-pressed="true"], [aria-current="page"]', group) || $(".chip", group);
    inkTo(group, pressed, false);
    group.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip || chip.tagName === "A") return;
      $$(".chip", group).forEach((c) => c.setAttribute("aria-pressed", c === chip ? "true" : "false"));
      inkTo(group, chip);
    });
  }
  $$("[data-chips]").forEach(initChips);
  addEventListener("resize", () => $$("[data-chips]").forEach((g) => inkTo(g, $('[aria-pressed="true"], [aria-current="page"]', g), false)));
  document.fonts?.ready.then(() => $$("[data-chips]").forEach((g) => inkTo(g, $('[aria-pressed="true"], [aria-current="page"]', g), false)));

  // ---- copy: "Wear it" -> "Copied", icon swaps up, label follows -----------------
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".wear[data-cmd]");
    if (!b) return;
    e.preventDefault();
    copy(b.dataset.cmd).then(() => {
      b.classList.add("is-copied");
      clearTimeout(b._t);
      b._t = setTimeout(() => b.classList.remove("is-copied"), 1600);
    });
  });

  // ---- count-up: easeOutExpo over 1.2s, tabular so nothing jitters ---------------
  const counts = $$("[data-count]");
  if (counts.length && !reduced) {
    const start = performance.now();
    const ease = (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x));
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 1200);
      for (const el of counts) el.textContent = Math.round(Number(el.dataset.count) * ease(p)).toLocaleString("en-US");
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ---- hero: the same frame keeps changing its clothes ---------------------------
  const heroLink = $("#hero-mini-link");
  const pool = window.__HERO__ || [];
  if (heroLink && pool.length > 1) {
    const frame = $(".mini", heroLink);
    const shotEl = $("[data-hero-shot]", heroLink);
    const source = $("[data-hero-source]");
    const label = $("[data-hero-label]");
    let i = 0, timer = null, paused = false;
    // The next few pictures are decoded before their turn, so a swap is a swap
    // and not a flash of the frame underneath.
    const warm = (n) => { for (let k = 1; k <= 3; k++) { const u = pool[(n + k) % pool.length]?.shot; if (u) new Image().src = u; } };
    const paint = (t) => {
      const s = t.sig;
      frame.style.cssText = `--c-bg:${s.bg};--c-surface:${s.surface};--c-text:${s.text};--c-muted:${s.muted};--c-brand:${s.brand};--c-border:${s.border}`;
      frame.classList.toggle("is-light", Boolean(t.light));
      if (shotEl) {
        if (t.shot) { shotEl.src = t.shot; shotEl.alt = `the dsh shell wearing ${t.name}`; shotEl.hidden = false; }
        else shotEl.hidden = true;
      }
      if (source) source.textContent = t.shot ? "its CSS on the real shell ↗" : "painted from its stylesheet ↗";
      heroLink.href = t.url;
      heroLink.dataset.slug = t.slug;
      if (label) {
        const old = label.firstElementChild;
        const next = document.createElement("span");
        next.className = "in";
        next.innerHTML = `<b>${t.name.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]))}</b> <i>by ${t.owner}</i>`;
        label.appendChild(next);
        // a timeout, not rAF: rAF does not fire in a background tab and the
        // label would pile up unswapped
        setTimeout(() => {
          next.classList.remove("in");
          old?.classList.add("out");
          setTimeout(() => old?.remove(), 500);
        }, 30);
      }
    };
    const step = () => { i = (i + 1) % pool.length; paint(pool[i]); warm(i); };
    const arm = () => { clearInterval(timer); if (!reduced) timer = setInterval(() => { if (!paused && !document.hidden) step(); }, 3200); };
    heroLink.addEventListener("pointerenter", () => { paused = true; });
    heroLink.addEventListener("pointerleave", () => { paused = false; });
    heroLink.addEventListener("click", () => clearInterval(timer));
    arm();
  }

  // ---- surprise me ---------------------------------------------------------------
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-surprise]");
    if (!b) return;
    e.preventDefault();
    const cards = $$(".card[data-slug]").filter((c) => !c.hidden);
    const from = cards.length ? cards : pool.map((p) => ({ dataset: { slug: p.slug } }));
    if (!from.length) { location.href = "/"; return; }
    const pick = from[Math.floor(Math.random() * from.length)];
    location.href = `/t/${pick.dataset.slug}/`;
  });

  // ---- gallery: filter, sort, search — all on the DOM already there --------------
  const grid = $("[data-grid]");
  if (grid) {
    const cards = $$(".card", grid);
    const shown = $("[data-shown]");
    const empty = $("[data-empty]");
    const search = $("[data-search]");
    const params = new URLSearchParams(location.search);
    const fixedShelf = $('.chips[data-chips="shelf"] a[aria-current="page"]');
    const state = {
      shelf: fixedShelf ? null : (params.get("shelf") || "all"),
      sort: params.get("sort") || "fresh",
      q: params.get("q") || "",
      live: params.get("live") === "1",
      shot: params.get("shot") === "1",
    };
    const setPressed = (sel, attr, val) => $$(sel).forEach((c) => { const on = c.dataset[attr] === val; c.setAttribute("aria-pressed", on ? "true" : "false"); if (on) inkTo(c.closest("[data-chips]"), c, false); });
    if (!fixedShelf) setPressed('.chip[data-shelf]', "shelf", state.shelf);
    setPressed('.chip[data-sort]', "sort", state.sort);
    $('[data-toggle="live"]')?.setAttribute("aria-pressed", String(state.live));
    $('[data-toggle="shot"]')?.setAttribute("aria-pressed", String(state.shot));
    if (search) search.value = state.q;

    const cmp = {
      fresh: (a, b) => (b.dataset.pushed || "").localeCompare(a.dataset.pushed || "") || a.dataset.name.localeCompare(b.dataset.name),
      stars: (a, b) => Number(b.dataset.stars) - Number(a.dataset.stars) || a.dataset.name.localeCompare(b.dataset.name),
      new: (a, b) => b.dataset.added.localeCompare(a.dataset.added) || a.dataset.name.localeCompare(b.dataset.name),
      az: (a, b) => a.dataset.name.localeCompare(b.dataset.name),
    };
    let raf = 0;
    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const q = state.q.trim().toLowerCase();
        const words = q.split(/\s+/).filter(Boolean);
        let n = 0;
        const visible = [];
        for (const c of cards) {
          const d = c.dataset;
          let ok = state.shelf === null || state.shelf === "all" || d.shelf === state.shelf;
          if (ok && state.live) ok = d.live === "1";
          if (ok && state.shot) ok = d.shot === "1";
          if (ok && words.length) {
            const hay = c._hay || (c._hay = `${d.name} ${d.owner} ${d.slug} ${(c.querySelector(".desc")?.textContent || "").toLowerCase()}`);
            ok = words.every((w) => hay.includes(w));
          }
          c.hidden = !ok;
          if (ok) { n++; visible.push(c); }
        }
        visible.sort(cmp[state.sort] || cmp.fresh);
        // reorder only the visible ones; hidden ones can sit anywhere
        for (const c of visible) grid.appendChild(c);
        if (empty) { empty.hidden = n > 0; grid.appendChild(empty); }
        if (shown) shown.textContent = n;
        const p = new URLSearchParams();
        if (state.shelf && state.shelf !== "all") p.set("shelf", state.shelf);
        if (state.sort !== "fresh") p.set("sort", state.sort);
        if (state.q) p.set("q", state.q);
        if (state.live) p.set("live", "1");
        if (state.shot) p.set("shot", "1");
        const qs = p.toString();
        history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + (location.hash || ""));
      });
    };
    document.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip[data-shelf], .chip[data-sort]");
      if (chip) {
        if (chip.dataset.shelf) state.shelf = chip.dataset.shelf;
        if (chip.dataset.sort) state.sort = chip.dataset.sort;
        apply();
      }
      const tog = e.target.closest("[data-toggle]");
      if (tog) {
        state[tog.dataset.toggle] = !state[tog.dataset.toggle];
        tog.setAttribute("aria-pressed", String(state[tog.dataset.toggle]));
        apply();
      }
    });
    search?.addEventListener("input", () => { state.q = search.value; apply(); });
    addEventListener("keydown", (e) => {
      if (e.key === "/" && !/input|textarea/i.test(document.activeElement?.tagName || "")) { e.preventDefault(); search?.focus(); }
      if (e.key === "Escape" && document.activeElement === search) { search.value = ""; state.q = ""; apply(); search.blur(); }
    });
    if (state.shelf !== "all" || state.sort !== "fresh" || state.q || state.live || state.shot) apply();
  }

  // ---- view transitions: the visual you clicked becomes the stage --------------
  // ---- sponsor board: an open seat demonstrates the purchase ------------------
  // The board renders complete without this; all it adds is the flap. An open
  // seat clatters through to a mark tagged SPECIMEN, holds it, then clatters
  // back to [+]. The point is that nobody has to read a sentence explaining
  // what buying the space would do — they watch it happen once.
  //
  // The tag is live for exactly as long as the mark is on screen. Under reduced
  // motion there is no loop at all: one seat settles on its specimen and stays,
  // so the offer still reads without anything moving.
  const board = $("[data-board]");
  if (board) {
    const CELLS = 24, FLAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\u00b7-.&+ ";
    const SPEC = "YOUR PRODUCT";
    const pad = (t) => t.slice(0, CELLS).padEnd(CELLS, " ");
    const openRows = $$("[data-open]", board);
    const write = (row, text) => {
      const cells = $$(".cell", row);
      pad(text).split("").forEach((c, i) => { if (cells[i]) cells[i].textContent = c === " " ? "\u00a0" : c; });
    };
    const mark = (row, on) => {
      row.classList.toggle("is-demo", on);
      const stat = $(".bstat", row);
      if (!stat) return;
      if (on && !stat.dataset.was) { stat.dataset.was = stat.innerHTML; stat.innerHTML = '<span class="tag-specimen">Specimen</span>'; }
      else if (!on && stat.dataset.was) { stat.innerHTML = stat.dataset.was; delete stat.dataset.was; }
    };

    if (openRows.length && reduced) {
      write(openRows[0], SPEC);
      mark(openRows[0], true);
    } else if (openRows.length) {
      let paused = false, i = 0, timer;
      board.addEventListener("pointerenter", () => { paused = true; });
      board.addEventListener("pointerleave", () => { paused = false; });
      board.addEventListener("focusin", () => { paused = true; });
      board.addEventListener("focusout", () => { paused = false; });

      const flip = (row, from, to, done) => {
        let step = 0; const STEPS = 9;
        const tick = () => {
          step += 1;
          const out = pad(to).split("").map((ch, idx) => {
            const settleAt = Math.floor((idx / CELLS) * (STEPS - 3)) + 3;
            if (step >= settleAt || pad(from)[idx] === ch) return ch;
            return FLAP[(step * 7 + idx * 13) % FLAP.length];
          }).join("");
          write(row, out);
          if (step < STEPS) timer = setTimeout(tick, 55); else done();
        };
        tick();
      };

      const cycle = () => {
        if (paused || document.hidden) { timer = setTimeout(cycle, 1200); return; }
        const row = openRows[i++ % openRows.length];
        mark(row, true);
        flip(row, "[+]", SPEC, () => {
          timer = setTimeout(() => {
            mark(row, false);              // tag goes as the field starts emptying
            flip(row, SPEC, "[+]", () => { timer = setTimeout(cycle, 2600); });
          }, 2200);
        });
      };
      timer = setTimeout(cycle, 1800);
    }
  }

  if ("startViewTransition" in document && !reduced) {
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[href^='/t/']");
      if (!a || e.metaKey || e.ctrlKey || e.button) return;
      const card = a.closest(".card");
      const visual = card ? $(".card-visual", card) : a.closest("#hero-mini-link") ? $(".mini", a) : null;
      $$('[style*="view-transition-name"]').forEach((el) => (el.style.viewTransitionName = ""));
      if (visual) visual.style.viewTransitionName = "stage";
    });
  }

  // ---- screenshots from repositories, which are whatever shape their author
  // took. Cover crops a tall one to a meaningless band, so anything close to
  // square or taller is fitted whole instead. -------------------------------
  const fitShot = (img) => {
    if (!img.naturalWidth || !img.naturalHeight) return;
    img.classList.toggle("is-tall", img.naturalHeight / img.naturalWidth > 0.78);
  };
  for (const img of $$("img.shot")) {
    if (img.complete) fitShot(img);
    else img.addEventListener("load", () => fitShot(img), { once: true });
  }

  // ---- theme page: scheme + view tabs + frame ------------------------------------
  const stage = $(".stage");
  if (stage) {
    const frame = $("[data-preview-frame]");
    const body = $(".stage-body");
    const note = $("[data-stage-note]");
    const paint = $('[data-view="paint"] .mini');
    const palette = $("[data-palette]");
    const sides = $$(".tp-side .mini");
    const scheme = (s) => {
      frame?.contentWindow?.postMessage({ type: "dshthemes:scheme", scheme: s }, "*");
      const pal = body?.dataset[s === "light" ? "palLight" : "palDark"];
      if (paint && pal) { paint.style.cssText = pal; paint.classList.toggle("is-light", s === "light"); }
      if (palette && pal) {
        for (const kv of pal.split(";")) {
          const [k, v] = kv.split(":");
          if (!k) continue;
          const role = k.replace("--c-", "");
          const sw = $(`[data-role="${role}"]`, palette);
          const hex = $(`[data-hex="${role}"]`, palette);
          if (sw) sw.style.background = v;
          if (hex) hex.textContent = v;
        }
      }
    };
    // The shell is a desktop layout. It is always laid out at 1440x900 inside
    // the frame and scaled to the stage, so a narrow stage shows a smaller dsh
    // rather than a squeezed one. 1440x900 is the stage's own 16/10, so the
    // scaled frame lands exactly on its edges.
    if (frame && body) {
      const fit = () => {
        const w = body.clientWidth;
        if (w) frame.style.transform = `scale(${w / 1440})`;
      };
      fit();
      new ResizeObserver(fit).observe(body);
    }
    stage.addEventListener("click", (e) => {
      const s = e.target.closest(".chip[data-scheme]");
      if (s) scheme(s.dataset.scheme);
      const tab = e.target.closest(".chip[data-view-tab]");
      if (tab) {
        $$("[data-view]", body).forEach((v) => (v.hidden = v.dataset.view !== tab.dataset.viewTab));
        if (note) note.hidden = tab.dataset.viewTab !== "live";
      }
    });
    // if the live CSS fails inside the frame, say so on the stage
    addEventListener("message", (e) => {
      const d = e.data || {};
      if (d.type !== "dshthemes:preview" || !note) return;
      if (d.state === "error") { note.textContent = "live CSS failed to load — showing the stock shell"; note.hidden = false; }
    });
    // theme page: pressing a scheme chip should also flip the side signatures
    stage.addEventListener("click", (e) => {
      const s = e.target.closest(".chip[data-scheme]");
      if (!s || !sides.length) return;
      sides.forEach((m) => m.classList.toggle("is-dim", false));
    });
  }
})();
