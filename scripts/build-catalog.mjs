// Gera projects.json (na raiz) a partir de assets/js/catalog.js.
// O portfólio pode consumir: https://raw.githubusercontent.com/ryueik/Projetos/main/projects.json
// Uso: node scripts/build-catalog.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = fileURLToPath(new URL("..", import.meta.url));
const ctx = { window: {} };
vm.runInNewContext(readFileSync(root + "assets/js/catalog.js", "utf8"), ctx);

const RAW = "https://raw.githubusercontent.com/ryueik/Projetos/main/";
const TREE = "https://github.com/ryueik/Projetos/tree/main/";
const enc = (p) => p.split("/").map(encodeURIComponent).join("/");

const projects = ctx.window.PROJECTS.map((p) => ({
  ...p,
  thumbUrl: p.thumb ? RAW + p.thumb : null,
  codeUrl: p.code || (p.path ? TREE + enc(p.path.replace(/\/$/, "")) : null),
}));

writeFileSync(
  root + "projects.json",
  JSON.stringify({ updatedAt: new Date().toISOString(), categories: ctx.window.PROJECT_CATEGORIES, projects }, null, 2) + "\n",
);
console.log(`projects.json: ${projects.length} projetos`);
