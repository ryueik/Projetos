/* Núcleo compartilhado da consulta de médicos (validação + provedor mock).
 *
 * Mesma regra de app.py, portada para JavaScript. É usado em dois lugares:
 *   - index.html (modo demonstração, direto no navegador)
 *   - api/medicos.js (função serverless da Vercel)
 * O hash FNV-1a garante que o mesmo CRM/UF gere o mesmo médico no Python e no JS.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.MedicosCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
    "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
  var CRM_RE = /^\d{1,8}$/;
  var NOME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ' .-]{3,120}$/;

  var NOMES = [
    "Ana Beatriz Souza", "Carlos Eduardo Lima", "Fernanda Oliveira Rocha", "João Pedro Almeida",
    "Juliana Costa Ribeiro", "Marcos Vinícius Teixeira", "Patrícia Gomes Duarte", "Rafael Martins Pereira",
    "Renata Carvalho Nunes", "Thiago Barbosa Freitas", "Luciana Mendes Araújo", "Gustavo Henrique Moraes"
  ];
  var ESPECIALIDADES = [
    "Clínica Médica", "Pediatria", "Cardiologia", "Dermatologia", "Ortopedia e Traumatologia",
    "Ginecologia e Obstetrícia", "Psiquiatria", "Anestesiologia", "Medicina de Família e Comunidade",
    "Neurologia", "Oftalmologia", "Radiologia e Diagnóstico por Imagem"
  ];
  var IRREG = ["Suspenso", "Cancelado", "Interdição cautelar"];

  function utf8(str) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(str);
    return Buffer.from(str, "utf8");
  }

  function fnv1a(text) {
    var h = 0x811c9dc5, bytes = utf8(text);
    for (var i = 0; i < bytes.length; i++) {
      h ^= bytes[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  function titleName(nome) {
    var lower = { da: 1, de: 1, "do": 1, das: 1, dos: 1, e: 1 };
    return nome.toLowerCase().split(/\s+/).filter(Boolean).map(function (p, i) {
      return lower[p] && i ? p : p.charAt(0).toUpperCase() + p.slice(1);
    }).join(" ");
  }

  function stripAccents(t) { return t.normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function nowIso() { return new Date().toISOString().replace(/\.\d{3}Z$/, "Z"); }
  function pad(n, w) { n = String(n); while (n.length < w) n = "0" + n; return n; }

  function validate(params) {
    var nome = String(params.nome || "").split(/\s+/).filter(Boolean).join(" ");
    var crm = String(params.crm || "").trim();
    var uf = String(params.uf || "").trim().toUpperCase();
    var erros = {};
    if (!uf) erros.uf = "Informe a UF.";
    else if (UFS.indexOf(uf) < 0) erros.uf = "UF inválida. Use a sigla de um estado brasileiro (ex.: SP).";
    if (crm) {
      crm = crm.replace(/^0+/, "") || "0";
      if (!CRM_RE.test(crm) || crm === "0") erros.crm = "O CRM deve conter apenas dígitos (1 a 8).";
    }
    if (nome && !NOME_RE.test(nome)) erros.nome = "Nome deve ter de 3 a 120 letras.";
    if (!nome && !crm && !erros.crm) erros.crm = "Informe o CRM ou o nome do médico.";
    return { ok: Object.keys(erros).length === 0, erros: erros, consulta: { nome: nome, crm: crm, uf: uf } };
  }

  function record(nome, crm, uf) {
    if (Number(crm) % 97 === 0) return null;
    var h = fnv1a(crm + "|" + uf);
    var regular = h % 10 < 8;
    var esp = [ESPECIALIDADES[(h >>> 4) % ESPECIALIDADES.length]];
    if ((h >>> 12) % 3 === 0) {
      var extra = ESPECIALIDADES[(h >>> 8) % ESPECIALIDADES.length];
      if (esp.indexOf(extra) < 0) esp.push(extra);
    }
    var ano = 1985 + (h >>> 3) % 38, mes = 1 + (h >>> 5) % 12, dia = 1 + (h >>> 7) % 28;
    return {
      nome: nome ? titleName(nome) : NOMES[(h >>> 10) % NOMES.length],
      crm: crm,
      uf: uf,
      situacao: regular ? "Regular" : "Irregular",
      regular: regular,
      detalhe_situacao: regular ? "Ativo" : IRREG[(h >>> 14) % 3],
      especialidades: esp,
      tipo_inscricao: (h >>> 16) % 4 === 0 ? "Secundária" : "Principal",
      data_inscricao: pad(ano, 4) + "-" + pad(mes, 2) + "-" + pad(dia, 2),
      fonte: "mock"
    };
  }

  function mockSearch(nome, crm, uf) {
    if (crm) { var r = record(nome, crm, uf); return r ? [r] : []; }
    var h = fnv1a(stripAccents(nome).toLowerCase() + "|" + uf);
    var out = [];
    for (var i = 0; i < 1 + h % 3; i++) {
      var rec = record(nome, String(10000 + (h >>> (i * 5)) % 180000), uf);
      if (rec) out.push(rec);
    }
    return out;
  }

  /** Executa a consulta completa e devolve { status, body } no mesmo formato da API Python. */
  function consultar(params) {
    var v = validate(params);
    if (!v.ok) {
      return { status: 400, body: { ok: false, erro: { codigo: "VALIDACAO", mensagem: "Parâmetros inválidos.", campos: v.erros }, gerado_em: nowIso() } };
    }
    var q = v.consulta;
    var medicos = mockSearch(q.nome, q.crm, q.uf);
    var body = { ok: medicos.length > 0, provider: "mock", consulta: q, total: medicos.length, medicos: medicos, cache: false, gerado_em: nowIso() };
    if (!medicos.length) {
      body.erro = { codigo: "NAO_ENCONTRADO", mensagem: "Nenhum médico encontrado para os dados informados." };
      return { status: 404, body: body };
    }
    return { status: 200, body: body };
  }

  return { UFS: UFS, fnv1a: fnv1a, validate: validate, mockSearch: mockSearch, consultar: consultar };
});
