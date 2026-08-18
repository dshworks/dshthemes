#!/usr/bin/env node
// Pull the registry this site reads. The site is a reader of
// dshworks/awesome-dsh-themes, never a second source of truth: this fetches
// data/themes.json from the registry's default branch and writes it verbatim.
//
//   node scripts/registry.mjs                 # from GitHub
//   node scripts/registry.mjs --local=../awesome-dsh-themes   # from a checkout

import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "data", "themes.json");
const SRC = "https://raw.githubusercontent.com/dshworks/awesome-dsh-themes/main/data/themes.json";
const local = (process.argv.find((a) => a.startsWith("--local=")) || "").split("=")[1];

mkdirSync(join(ROOT, "data"), { recursive: true });
if (local) {
  copyFileSync(join(ROOT, local, "data", "themes.json"), OUT);
  console.error(`copied ${local}/data/themes.json`);
} else {
  const res = await fetch(SRC);
  if (!res.ok) throw new Error(`registry ${res.status}`);
  const text = await res.text();
  JSON.parse(text); // fail loudly on a bad body
  writeFileSync(OUT, text);
  console.error(`fetched ${SRC}`);
}
