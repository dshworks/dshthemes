#!/usr/bin/env node
// The four seats, fetched from the one place they are edited.
//
// A seat is sold once and appears on both dsh.works and dshthemes.com, so the
// inventory must have exactly one home — two copies kept in sync by hand will
// drift, and the first time they do, this site will be showing a sponsor who
// stopped paying or hiding one who did. The canonical file lives in
// dshworks/plugins; here it is fetched at build time and cached to
// data/sponsors.json so a build with no network still renders the last known
// state rather than an empty band.
//
// Same shape as the registry loaders: remote by default, local checkout with
// DATA_SOURCE=local, and a failure degrades to the cache rather than to a
// wrong page.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "data", "sponsors.json");
const REMOTE = "https://raw.githubusercontent.com/dshworks/plugins/main/data/sponsors.json";
const LOCAL = join(ROOT, "../plugins/data/sponsors.json");

// An empty band is the honest fallback when there is no inventory at all: four
// seats drawn open is a true statement about a site nobody has bought yet, and
// it is what the very first build produced.
const EMPTY = {
  updated: null,
  price: { amount: 490, currency: "USD", period: "year", said: "$490 a year" },
  checkout: null,
  terms: "https://dsh.works/sponsor",
  contact: "sponsor@dsh.works",
  seats: [1, 2, 3, 4].map((n) => ({ n, sponsor: null })),
};

function valid(d) {
  return d && Array.isArray(d.seats) && d.seats.length === 4 && d.price?.said;
}

export async function loadSponsors() {
  if (process.env.DATA_SOURCE === "local" && existsSync(LOCAL)) {
    const local = JSON.parse(readFileSync(LOCAL, "utf8"));
    if (valid(local)) {
      writeFileSync(CACHE, `${JSON.stringify(local, null, 2)}\n`);
      return { data: local, from: "local checkout" };
    }
  }
  try {
    const res = await fetch(REMOTE, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const remote = await res.json();
    if (!valid(remote)) throw new Error("shape");
    writeFileSync(CACHE, `${JSON.stringify(remote, null, 2)}\n`);
    return { data: remote, from: "dshworks/plugins" };
  } catch (err) {
    if (existsSync(CACHE)) {
      return { data: JSON.parse(readFileSync(CACHE, "utf8")), from: `cache (${err.message})` };
    }
    return { data: EMPTY, from: `empty (${err.message})` };
  }
}
