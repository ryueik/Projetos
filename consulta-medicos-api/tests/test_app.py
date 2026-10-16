import json
import os
import sys
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import app  # noqa: E402


class ValidationTests(unittest.TestCase):
    def test_valid_crm_and_uf(self):
        q = app.validate_params({"crm": " 00123456 ", "uf": "sp", "nome": "  maria   da silva "})
        self.assertEqual(q, {"crm": "123456", "uf": "SP", "nome": "maria da silva"})

    def test_uf_required_and_known(self):
        with self.assertRaises(app.ValidationError) as ctx:
            app.validate_params({"crm": "1"})
        self.assertIn("uf", ctx.exception.campos)
        with self.assertRaises(app.ValidationError) as ctx:
            app.validate_params({"crm": "1", "uf": "XX"})
        self.assertIn("uf", ctx.exception.campos)

    def test_crm_digits_only(self):
        for bad in ("12a4", "123456789", "0000", "-5"):
            with self.subTest(bad=bad), self.assertRaises(app.ValidationError) as ctx:
                app.validate_params({"crm": bad, "uf": "RJ"})
            self.assertIn("crm", ctx.exception.campos)

    def test_nome_or_crm_required(self):
        with self.assertRaises(app.ValidationError) as ctx:
            app.validate_params({"uf": "MG"})
        self.assertIn("crm", ctx.exception.campos)

    def test_nome_rejects_symbols(self):
        with self.assertRaises(app.ValidationError) as ctx:
            app.validate_params({"uf": "MG", "nome": "<script>"})
        self.assertIn("nome", ctx.exception.campos)


class NormalizationTests(unittest.TestCase):
    def test_cfm_record(self):
        raw = {
            "NM_MEDICO": "JOAO DA SILVA", "NU_CRM": "0012345", "SG_UF": "sp", "SITUACAO": "A",
            "ESPECIALIDADE": "Cardiologia; Clínica Médica", "DT_INSCRICAO": "15/03/2001", "TIPO_INSCRICAO": "P",
        }
        rec = app.normalize_cfm_record(raw)
        self.assertEqual(rec["nome"], "Joao da Silva")
        self.assertEqual(rec["crm"], "12345")
        self.assertEqual(rec["uf"], "SP")
        self.assertTrue(rec["regular"])
        self.assertEqual(rec["situacao"], "Regular")
        self.assertEqual(rec["especialidades"], ["Cardiologia", "Clínica Médica"])
        self.assertEqual(rec["data_inscricao"], "2001-03-15")
        self.assertEqual(rec["tipo_inscricao"], "Principal")

    def test_cfm_irregular_and_missing_fields(self):
        rec = app.normalize_cfm_record({"NOME": "ana", "CRM": "9", "UF": "BA", "SITUACAO": "Cancelado"})
        self.assertFalse(rec["regular"])
        self.assertEqual(rec["detalhe_situacao"], "Cancelado")
        self.assertEqual(rec["especialidades"], [])

    def test_extract_records_variants(self):
        self.assertEqual(len(app.CFMProvider.extract_records({"dados": [{"a": 1}, "x"]})), 1)
        self.assertEqual(len(app.CFMProvider.extract_records([{"dados": [{"a": 1}]}])), 1)
        with self.assertRaises(app.ProviderError):
            app.CFMProvider.extract_records({"status": "erro", "mensagem": "Captcha inválido"})

    def test_fnv1a_matches_reference(self):
        # Valores de referência do FNV-1a 32 bits.
        self.assertEqual(app.fnv1a(""), 0x811C9DC5)
        self.assertEqual(app.fnv1a("a"), 0xE40C292C)


class ServiceTests(unittest.TestCase):
    def setUp(self):
        self.svc = app.Service(provider=app.MockProvider(), ttl=60)

    def test_mock_is_deterministic_and_cached(self):
        s1, b1 = self.svc.consultar({"crm": "123456", "uf": "SP"})
        s2, b2 = self.svc.consultar({"crm": "123456", "uf": "SP"})
        self.assertEqual(s1, 200)
        self.assertFalse(b1["cache"])
        self.assertTrue(b2["cache"])
        self.assertEqual(b1["medicos"], b2["medicos"])

    def test_not_found(self):
        status, body = self.svc.consultar({"crm": "97", "uf": "SP"})
        self.assertEqual(status, 404)
        self.assertEqual(body["erro"]["codigo"], "NAO_ENCONTRADO")

    def test_validation_error_status(self):
        status, body = self.svc.consultar({"crm": "abc", "uf": "SP"})
        self.assertEqual(status, 400)
        self.assertEqual(body["erro"]["codigo"], "VALIDACAO")

    def test_provider_error_becomes_502(self):
        class Broken(app.Provider):
            name = "broken"

            def search(self, nome, crm, uf):
                raise app.ProviderError("fora do ar")

        status, body = app.Service(provider=Broken(), ttl=0).consultar({"crm": "1", "uf": "SP"})
        self.assertEqual(status, 502)
        self.assertEqual(body["erro"]["codigo"], "PROVEDOR")


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.Handler.service = app.Service(provider=app.MockProvider(), ttl=0)
        app.Handler.log_message = lambda *a, **k: None
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), app.Handler)
        cls.base = f"http://127.0.0.1:{cls.httpd.server_address[1]}"
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def get(self, path):
        try:
            with urllib.request.urlopen(self.base + path) as r:
                return r.status, dict(r.headers), json.loads(r.read())
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers), json.loads(e.read())

    def test_health(self):
        status, headers, body = self.get("/health")
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "ok")
        self.assertEqual(headers.get("Access-Control-Allow-Origin"), "*")

    def test_query(self):
        status, _, body = self.get("/api/medicos?crm=123456&uf=sp")
        self.assertEqual(status, 200)
        self.assertEqual(body["medicos"][0]["uf"], "SP")

    def test_bad_request_and_404(self):
        self.assertEqual(self.get("/api/medicos?uf=ZZ")[0], 400)
        self.assertEqual(self.get("/nada")[0], 404)


if __name__ == "__main__":
    unittest.main()
