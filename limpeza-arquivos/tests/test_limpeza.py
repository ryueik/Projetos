import json
import os
import sys
import tempfile
import time
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import limpeza  # noqa: E402

DIA = 86400


class LimpezaTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.alvo = self.root / "alvo"
        self.audit = self.root / "auditoria"
        agora = time.time()
        arquivos = {
            "relatorio_antigo.csv": 45,
            "log/app.log": 60,
            "log/app_recente.log": 3,
            "manter/contrato.pdf": 400,
            "banco.db": 90,
            "novo.txt": 1,
        }
        for rel, dias in arquivos.items():
            p = self.alvo / rel
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text("x" * 100)
            os.utime(p, (agora - dias * DIA, agora - dias * DIA))

    def tearDown(self):
        self.tmp.cleanup()

    def run_main(self, *extra):
        argv = [str(self.alvo), "--auditoria", str(self.audit), *extra]
        with redirect_stdout(StringIO()):
            return limpeza.main(argv)

    def existe(self, rel):
        return (self.alvo / rel).exists()

    def test_dry_run_does_not_touch_files(self):
        self.assertEqual(self.run_main("--excluir", "manter/*"), 0)
        for rel in ("relatorio_antigo.csv", "log/app.log", "banco.db", "manter/contrato.pdf"):
            self.assertTrue(self.existe(rel), rel)
        dados = json.loads(next(self.audit.glob("*.json")).read_text(encoding="utf-8"))
        self.assertEqual(dados["modo"], "simulacao")
        candidatos = sorted(Path(i["caminho"]).name for i in dados["itens"])
        self.assertEqual(candidatos, ["app.log", "relatorio_antigo.csv"])
        self.assertTrue(next(self.audit.glob("*.csv")).is_file())

    def test_execute_deletes_only_old_unprotected(self):
        self.run_main("--executar", "--excluir", "manter/*")
        self.assertFalse(self.existe("relatorio_antigo.csv"))
        self.assertFalse(self.existe("log/app.log"))
        self.assertTrue(self.existe("log/app_recente.log"))
        self.assertTrue(self.existe("banco.db"))          # extensão protegida
        self.assertTrue(self.existe("manter/contrato.pdf"))  # padrão de exclusão
        self.assertTrue(self.existe("novo.txt"))

    def test_include_patterns(self):
        self.run_main("--executar", "--incluir", "*.log", "--excluir", "manter/*")
        self.assertFalse(self.existe("log/app.log"))
        self.assertTrue(self.existe("relatorio_antigo.csv"))

    def test_quarantine_moves_files(self):
        q = self.root / "quarentena"
        self.run_main("--executar", "--quarentena", str(q), "--excluir", "manter/*", "--remover-pastas-vazias")
        self.assertFalse(self.existe("log/app.log"))
        self.assertTrue((q / "alvo" / "log" / "app.log").is_file())
        self.assertTrue((q / "alvo" / "relatorio_antigo.csv").is_file())

    def test_custom_retention(self):
        self.run_main("--executar", "--dias", "2", "--excluir", "manter/*")
        self.assertFalse(self.existe("log/app_recente.log"))
        self.assertTrue(self.existe("novo.txt"))

    def test_refuses_root_and_home(self):
        self.assertTrue(limpeza.diretorio_perigoso(Path("/")))
        self.assertTrue(limpeza.diretorio_perigoso(Path.home()))
        self.assertFalse(limpeza.diretorio_perigoso(self.alvo))

    def test_symlinks_are_not_followed(self):
        fora = self.root / "fora"
        fora.mkdir()
        alvo_fora = fora / "importante.txt"
        alvo_fora.write_text("não apagar")
        os.utime(alvo_fora, (time.time() - 99 * DIA,) * 2)
        try:
            (self.alvo / "link").symlink_to(fora, target_is_directory=True)
        except (OSError, NotImplementedError):
            self.skipTest("symlinks indisponíveis")
        self.run_main("--executar", "--excluir", "manter/*")
        self.assertTrue(alvo_fora.exists())


if __name__ == "__main__":
    unittest.main()
