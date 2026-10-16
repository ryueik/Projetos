#!/usr/bin/env python3
"""Microsserviço de Consulta de Médicos via API.

Recebe ``nome``, ``crm`` e ``uf`` por query string, consulta um provedor de
validação médica e devolve um payload JSON normalizado.

Somente biblioteca padrão do Python (http.server + urllib).

Rotas:
    GET /health                              -> status do serviço
    GET /api/medicos?nome=&crm=&uf=          -> consulta

Variáveis de ambiente:
    PROVIDER     mock (padrão) | cfm
    CFM_URL      endpoint de busca do portal do CFM
    CFM_TIMEOUT  timeout em segundos (padrão 10)
    CACHE_TTL    tempo de vida do cache em segundos (padrão 300; 0 desliga)
    PORT         porta HTTP (padrão 8000)
    CORS_ORIGIN  valor do Access-Control-Allow-Origin (padrão *)

Uso:
    python app.py
    curl "http://localhost:8000/api/medicos?crm=123456&uf=SP"
"""
from __future__ import annotations

import json
import os
import re
import threading
import time
import unicodedata
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

VERSION = "1.0.0"

UFS = (
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
    "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
)

CRM_RE = re.compile(r"^\d{1,8}$")
NOME_RE = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ' .-]{3,120}$")


class ValidationError(Exception):
    def __init__(self, campos: dict[str, str]):
        super().__init__("Parâmetros inválidos")
        self.campos = campos


class ProviderError(Exception):
    """Falha ao falar com o provedor externo."""


# --------------------------------------------------------------------------
# Validação
# --------------------------------------------------------------------------
def validate_params(params: dict[str, str]) -> dict[str, str]:
    """Valida e normaliza nome/crm/uf. Lança ValidationError com os campos."""
    nome = " ".join((params.get("nome") or "").split())
    crm = (params.get("crm") or "").strip()
    uf = (params.get("uf") or "").strip().upper()
    erros: dict[str, str] = {}

    if not uf:
        erros["uf"] = "Informe a UF."
    elif uf not in UFS:
        erros["uf"] = "UF inválida. Use a sigla de um estado brasileiro (ex.: SP)."

    if crm:
        crm = crm.lstrip("0") or "0"
        if not CRM_RE.match(crm) or crm == "0":
            erros["crm"] = "O CRM deve conter apenas dígitos (1 a 8)."
    if nome and not NOME_RE.match(nome):
        erros["nome"] = "Nome deve ter de 3 a 120 letras."
    if not nome and not crm:
        erros.setdefault("crm", "Informe o CRM ou o nome do médico.")

    if erros:
        raise ValidationError(erros)
    return {"nome": nome, "crm": crm, "uf": uf}


# --------------------------------------------------------------------------
# Utilidades
# --------------------------------------------------------------------------
def fnv1a(text: str) -> int:
    """Hash FNV-1a 32 bits (mesmo algoritmo do modo demonstração em JS)."""
    h = 0x811C9DC5
    for b in text.encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def title_name(nome: str) -> str:
    lower = {"da", "de", "do", "das", "dos", "e"}
    parts = nome.lower().split()
    return " ".join(p if p in lower and i else p.capitalize() for i, p in enumerate(parts))


