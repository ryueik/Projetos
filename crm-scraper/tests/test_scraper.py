import csv
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import scraper  # noqa: E402

HERE = Path(__file__).resolve().parent.parent


class ParseTests(unittest.TestCase):
    def setUp(self):
        self.cfg = scraper.load_config(HERE / "config.json")
        self.html = (HERE / "exemplo" / "pagina_resultado.html").read_text(encoding="utf-8")

    def test_parse_first_page(self):
        medicos, prox = scraper.parse_page(self.html, self.cfg["seletores"])
        self.assertEqual(len(medicos), 8)
        self.assertEqual(prox, "pagina_resultado_2.html")
        ana = medicos[0]
        self.assertEqual((ana.nome, ana.crm, ana.uf, ana.situacao), ("Ana Beatriz Souza", "104233", "SP", "Regular"))
        self.assertEqual(ana.data_inscricao, "2004-03-12")
        self.assertEqual(medicos[1].especialidades, ["Clínica Médica", "Medicina Intensiva"])
        self.assertEqual(medicos[2].especialidades, [])

    def test_normalizers(self):
        self.assertEqual(scraper.normalizar_situacao("ATIVO"), "Regular")
        self.assertEqual(scraper.normalizar_situacao("Cancelado"), "Irregular")
        self.assertEqual(scraper.normalizar_data("01/02/2003"), "2003-02-01")
        self.assertEqual(scraper.normalizar_data("sem data"), "sem data")


class OfflineRunTests(unittest.TestCase):
    def test_offline_run_writes_csvs(self):
        with tempfile.TemporaryDirectory() as tmp:
            code = scraper.main(["--offline", "--saida", tmp, "--quiet", "--ufs", "SP", "RS"])
            self.assertEqual(code, 0)
            with open(Path(tmp) / "medicos_consolidado.csv", encoding="utf-8-sig") as fh:
                rows = list(csv.DictReader(fh, delimiter=";"))
            self.assertEqual({r["uf"] for r in rows}, {"SP", "RS"})
            self.assertEqual(len([r for r in rows if r["uf"] == "SP"]), 4)
            self.assertTrue((Path(tmp) / "medicos_RS.csv").is_file())


if __name__ == "__main__":
    unittest.main()
