#!/usr/bin/env node
// Render dist/og.html to src/og.png (1200x630) with the container's Chromium.
// Serves dist/ on a local port for the duration; the result is committed so a
// build without a browser still ships the image.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLOAK = process.env.CLOAK_APP_DIR || "/opt/cloak";
if (!existsSync(join(ROOT, "dist", "og.html"))) throw new Error("build first");
const PORT = 8137;
const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], { cwd: join(ROOT, "dist"), stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const script = `
import { launch } from 'cloakbrowser';
const browser = await launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:${PORT}/og.html', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await page.screenshot({ path: '${join(ROOT, "src", "og.png")}', type: 'png' });
await browser.close();
console.log('wrote src/og.png');
`;
const child = spawn("node", ["--input-type=module", "-e", script], { cwd: CLOAK, stdio: "inherit", env: { ...process.env, NO_PROXY: "127.0.0.1,localhost", no_proxy: "127.0.0.1,localhost" } });
child.on("exit", (code) => { server.kill(); process.exit(code ?? 1); });
