// Gera as capas dos projetos (assets/covers/<slug>.jpg, 1600x1000):
// captura cada projeto no desktop e no celular e monta uma composição com
// moldura de navegador + celular sobre fundo em gradiente, com título e área.
//
// Uso: node scripts/covers.mjs [slug ...]
// Requer playwright + Chromium (CHROMIUM_PATH=/caminho/do/chromium se necessário).
// Projetos externos (sem pasta neste repo) usam as capturas já salvas em assets/thumbs/.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const ctx = { window: {} };
vm.runInNewContext(readFileSync(join(root, "assets/js/catalog.js"), "utf8"), ctx);
const { PROJECTS, PROJECT_CATEGORIES } = ctx.window;

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".csv": "text/csv", ".woff2": "font/woff2" };

const server = createServer((req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^([/\\])+/, "");
  let f = join(root, p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
  if (!f.startsWith(root) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const origin = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
mkdirSync(join(root, "assets/covers"), { recursive: true });

const HIDE = "#mm-hub{display:none!important}.reveal{opacity:1!important;transform:none!important}*{scroll-behavior:auto!important}";

async function shot(url, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, colorScheme: "dark", deviceScaleFactor: 1 });
  await page.route(/openweathermap|open-meteo/, (r) => r.abort());
  await page.goto(url, { waitUntil: "networkidle", timeout: 25000 }).catch(() => {});
  await page.addStyleTag({ content: HIDE }).catch(() => {});
  await page.waitForTimeout(700);
  const buf = await page.screenshot({ type: "jpeg", quality: 82 });
  await page.close();
  return "data:image/jpeg;base64," + buf.toString("base64");
}

// Tons por área, sempre dentro da paleta dourado/laranja/vermelho.
const HUES = {
  rpa: ["#ff7a1a", "#e63946"], web: ["#e3b341", "#ff7a1a"], scripts: ["#e63946", "#7a1f2b"],
  dados: ["#e3b341", "#e63946"], ecommerce: ["#ff7a1a", "#e3b341"], jogos: ["#e63946", "#ff7a1a"],
};

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

function template(p, desk, mob, idx) {
  const [a, b] = HUES[p.category] || HUES.web;
  const words = p.title.split(" · ")[0].split(" ");
  const cut = Math.max(1, Math.ceil(words.length / 2));
  const t1 = esc(words.slice(0, cut).join(" ")), t2 = esc(words.slice(cut).join(" "));
  const phone = mob
    ? `<div class="phone"><div class="notch"></div><img src="${mob}"></div>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Instrument+Serif:ital@1&family=Inter:wght@500;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
body{width:1600px;height:1000px;overflow:hidden;background:#0b0907;font-family:Inter,system-ui,sans-serif;color:#f5efe4;position:relative}
.bg{position:absolute;inset:0;background:
 radial-gradient(900px 600px at 85% 15%, ${a}55, transparent 60%),
 radial-gradient(700px 520px at 10% 100%, ${b}44, transparent 60%),
 linear-gradient(160deg,#120d09,#0b0907 55%)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(227,179,65,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(227,179,65,.08) 1px,transparent 1px);background-size:64px 64px;
 -webkit-mask-image:radial-gradient(ellipse at 70% 40%,#000,transparent 75%)}
.meta{position:absolute;left:84px;top:84px;width:560px}
.num{font:500 18px 'JetBrains Mono',monospace;color:${a};letter-spacing:.14em}
.cat{display:inline-block;margin-top:22px;padding:8px 16px;border:1px solid ${a}88;border-radius:999px;font:500 16px 'JetBrains Mono',monospace;color:#f3d27a;text-transform:uppercase;letter-spacing:.1em}
h1{margin-top:28px;font:800 74px/0.98 Syne,sans-serif;letter-spacing:-.035em}
h1 em{display:block;font:italic 400 82px/1 'Instrument Serif',Georgia,serif;letter-spacing:-.01em;background:linear-gradient(120deg,#e3b341,#ff7a1a 55%,#e63946);-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:6px}
.tags{display:flex;flex-wrap:wrap;gap:10px;margin-top:34px}
.tags span{padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);font:500 15px 'JetBrains Mono',monospace;color:#d9cdb8}
.brand{position:absolute;left:84px;bottom:72px;display:flex;align-items:center;gap:14px;font:700 20px Syne,sans-serif}
.brand i{width:44px;height:44px;border-radius:12px;background:linear-gradient(120deg,#e3b341,#ff7a1a 55%,#e63946);display:grid;place-items:center;font:800 15px Inter;color:#1a0f04;font-style:normal}
.win{position:absolute;left:680px;top:150px;width:1040px;border-radius:18px;overflow:hidden;background:#1a1510;
 box-shadow:0 60px 120px -30px rgba(0,0,0,.9),0 0 0 1px rgba(227,179,65,.25);transform:perspective(2400px) rotateY(-9deg) rotateX(3deg);transform-origin:left center}
.bar{height:42px;display:flex;align-items:center;gap:9px;padding:0 18px;background:#221b14;border-bottom:1px solid rgba(255,255,255,.06)}
.bar b{width:13px;height:13px;border-radius:50%;background:#e63946}.bar b:nth-child(2){background:#e3b341}.bar b:nth-child(3){background:#4cc38a}
.bar span{margin-left:16px;flex:0 1 420px;height:24px;border-radius:8px;background:rgba(255,255,255,.06);font:500 13px 'JetBrains Mono';color:#a99c88;display:flex;align-items:center;padding:0 12px;white-space:nowrap;overflow:hidden}
.win img{display:block;width:100%;height:650px;object-fit:cover;object-position:top}
.phone{position:absolute;left:610px;top:430px;width:250px;height:520px;border-radius:40px;padding:11px;background:#0e0b08;
 box-shadow:0 50px 90px -20px rgba(0,0,0,.95),0 0 0 2px rgba(227,179,65,.4);transform:rotate(-4deg)}
.phone img{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:30px}
.notch{position:absolute;top:18px;left:50%;transform:translateX(-50%);width:84px;height:22px;border-radius:12px;background:#0e0b08;z-index:2}
</style></head><body>
<div class="bg"></div><div class="grid"></div>
<div class="meta">
  <div class="num">[${String(idx).padStart(2, "0")}] PROJETO</div>
  <div class="cat">${esc(PROJECT_CATEGORIES[p.category] || p.category)}</div>
  <h1>${t1}${t2 ? `<em>${t2}</em>` : ""}</h1>
  <div class="tags">${p.tags.slice(0, 4).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
</div>
<div class="brand"><i>MM</i>Matheus Macário · Projetos</div>
<div class="win"><div class="bar"><b></b><b></b><b></b><span>${esc(p.url && !p.path ? p.url.replace(/^https?:\/\//, "") : "projetos-matheus-macario.vercel.app/" + (p.path || ""))}</span></div><img src="${desk}"></div>
${phone}
<script>
// Ajusta o título para caber na coluna da esquerda.
document.fonts.ready.then(()=>{const h=document.querySelector("h1"); let fs=74;
while((h.scrollWidth>h.clientWidth+2||h.offsetHeight>330)&&fs>40){fs-=2;h.style.fontSize=fs+"px";h.querySelectorAll("em").forEach(e=>e.style.fontSize=(fs*1.1)+"px")}});
${mob ? "" : 'document.querySelector(".win").style.cssText="left:660px;top:120px;width:1120px";'}
</script>
</body></html>`;
}

const only = process.argv.slice(2);
let idx = 0;
for (const p of PROJECTS) {
  idx++;
  if (only.length && !only.includes(p.slug)) continue;
  try {
    let desk, mob = null;
    if (p.path) {
      const url = origin + p.path.split("/").map(encodeURIComponent).join("/");
      desk = await shot(url, 1440, 900);
      mob = await shot(url, 390, 844);
    } else {
      const f = join(root, p.thumb);
      if (!existsSync(f)) { console.log(`- ${p.slug}: sem captura`); continue; }
      desk = "data:image/jpeg;base64," + readFileSync(f).toString("base64");
    }
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.setContent(template(p, desk, mob, idx), { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(root, "assets/covers", p.slug + ".jpg"), type: "jpeg", quality: 80 });
    await page.close();
    console.log(`✓ ${p.slug}`);
  } catch (e) {
    console.log(`✗ ${p.slug}: ${e.message}`);
  }
}
await browser.close();
server.close();
