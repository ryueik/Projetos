// Tira as capturas usadas como "foto" de cada projeto no painel (assets/thumbs/*.jpg).
// Uso: node scripts/screenshots.mjs   (precisa do pacote playwright e de um Chromium)
// Projetos externos (Automatizer, OmniLicit) são capturados a partir de EXTERNAL_DIRS, se existirem.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const ctx = { window: {} };
vm.runInNewContext(readFileSync(join(root, "assets/js/catalog.js"), "utf8"), ctx);

const EXTERNAL_DIRS = {
  // O Automatizer precisa do servidor rodando (npm start); a captura dele foi feita à parte.
  automatizer: process.env.AUTOMATIZER_DIR,
  omnilicit: process.env.OMNILICIT_DIR || join(root, "../omnilicit"),
};
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".csv": "text/csv", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json" };

function serve(dir) {
  return new Promise((resolve) => {
    const srv = createServer((req, res) => {
      let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "");
      let f = join(dir, p);
      if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
      if (!existsSync(f) && existsSync(f + ".html")) f += ".html";
      if (!f.startsWith(dir) || !existsSync(f)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
      res.end(readFileSync(f));
    });
    srv.listen(0, () => resolve(srv));
  });
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
mkdirSync(join(root, "assets/thumbs"), { recursive: true });
const only = process.argv.slice(2);

for (const p of ctx.window.PROJECTS) {
  if (only.length && !only.includes(p.slug)) continue;
  const dir = p.path ? root : EXTERNAL_DIRS[p.slug];
  if (!dir || !existsSync(dir)) { console.log(`- ${p.slug}: sem fonte local, ignorado`); continue; }
  const srv = await serve(dir.endsWith("/") ? dir : dir + "/");
  const url = `http://localhost:${srv.address().port}/${p.path ? p.path.split("/").map(encodeURIComponent).join("/") : ""}`;
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
  try {
    await page.route(/openweathermap/, (r) => r.abort());
    await page.goto(url, { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
    await page.addStyleTag({ content: ".reveal{opacity:1!important;transform:none!important}" }).catch(() => {});
    await page.waitForTimeout(900);
    await page.screenshot({ path: join(root, p.thumb), type: "jpeg", quality: 72 });
    console.log(`✓ ${p.slug}`);
  } catch (e) {
    console.log(`✗ ${p.slug}: ${e.message}`);
  }
  await page.close();
  srv.close();
}
await browser.close();
