"""Exporta a rede de coautoria do WER para o Gephi.

Lê a aba `authorships` de data/wer_papers_normalized.xlsx (nomes normalizados, sem prefácios) e grava em data/gephi/:
  coauthorship_nodes.csv  nós (Id, Label, ...) para o Import Spreadsheet do Gephi
  coauthorship_edges.csv  arestas (Source, Target, Type, Weight, ...)
  coauthorship.gexf       rede completa com atributos e intervalos por ano (linha do tempo do Gephi)
"""
from collections import defaultdict
from itertools import combinations
from pathlib import Path
from xml.sax.saxutils import quoteattr

import pandas as pd

ROOT = Path(__file__).parent
OUT = ROOT / "data" / "gephi"


def main():
    a = pd.read_excel(ROOT / "data" / "wer_papers_normalized.xlsx", sheet_name="authorships")
    OUT.mkdir(parents=True, exist_ok=True)

    names = sorted(a["author"].unique())
    node_id = {n: f"a{i}" for i, n in enumerate(names)}
    node_years: dict[str, set] = defaultdict(set)
    node_papers: dict[str, set] = defaultdict(set)
    edge_years: dict[tuple, list] = defaultdict(list)  # um item por artigo em conjunto

    for (pid, year), g in a.groupby(["paper_id", "year"]):
        authors = sorted(set(g["author"]))
        for n in authors:
            node_years[n].add(int(year))
            node_papers[n].add(pid)
        for u, v in combinations(authors, 2):
            edge_years[(u, v)].append(int(year))

    coauthors: dict[str, set] = defaultdict(set)
    for u, v in edge_years:
        coauthors[u].add(v)
        coauthors[v].add(u)

    nodes = pd.DataFrame([{
        "Id": node_id[n], "Label": n, "papers": len(node_papers[n]),
        "first_year": min(node_years[n]), "last_year": max(node_years[n]),
        "active_years": len(node_years[n]), "coauthors": len(coauthors[n]),
    } for n in names])
    edges = pd.DataFrame([{
        "Source": node_id[u], "Target": node_id[v], "Type": "Undirected", "Weight": len(ys),
        "first_year": min(ys), "last_year": max(ys), "years": ";".join(map(str, sorted(set(ys)))),
        "source_name": u, "target_name": v,
    } for (u, v), ys in edge_years.items()]).sort_values("Weight", ascending=False)

    nodes.to_csv(OUT / "coauthorship_nodes.csv", index=False, encoding="utf-8")
    edges.to_csv(OUT / "coauthorship_edges.csv", index=False, encoding="utf-8")
    write_gexf(nodes, edges, node_years)

    iso = (nodes.coauthors == 0).sum()
    print(f"Nós: {len(nodes)} autores ({iso} sem coautores no WER) | Arestas: {len(edges)} pares de coautores")
    print(f"Arquivos em {OUT.relative_to(ROOT)}/")


def write_gexf(nodes: pd.DataFrame, edges: pd.DataFrame, node_years: dict):
    """GEXF 1.3 dinâmico: cada nó/aresta tem um intervalo (spell) por ano de atividade."""
    spells = lambda ys: "".join(f'<spell start="{y}" end="{y}"/>' for y in sorted(set(ys)))
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<gexf xmlns="http://gexf.net/1.3" version="1.3">',
           '  <meta><creator>WERPapers_scrapping_2026</creator>'
           '<description>Rede de coautoria do WER - Workshop on Requirements Engineering (1998-2026)</description></meta>',
           '  <graph defaultedgetype="undirected" mode="dynamic" timeformat="double" timerepresentation="interval">',
           '    <attributes class="node" mode="static">',
           '      <attribute id="papers" title="papers" type="integer"/>',
           '      <attribute id="first_year" title="first_year" type="integer"/>',
           '      <attribute id="last_year" title="last_year" type="integer"/>',
           '      <attribute id="active_years" title="active_years" type="integer"/>',
           '      <attribute id="coauthors" title="coauthors" type="integer"/>',
           '    </attributes>',
           '    <attributes class="edge" mode="static">',
           '      <attribute id="first_year" title="first_year" type="integer"/>',
           '      <attribute id="last_year" title="last_year" type="integer"/>',
           '    </attributes>',
           '    <nodes>']
    for r in nodes.itertuples():
        out.append(f'      <node id="{r.Id}" label={quoteattr(r.Label)}><attvalues>'
                   f'<attvalue for="papers" value="{r.papers}"/><attvalue for="first_year" value="{r.first_year}"/>'
                   f'<attvalue for="last_year" value="{r.last_year}"/><attvalue for="active_years" value="{r.active_years}"/>'
                   f'<attvalue for="coauthors" value="{r.coauthors}"/></attvalues>'
                   f'<spells>{spells(node_years[r.Label])}</spells></node>')
    out.append('    </nodes>\n    <edges>')
    for i, r in enumerate(edges.itertuples()):
        out.append(f'      <edge id="e{i}" source="{r.Source}" target="{r.Target}" weight="{r.Weight}"><attvalues>'
                   f'<attvalue for="first_year" value="{r.first_year}"/><attvalue for="last_year" value="{r.last_year}"/>'
                   f'</attvalues><spells>{spells(map(int, r.years.split(";")))}</spells></edge>')
    out += ['    </edges>', '  </graph>', '</gexf>']
    (OUT / "coauthorship.gexf").write_text("\n".join(out), encoding="utf-8")


if __name__ == "__main__":
    main()
