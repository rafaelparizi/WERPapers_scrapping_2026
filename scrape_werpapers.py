"""Scraper do WERpapers (https://werpapers.dimap.ufrn.br/).

Coleta todos os artigos de todas as edições do WER e grava:
  data/wer_papers.csv, data/wer_papers.xlsx, data/wer_papers.json, data/wer_papers.bib
Páginas HTML baixadas ficam em cache em data/cache/ (reexecutar não baixa de novo).
"""
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

BASE = "https://werpapers.dimap.ufrn.br"
OUT = Path(__file__).parent / "data"
CACHE = OUT / "cache"
CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
DOI_RE = re.compile(r"\b10\.\d{4,9}/\S+")
NON_TRACK_HEADINGS = {"Edited by", "Editorial"}

session = requests.Session()
session.headers["User-Agent"] = "WERpapers-bibliometric-research/1.0"


def fetch(url: str) -> str:
    path = CACHE / url.replace(BASE + "/", "").replace("/", "_")
    if path.exists():
        return path.read_text(encoding="utf-8")
    for attempt in range(4):
        try:
            r = session.get(url, timeout=30)
            r.raise_for_status()
            r.encoding = "utf-8"
            path.write_text(r.text, encoding="utf-8")
            time.sleep(0.2)
            return r.text
        except requests.RequestException:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)


def edition_urls() -> list[str]:
    soup = BeautifulSoup(fetch(BASE + "/index.html"), "html.parser")
    urls = {a["href"] for a in soup.select("#wer-editions-list a[href*='/proceedings/']")}
    return sorted(urls)


def parse_edition(url: str) -> tuple[dict, list[dict]]:
    soup = BeautifulSoup(fetch(url), "html.parser")
    det = soup.select_one("section.edition_details")
    info = {li.get_text(" ", strip=True).split(":", 1)[0]: li.get_text(" ", strip=True).split(":", 1)[-1].strip()
            for li in det.select("ul.edition-info li")}
    edition = {
        "edition": det.h2.get_text(strip=True),
        "edition_name": det.h3.get_text(strip=True) if det.h3 else "",
        "location_date": info.get("Location and Date", ""),
        "issn": info.get("ISSN", ""),
        "isbn": info.get("ISBN", ""),
        "publisher": info.get("Publisher", ""),
    }
    toc = soup.select_one("section.content_table")
    papers = []
    for h4 in toc.find_all("h4"):
        track = h4.get_text(strip=True)
        ul = h4.find_next_sibling()
        if ul is None or ul.name != "ul":
            continue
        for li in ul.find_all("li", recursive=False):
            a = li.find("a", href=re.compile(r"/proceedings/WER\d{4}/wer\d+\.html"))
            if not a:
                continue
            pdf = li.find("a", href=re.compile(r"/papers/"))
            span = li.find("span")
            papers.append({
                "track": track,
                "title_toc": a.get_text(" ", strip=True),
                "authors_toc": span.get_text(" ", strip=True) if span else "",
                "paper_url": a["href"],
                "pdf_url": pdf["href"] if pdf else "",
            })
    return edition, papers


def parse_paper(url: str) -> dict:
    soup = BeautifulSoup(fetch(url), "html.parser")
    sec = soup.select_one("section.paper_details")
    out = {"title": "", "authors": "", "doi": "", "abstract": "", "keywords": "", "bibtex": ""}
    if sec is None:
        return out
    out["title"] = sec.h3.get_text(" ", strip=True) if sec.h3 else ""
    au = sec.select_one("p.author")
    out["authors"] = au.get_text(" ", strip=True) if au else ""
    abstracts = []
    for p in sec.find_all("p"):
        cls = p.get("class") or []
        txt = p.get_text(" ", strip=True)
        if "abstract" in cls:
            if re.match(r"^(Keywords|Palavras[- ]chave|Palabras[- ]clave)\s*:", txt, re.I):
                out["keywords"] = txt.split(":", 1)[1].strip()
            else:
                abstracts.append(txt)
        elif "author" not in cls and not out["doi"]:
            m = DOI_RE.search(txt)
            if m:
                out["doi"] = m.group(0).rstrip(".,;")
    out["abstract"] = "\n".join(abstracts)
    for k in ("title", "authors", "abstract", "keywords"):
        out[k] = CTRL_RE.sub("", out[k])
    pre = soup.select_one("section.links pre")
    if pre:
        out["bibtex"] = pre.get_text().strip()
        if not out["doi"]:
            m = re.search(r"doi\s*=\s*\{([^}]*)\}", out["bibtex"])
            if m and m.group(1).strip():
                out["doi"] = m.group(1).strip()
    return out


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    rows = []
    for url in edition_urls():
        edition, papers = parse_edition(url)
        year = int(re.search(r"\d{4}", edition["edition"]).group(0))
        for p in papers:
            rows.append({"year": year, **edition, **p})
        print(f"{edition['edition']}: {len(papers)} entradas")

    with ThreadPoolExecutor(max_workers=4) as ex:
        details = list(ex.map(parse_paper, [r["paper_url"] for r in rows]))
    for r, d in zip(rows, details):
        r.update(d)
        r["title"] = r["title"] or r["title_toc"]
        r["authors"] = r["authors"] or r["authors_toc"]
        r["paper_id"] = re.search(r"(wer\d+)\.html", r["paper_url"]).group(1)
        r["n_authors"] = len([a for a in r["authors"].split(";") if a.strip()])
        r["is_preface"] = r["track"].lower() == "preface" or r["title"].lower().startswith(("preface", "prefácio", "prefacio"))

    cols = ["paper_id", "year", "edition", "edition_name", "location_date", "track", "title", "authors",
            "n_authors", "abstract", "keywords", "doi", "pdf_url", "paper_url", "issn", "isbn", "publisher",
            "is_preface", "bibtex"]
    df = pd.DataFrame(rows)[cols].sort_values(["year", "paper_id"]).reset_index(drop=True)

    df.to_csv(OUT / "wer_papers.csv", index=False, encoding="utf-8-sig")
    df.drop(columns="bibtex").to_excel(OUT / "wer_papers.xlsx", index=False)
    (OUT / "wer_papers.json").write_text(json.dumps(df.to_dict("records"), ensure_ascii=False, indent=2), encoding="utf-8")
    (OUT / "wer_papers.bib").write_text("\n\n".join(b for b in df["bibtex"] if b), encoding="utf-8")

    papers = df[~df.is_preface]
    print(f"\nTotal: {len(df)} entradas ({len(papers)} artigos + {df.is_preface.sum()} prefácios)")
    print(f"Sem abstract: {(papers.abstract == '').sum()} | Sem DOI: {(papers.doi == '').sum()} | "
          f"Sem keywords: {(papers.keywords == '').sum()}")


if __name__ == "__main__":
    main()
