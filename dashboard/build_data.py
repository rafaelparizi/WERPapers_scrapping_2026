"""Gera dashboard/site/data.json a partir de data/wer_papers_normalized.xlsx."""
import json
import re
from datetime import date
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "data" / "wer_papers_normalized.xlsx"
OUT = Path(__file__).resolve().parent / "site" / "data.json"

COUNTRY_FIX = {"Equador": "Ecuador", "Espanha": "Spain", "Brasil": "Brazil"}
# [longitude, latitude] das cidades-sede
CITY_COORDS = {
    "Maringá": [-51.94, -23.42], "Buenos Aires": [-58.38, -34.60], "Rio de Janeiro": [-43.17, -22.91],
    "Valencia": [-0.38, 39.47], "Piracicaba": [-47.65, -22.73], "Tandil": [-59.13, -37.32],
    "Porto": [-8.61, 41.15], "Toronto": [-79.38, 43.65], "Barcelona": [2.17, 41.39],
    "Valparaíso": [-71.62, -33.05], "Cuenca": [-79.00, -2.90], "Montevideo": [-56.16, -34.90],
    "Pucón": [-71.98, -39.28], "Lima": [-77.04, -12.05], "Quito": [-78.47, -0.18],
    "Recife": [-34.88, -8.05], "São José dos Campos": [-45.89, -23.18], "Brasilia": [-47.88, -15.79],
    "Natal": [-35.21, -5.79], "Porto Alegre": [-51.23, -30.03], "La Plata": [-57.95, -34.92],
}
MONTHS = r"(January|February|March|April|May|June|July|August|September|October|Octuber|November|December)"


def parse_location(loc: str) -> dict:
    """'Barcelona, Catalonia, Spain, 12-13 September 2008' -> city, country, virtual."""
    virtual = bool(re.search(r"(?i)virtual", loc))
    parts = [p.strip() for p in loc.split(",") if p.strip()]
    parts = [p for p in parts if not re.search(MONTHS, p) and not re.fullmatch(r"\d{4}", p)
             and not re.search(r"(?i)virtual", p)]
    country = COUNTRY_FIX.get(parts[-1], parts[-1]) if parts else ""
    city = parts[0] if len(parts) > 1 else ""
    return {"city": city, "country": country, "virtual": virtual}


def track_group(year: int, track: str) -> str:
    """Até 2017 as seções eram temáticas; de 2018 em diante, por tipo de submissão."""
    if year <= 2017:
        return "Sessões temáticas"
    t = track.lower()
    if "industry" in t:
        return "Industry"
    if "tool" in t:
        return "Tools"
    if "master" in t or "doctoral" in t:
        return "Masters & Doctoral"
    if "video" in t or "vídeo" in t:
        return "Video papers"
    return "Research"


def main():
    papers = pd.read_excel(XLSX, sheet_name="papers", keep_default_na=False)
    papers = papers.sort_values(["year", "paper_id"])

    out_papers = []
    for r in papers.itertuples():
        out_papers.append({
            "id": r.paper_id,
            "year": int(r.year),
            "title": r.title,
            "authors": [a.strip() for a in r.authors.split(";") if a.strip()],
            "track": r.track,
            "track_group": track_group(int(r.year), r.track),
            "doi": r.doi,
            "url": r.paper_url,
        })

    editions = []
    for year, g in papers.groupby("year"):
        first = g.iloc[0]
        editions.append({"year": int(year), "edition": first.edition, "name": first.edition_name,
                         "location": first.location_date, **parse_location(first.location_date),
                         "n_papers": len(g)})
        loc = editions[-1]
        if loc["city"] not in CITY_COORDS:
            raise SystemExit(f"Sem coordenadas para a sede de {year}: {loc['city']!r} (adicione em CITY_COORDS)")
        loc["coord"] = CITY_COORDS[loc["city"]]

    data = {
        "meta": {"source": "WERpapers - https://werpapers.dimap.ufrn.br/",
                 "repo": "https://github.com/rafaelparizi/WERPapers_scrapping_2026",
                 "generated": date.today().isoformat()},
        "editions": editions,
        "papers": out_papers,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    n_auth = len({a for p in out_papers for a in p["authors"]})
    print(f"data.json: {len(out_papers)} artigos, {len(editions)} edições, {n_auth} autores")


if __name__ == "__main__":
    main()