def strip_accents(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


# --------------------------------------------------------------------------
# Provedores
# --------------------------------------------------------------------------
class Provider:
    name = "base"

    def search(self, nome: str, crm: str, uf: str) -> list[dict]:
        raise NotImplementedError


NOMES = [
    "Ana Beatriz Souza", "Carlos Eduardo Lima", "Fernanda Oliveira Rocha", "João Pedro Almeida",
    "Juliana Costa Ribeiro", "Marcos Vinícius Teixeira", "Patrícia Gomes Duarte", "Rafael Martins Pereira",
    "Renata Carvalho Nunes", "Thiago Barbosa Freitas", "Luciana Mendes Araújo", "Gustavo Henrique Moraes",
]
ESPECIALIDADES = [
    "Clínica Médica", "Pediatria", "Cardiologia", "Dermatologia", "Ortopedia e Traumatologia",
    "Ginecologia e Obstetrícia", "Psiquiatria", "Anestesiologia", "Medicina de Família e Comunidade",
    "Neurologia", "Oftalmologia", "Radiologia e Diagnóstico por Imagem",
]
SITUACOES_IRREGULARES = ["Suspenso", "Cancelado", "Interdição cautelar"]


class MockProvider(Provider):
    """Dados fictícios e determinísticos: o mesmo CRM/UF sempre gera o mesmo médico."""

    name = "mock"

    def _record(self, nome: str, crm: str, uf: str) -> dict | None:
        if int(crm) % 97 == 0:  # simula "não encontrado"
            return None
        h = fnv1a(f"{crm}|{uf}")
        regular = h % 10 < 8
        esp = [ESPECIALIDADES[(h >> 4) % len(ESPECIALIDADES)]]
        if (h >> 12) % 3 == 0:
            extra = ESPECIALIDADES[(h >> 8) % len(ESPECIALIDADES)]
            if extra not in esp:
                esp.append(extra)
        ano = 1985 + (h >> 3) % 38
        mes = 1 + (h >> 5) % 12
        dia = 1 + (h >> 7) % 28
        return {
            "nome": title_name(nome) if nome else NOMES[(h >> 10) % len(NOMES)],
            "crm": crm,
            "uf": uf,
            "situacao": "Regular" if regular else "Irregular",
            "regular": regular,
            "detalhe_situacao": "Ativo" if regular else SITUACOES_IRREGULARES[(h >> 14) % 3],
            "especialidades": esp,
            "tipo_inscricao": "Secundária" if (h >> 16) % 4 == 0 else "Principal",
            "data_inscricao": f"{ano:04d}-{mes:02d}-{dia:02d}",
            "fonte": "mock",
        }

    def search(self, nome: str, crm: str, uf: str) -> list[dict]:
        if crm:
            rec = self._record(nome, crm, uf)
            return [rec] if rec else []
        # Só o nome: gera até 3 homônimos com CRMs derivados do nome.
        h = fnv1a(f"{strip_accents(nome).lower()}|{uf}")
        out = []
        for i in range(1 + h % 3):
            fake_crm = str(10000 + (h >> (i * 5)) % 180000)
            rec = self._record(nome, fake_crm, uf)
            if rec:
                out.append(rec)
        return out


def _pick(rec: dict, *keys: str, default=""):
    for k in keys:
        if k in rec and rec[k] not in (None, ""):
            return rec[k]
    return default


def normalize_cfm_record(rec: dict) -> dict:
    """Converte um registro cru do portal do CFM para o formato do serviço.

    O portal já mudou os nomes de campo algumas vezes; por isso a leitura
    tenta as variações conhecidas.
    """
    situacao_raw = str(_pick(rec, "SITUACAO", "NM_SITUACAO", "DS_SITUACAO", "situacao", "COD_SITUACAO")).strip()
    regular = situacao_raw.upper() in {"A", "ATIVO", "REGULAR", "1"}
    esp_raw = _pick(rec, "ESPECIALIDADE", "ESPECIALIDADES", "especialidades", default="")
    if isinstance(esp_raw, list):
        especialidades = [str(e).strip() for e in esp_raw if str(e).strip()]
    else:
        especialidades = [e.strip() for e in re.split(r"[;,\n]|<br\s*/?>", str(esp_raw)) if e.strip()]
    data = str(_pick(rec, "DT_INSCRICAO", "DATA_INSCRICAO", "dataInscricao"))
    m = re.match(r"^(\d{2})/(\d{2})/(\d{4})", data)
    if m:
        data = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    tipo = str(_pick(rec, "TIPO_INSCRICAO", "IN_TIPO_INSCRICAO", "tipoInscricao")).strip()
    tipo = {"P": "Principal", "S": "Secundária", "T": "Temporária", "V": "Provisória"}.get(tipo.upper(), tipo)
    return {
        "nome": title_name(str(_pick(rec, "NM_MEDICO", "NOME", "nome"))),
        "crm": str(_pick(rec, "NU_CRM", "CRM", "crm")).lstrip("0"),
        "uf": str(_pick(rec, "SG_UF", "UF", "uf")).upper(),
        "situacao": "Regular" if regular else "Irregular",
        "regular": regular,
        "detalhe_situacao": situacao_raw or "Não informado",
        "especialidades": especialidades,
        "tipo_inscricao": tipo or "Não informado",
        "data_inscricao": data[:10] if data else "",
        "fonte": "cfm",
    }


class CFMProvider(Provider):
    """Consulta o endpoint público de busca de médicos do portal do CFM.

    Observação: o portal pode exigir captcha ou mudar o contrato a qualquer
    momento. Por isso a URL é configurável e qualquer falha vira um erro 502
    claro, em vez de derrubar o serviço.
    """

    name = "cfm"
    DEFAULT_URL = "https://portal.cfm.org.br/api_rest_php/api/v1/medicos/buscar_medicos"

    def __init__(self, url: str | None = None, timeout: float | None = None):
        self.url = url or os.environ.get("CFM_URL", self.DEFAULT_URL)
        self.timeout = timeout or float(os.environ.get("CFM_TIMEOUT", "10"))

    def build_payload(self, nome: str, crm: str, uf: str) -> list[dict]:
        return [{
            "useCaptchav2": False,
            "captcha": "",
            "medico": {
                "nome": nome, "ufMedico": uf, "crmMedico": crm, "municipioMedico": "",
                "tipoInscricaoMedico": "", "situacaoMedico": "", "detalheSituacaoMedico": "",
                "especialidadeMedico": "", "areaAtuacaoMedico": "",
            },
            "page": 1, "pageNumber": 1, "pageSize": 10,
        }]

    def search(self, nome: str, crm: str, uf: str) -> list[dict]:
        body = json.dumps(self.build_payload(nome, crm, uf)).encode("utf-8")
        req = urllib.request.Request(
            self.url, data=body, method="POST",
            headers={
                "Content-Type": "application/json; charset=UTF-8",
                "Accept": "application/json",
                "User-Agent": f"consulta-medicos-api/{VERSION}",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                raw = json.loads(resp.read().decode("utf-8") or "null")
        except urllib.error.HTTPError as exc:
            raise ProviderError(f"Portal do CFM respondeu HTTP {exc.code}.") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise ProviderError(f"Não foi possível acessar o portal do CFM: {exc}") from exc
        except json.JSONDecodeError as exc:
            raise ProviderError("Resposta do portal do CFM não é JSON válido.") from exc
        return [normalize_cfm_record(r) for r in self.extract_records(raw)]

    @staticmethod
    def extract_records(raw) -> list[dict]:
        if isinstance(raw, list):
            raw = raw[0] if raw and isinstance(raw[0], dict) and "dados" in raw[0] else {"dados": raw}
        if not isinstance(raw, dict):
            return []
        if str(raw.get("status", "")).lower() in {"erro", "error"}:
            raise ProviderError(str(raw.get("mensagem") or raw.get("message") or "Erro no portal do CFM."))
        dados = raw.get("dados") or raw.get("data") or []
        return [d for d in dados if isinstance(d, dict)]


def get_provider(name: str | None = None) -> Provider:
    name = (name or os.environ.get("PROVIDER", "mock")).lower()
    if name == "cfm":
        return CFMProvider()
    return MockProvider()


# --------------------------------------------------------------------------
# Cache em memória com TTL
# --------------------------------------------------------------------------
class TTLCache:
    def __init__(self, ttl: float):
        self.ttl = ttl
        self._data: dict[tuple, tuple[float, object]] = {}
        self._lock = threading.Lock()

    def get(self, key):
        if self.ttl <= 0:
            return None
        with self._lock:
            item = self._data.get(key)
            if not item:
                return None
            expires, value = item
            if expires < time.monotonic():
                del self._data[key]
                return None
            return value

    def set(self, key, value):
        if self.ttl <= 0:
            return
        with self._lock:
            if len(self._data) > 2000:
                self._data.clear()
            self._data[key] = (time.monotonic() + self.ttl, value)


# --------------------------------------------------------------------------
# Serviço
# --------------------------------------------------------------------------
class Service:
    def __init__(self, provider: Provider | None = None, ttl: float | None = None):
        self.provider = provider or get_provider()
        self.cache = TTLCache(float(os.environ.get("CACHE_TTL", "300")) if ttl is None else ttl)

    def consultar(self, params: dict[str, str]) -> tuple[int, dict]:
        try:
            q = validate_params(params)
        except ValidationError as exc:
            return 400, error_body("VALIDACAO", "Parâmetros inválidos.", exc.campos)

        key = (self.provider.name, strip_accents(q["nome"]).lower(), q["crm"], q["uf"])
        cached = self.cache.get(key)
        hit = cached is not None
        if not hit:
            try:
                cached = self.provider.search(q["nome"], q["crm"], q["uf"])
            except ProviderError as exc:
                return 502, error_body("PROVEDOR", str(exc))
            self.cache.set(key, cached)

        medicos = cached
        if q["nome"] and q["crm"] and self.provider.name != "mock":
            alvo = strip_accents(q["nome"]).lower()
            medicos = [m for m in medicos if alvo in strip_accents(m["nome"]).lower()] or medicos
        body = {
            "ok": bool(medicos),
            "provider": self.provider.name,
            "consulta": q,
            "total": len(medicos),
            "medicos": medicos,
            "cache": hit,
            "gerado_em": now_iso(),
        }
        if not medicos:
            body["erro"] = {"codigo": "NAO_ENCONTRADO", "mensagem": "Nenhum médico encontrado para os dados informados."}
            return 404, body
        return 200, body


def error_body(codigo: str, mensagem: str, campos: dict | None = None) -> dict:
    erro = {"codigo": codigo, "mensagem": mensagem}
    if campos:
        erro["campos"] = campos
    return {"ok": False, "erro": erro, "gerado_em": now_iso()}


class Handler(BaseHTTPRequestHandler):
    service: Service = None  # type: ignore[assignment]
    server_version = f"consulta-medicos-api/{VERSION}"

    def _send(self, status: int, body: dict):
        data = json.dumps(body, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", os.environ.get("CORS_ORIGIN", "*"))
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):  # noqa: N802
        self._send(204, {})

    def do_GET(self):  # noqa: N802
        url = urlparse(self.path)
        if url.path == "/health":
            return self._send(200, {"status": "ok", "provider": self.service.provider.name, "versao": VERSION})
        if url.path.rstrip("/") == "/api/medicos":
            qs = {k: v[0] for k, v in parse_qs(url.query).items()}
            status, body = self.service.consultar(qs)
            return self._send(status, body)
        return self._send(404, error_body("ROTA", "Rota não encontrada. Use /api/medicos ou /health."))

    def log_message(self, fmt, *args):
        print(f"[{now_iso()}] {self.address_string()} {fmt % args}")


def main():
    port = int(os.environ.get("PORT", "8000"))
    Handler.service = Service()
    httpd = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"consulta-medicos-api {VERSION} em http://localhost:{port} (provider={Handler.service.provider.name})")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
