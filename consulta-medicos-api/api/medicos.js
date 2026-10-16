// Função serverless (Vercel) equivalente ao GET /api/medicos do app.py.
// Modo padrão: mock determinístico. Defina PROVIDER=cfm para consultar o portal do CFM.
//
//   GET /api/medicos?nome=&crm=&uf=
const core = require("../lib/medicos-core.js");

const CFM_URL = process.env.CFM_URL || "https://portal.cfm.org.br/api_rest_php/api/v1/medicos/buscar_medicos";

const LOWER = new Set(["da", "de", "do", "das", "dos", "e"]);
function title(n) {
  return String(n || "").toLowerCase().split(/\s+/).filter(Boolean)
    .map((p, i) => (i && LOWER.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(" ");
}

function normalize(rec) {
  const pick = (...keys) => { for (const k of keys) if (rec[k] != null && rec[k] !== "") return rec[k]; return ""; };
  const sit = String(pick("SITUACAO", "NM_SITUACAO", "DS_SITUACAO", "COD_SITUACAO")).trim();
  const regular = ["A", "ATIVO", "REGULAR", "1"].includes(sit.toUpperCase());
  const esp = String(pick("ESPECIALIDADE", "ESPECIALIDADES")).split(/[;,\n]|<br\s*\/?>/).map((s) => s.trim()).filter(Boolean);
  let data = String(pick("DT_INSCRICAO", "DATA_INSCRICAO"));
  const m = data.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) data = `${m[3]}-${m[2]}-${m[1]}`;
  return {
    nome: title(pick("NM_MEDICO", "NOME")),
    crm: String(pick("NU_CRM", "CRM")).replace(/^0+/, ""),
    uf: String(pick("SG_UF", "UF")).toUpperCase(),
    situacao: regular ? "Regular" : "Irregular",
    regular,
    detalhe_situacao: sit || "Não informado",
    especialidades: esp,
    tipo_inscricao: { P: "Principal", S: "Secundária" }[String(pick("TIPO_INSCRICAO")).toUpperCase()] || String(pick("TIPO_INSCRICAO")) || "Não informado",
    data_inscricao: data.slice(0, 10),
    fonte: "cfm",
  };
}

async function cfmSearch(q) {
  const payload = [{
    useCaptchav2: false, captcha: "",
    medico: { nome: q.nome, ufMedico: q.uf, crmMedico: q.crm, municipioMedico: "", tipoInscricaoMedico: "", situacaoMedico: "", detalheSituacaoMedico: "", especialidadeMedico: "", areaAtuacaoMedico: "" },
    page: 1, pageNumber: 1, pageSize: 10,
  }];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Number(process.env.CFM_TIMEOUT || 10) * 1000);
  try {
    const r = await fetch(CFM_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: ctrl.signal });
    if (!r.ok) throw new Error(`Portal do CFM respondeu HTTP ${r.status}.`);
    let raw = await r.json();
    if (Array.isArray(raw)) raw = raw[0] && raw[0].dados ? raw[0] : { dados: raw };
    if (raw && /^(erro|error)$/i.test(String(raw.status || ""))) throw new Error(raw.mensagem || "Erro no portal do CFM.");
    return ((raw && (raw.dados || raw.data)) || []).filter((d) => d && typeof d === "object").map(normalize);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }

  const params = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
  if ((process.env.PROVIDER || "mock").toLowerCase() !== "cfm") {
    const out = core.consultar(params);
    res.statusCode = out.status;
    return res.end(JSON.stringify(out.body));
  }

  const v = core.validate(params);
  if (!v.ok) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ ok: false, erro: { codigo: "VALIDACAO", mensagem: "Parâmetros inválidos.", campos: v.erros } }));
  }
  try {
    const medicos = await cfmSearch(v.consulta);
    res.statusCode = medicos.length ? 200 : 404;
    return res.end(JSON.stringify({ ok: medicos.length > 0, provider: "cfm", consulta: v.consulta, total: medicos.length, medicos, cache: false, gerado_em: new Date().toISOString() }));
  } catch (e) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ ok: false, erro: { codigo: "PROVEDOR", mensagem: String(e.message || e) } }));
  }
};
