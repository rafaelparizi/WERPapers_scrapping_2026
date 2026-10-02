# WERpapers Scraping

Dataset of all papers published at **WER – Workshop on Requirements Engineering** (1998–2026), collected from the open-access repository [WERpapers](https://werpapers.dimap.ufrn.br/), for bibliometric analysis.

## Dataset (`data/`)

| File | Content |
|---|---|
| `wer_papers.xlsx` | Spreadsheet (no BibTeX column) |
| `wer_papers.csv` | UTF-8 with BOM |
| `wer_papers.json` | Same records as JSON |
| `wer_papers.bib` | BibTeX entries as provided by WERpapers |

562 entries (554 papers + 8 prefaces; filter with `is_preface`).

Columns: `paper_id`, `year`, `edition`, `edition_name`, `location_date`, `track`, `title`, `authors` (separated by `;`), `n_authors`, `abstract`, `keywords`, `doi`, `pdf_url`, `paper_url`, `issn`, `isbn`, `publisher`, `is_preface`, `bibtex`.

### Coverage notes
- DOIs exist only from 2018 onward (PUC-Rio Editora in 2018, Even3 since 2019).
- Keywords are missing on the source site for 2008–2010 and 2013, and partially in other early years.
- Two papers (2000, 2003) have empty abstracts on the source site.
- Author names are not normalized (the same person may appear in different forms).

## Reproducing

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python scrape_werpapers.py
```

Downloaded pages are cached in `data/cache/` (git-ignored).

## Source
All metadata belongs to WERpapers (ISSN 2675-0066), maintained by Dimap – UFRN.
