# WERpapers: dataset para análise bibliométrica

📊 **Dashboard:** https://rafaelparizi.github.io/WERPapers_scrapping_2026/

Metadados de todos os artigos publicados no **WER – Workshop on Requirements Engineering** (Workshop em Engenharia de Requisitos), de 1998 a 2026, coletados do repositório de acesso aberto [WERpapers](https://werpapers.dimap.ufrn.br/) (ISSN 2675-0066).

- **29 edições** (1998–2026)
- **554 artigos** + 8 prefácios
- **932 autores distintos** após normalização e validação manual (1.130 grafias originais)
- Idiomas: português, espanhol e inglês

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| [`data/wer_papers_normalized.xlsx`](data/wer_papers_normalized.xlsx) | **Planilha final para análise**: 554 artigos, sem prefácios, com a coluna `authors` já normalizada e validada (o nome original fica em `authors_original`). A aba `authorships` traz uma linha por artigo e autor |
| [`data/wer_papers.xlsx`](data/wer_papers.xlsx) | Planilha para abrir no Excel (sem a coluna BibTeX). Linhas coloridas e nomes destacados conforme a situação dos nomes (ver abaixo), com as abas `revisar_nomes` e `legenda` |
| [`data/wer_papers.csv`](data/wer_papers.csv) | CSV em UTF-8 com BOM (acentos corretos no Excel) |
| [`data/wer_papers.json`](data/wer_papers.json) | Os mesmos registros em JSON |
| [`data/wer_papers.bib`](data/wer_papers.bib) | Entradas BibTeX fornecidas pelo WERpapers (importáveis no Zotero/Mendeley) |
| [`data/wer_authorships.csv`](data/wer_authorships.csv) | Uma linha por (artigo, autor), com nome original e normalizado: formato pronto para análises de produtividade e coautoria |
| [`data/authors_mapping.csv`](data/authors_mapping.csv) | Tabela de normalização: grafia original → nome canônico, regra aplicada e marcação de revisão |
| [`data/author_overrides.csv`](data/author_overrides.csv) | Correções manuais da normalização (validadas pelos autores do dataset) |
| [`scrape_werpapers.py`](scrape_werpapers.py) | Script de coleta |
| [`normalize_authors.py`](normalize_authors.py) | Script de normalização de autores |
| [`dashboard/`](dashboard/) | Dashboard bibliométrico (ver abaixo) |
| [`data/gephi/`](data/gephi/) | Rede de coautoria para o Gephi (CSV de nós e arestas + GEXF dinâmico) |
| [`export_gephi.py`](export_gephi.py) | Script de exportação para o Gephi |

## Colunas

| Coluna | Descrição |
|---|---|
| `paper_id` | Identificador do artigo no WERpapers (ex.: `wer202401`) |
| `year` | Ano da edição |
| `edition`, `edition_name` | Ex.: `WER2024`, `27th Workshop on Requirements Engineering` |
| `location_date` | Local e data do evento |
| `track` | Trilha ou sessão em que o artigo foi publicado |
| `title` | Título |
| `authors` | Autores como aparecem no site, separados por `;` |
| `authors_normalized` | Autores com nomes normalizados, separados por `; ` |
| `name_status` | `revisar` (normalização incerta), `ajustado` (nomes normalizados ou separação corrigida) ou `ok` |
| `name_changes` | Alterações feitas nos nomes do artigo: `original → canônico [regra]` |
| `n_authors` | Número de autores (após corrigir a separação) |
| `abstract` | Resumo |
| `keywords` | Palavras-chave, separadas por `;` |
| `doi` | DOI (quando existe) |
| `pdf_url`, `paper_url` | Links para o PDF e para a página do artigo |
| `issn`, `isbn`, `publisher` | Dados editoriais da edição |
| `is_preface` | `True` para prefácios (filtre para ficar só com artigos) |
| `bibtex` | Entrada BibTeX (não incluída no xlsx) |

## Cobertura por ano (sem prefácios)

| Ano | Local | Artigos | Com DOI | Com keywords |
|---|---|---:|---:|---:|
| 1998 | Maringá, PR | 14 | 0 | 13 |
| 1999 | Buenos Aires, Argentina | 9 | 0 | 8 |
| 2000 | Rio de Janeiro, Brazil | 14 | 0 | 13 |
| 2001 | Buenos Aires, Argentina | 20 | 0 | 17 |
| 2002 | Valencia, Spain | 21 | 0 | 4 |
| 2003 | Piracicaba, SP | 22 | 0 | 1 |
| 2004 | Tandil, Argentina | 22 | 0 | 17 |
| 2005 | Porto, Portugal | 23 | 0 | 6 |
| 2006 | Rio de Janeiro, Brazil | 18 | 0 | 18 |
| 2007 | Toronto, Canada | 21 | 0 | 21 |
| 2008 | Barcelona, Catalonia | 20 | 0 | 0 |
| 2009 | Valparaíso, Chile | 14 | 0 | 0 |
| 2010 | Cuenca, Equador | 11 | 0 | 0 |
| 2011 | Rio de Janeiro, Brazil | 15 | 0 | 14 |
| 2012 | Buenos Aires, Argentina | 14 | 0 | 12 |
| 2013 | Montevideo, Uruguay | 12 | 0 | 0 |
| 2014 | Pucón, Chile | 12 | 0 | 11 |
| 2015 | Lima, Peru | 15 | 0 | 15 |
| 2016 | Quito, Ecuador | 13 | 0 | 13 |
| 2017 | Buenos Aires, Argentina | 14 | 0 | 14 |
| 2018 | Rio de Janeiro, Brazil | 20 | 20 | 17 |
| 2019 | Recife, PE | 18 | 18 | 17 |
| 2020 | Virtual Mode, São José dos Campos | 21 | 21 | 19 |
| 2021 | Brasilia, DF | 28 | 28 | 28 |
| 2022 | Virtual mode, Natal | 28 | 28 | 28 |
| 2023 | Porto Alegre, RS | 25 | 25 | 23 |
| 2024 | Buenos Aires, Argentina | 32 | 32 | 32 |
| 2025 | Rio de Janeiro, Brazil | 28 | 28 | 28 |
| 2026 | La Plata, Argentina | 30 | 30 | 30 |

## Normalização de autores

No site, a mesma pessoa aparece com várias grafias. Jaelson Castro, por exemplo, tem 9: “Jaelson F. B. Castro”, “J.F.B. Castro”, “Jaelson Brelaz de Castro”, “Jaelson CastrO”… O script `normalize_authors.py`:

1. **Corrige a separação dos autores**: “ e ” e “ and ” usados como separador, “Jr.” contado como autor à parte, números de afiliação colados ao nome (“Braosi1”), CAIXA ALTA (“LEONARDI”).
2. **Une grafias equivalentes** sem diferenciar acento, caixa e pontuação, e sem considerar partículas (de, da, del…) nem sufixos (Jr., Neto, Filho).
3. **Agrupa variantes compatíveis** com a forma mais completa do nome. O primeiro nome precisa coincidir (por extenso ou inicial), cada parte do nome mais curto precisa aparecer, na mesma ordem, no mais longo, e o sobrenome final precisa estar por extenso. Uma variante compatível com duas pessoas diferentes não é unida e recebe a marca `ambiguous`.
4. **Escolhe o nome canônico**: a forma mais frequente entre as que têm o primeiro nome por extenso.
5. **Aplica `author_overrides.csv`** por último. Quando a coluna opcional `paper_id` está preenchida, a correção vale só para aquele artigo, o que resolve homônimos com a mesma grafia (ex.: os três “Rodrigo Santos”). Ali ficam as decisões manuais, como separar homônimos (“Ricardo Almeida” ≠ “Ricardo de Almeida Falbo”) e corrigir erros de digitação da fonte (“Bejamim” → “Benjamim”).

Na planilha, artigos com `name_status = revisar` aparecem em vermelho claro, com o nome incerto em vermelho e negrito na coluna `authors`. Os artigos `ajustado` aparecem em amarelo, com os nomes alterados em laranja. Em `authors_mapping.csv`, a coluna `needs_review` marca as uniões menos seguras: variantes sem coautor em comum com o restante do grupo, uniões por iniciais e sobrenome que não é o último. Para corrigir um caso, adicione uma linha em `author_overrides.csv` e rode o script de novo. Deixe `canonical` vazio para impedir a união.

## Dashboard

**Online:** https://rafaelparizi.github.io/WERPapers_scrapping_2026/ (publicado pelo GitHub Pages a cada push que altere `dashboard/` ou `data/wer_papers_normalized.xlsx`).

Painel interativo com indicadores de **produção e autoria** e de **edições e trilhas**: artigos por ano, autores distintos, média de autores por artigo, autores novos x recorrentes, produção por década, ranking e tabela pesquisável de autores (com a produção por ano de cada um), **mapa da trajetória do WER entre as cidades-sede** (rotas animadas ano a ano, com zoom em cada trecho e velocidade ajustável), edições por país-sede e artigos por trilha. Um filtro de período se aplica a tudo.

É um site estático (`dashboard/site/`: HTML, JS e `data.json`, com gráficos em Apache ECharts), publicado pelo workflow `.github/workflows/pages.yml`.

**Rodar com Docker:**

```bash
docker compose up --build -d
```

Depois, abra http://localhost:8088. Para usar outra porta: `DASHBOARD_PORT=9000 docker compose up -d`.

**Regenerar os dados sem Docker** (depois de alterar a planilha ou a normalização):

```bash
.venv/bin/python dashboard/build_data.py
```

## Rede de coautoria (Gephi)

`export_gephi.py` gera a rede de coautoria a partir da planilha normalizada. São 932 autores e 2.249 pares de coautores, com peso igual ao número de artigos em conjunto.

- **`coauthorship.gexf`** (recomendado): no Gephi, *File → Open*. Inclui os atributos dos nós (`papers`, `first_year`, `last_year`, `active_years`, `coauthors`) e das arestas (`first_year`, `last_year`, `Weight`). Cada nó e aresta tem os anos de atividade, o que permite usar a **linha do tempo** (*Window → Timeline*) para ver a rede crescer.
- **`coauthorship_nodes.csv` + `coauthorship_edges.csv`**: no Gephi, *File → Import spreadsheet*. Importe primeiro os nós (tabela *Nodes*) e depois as arestas (tabela *Edges*), no mesmo workspace (*Append to existing workspace*).

```bash
.venv/bin/python export_gephi.py
```

## Limitações conhecidas

- **DOI** só existe a partir de 2018 (PUC-Rio Editora em 2018, Even3 desde 2019).
- **Keywords** não constam no site para 2008–2010 e 2013, e faltam parcialmente em outros anos antigos.
- **Abstracts:** dois artigos (2000 e 2003) estão sem resumo no próprio site.
- **Trilhas heterogêneas:** até 2017 as seções são temáticas; depois, por tipo de submissão (Research, Tools, Industry, Masters and Doctoral).
- **Ligaduras perdidas:** alguns resumos antigos vieram com ligaduras “ff”/“fi” ausentes (ex.: “o er” em vez de “offer”), herdadas da extração de PDF feita pela fonte.

## Como reproduzir

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python scrape_werpapers.py
.venv/bin/python normalize_authors.py
.venv/bin/python export_gephi.py
```

O script lê a lista de edições na página inicial, percorre o sumário de cada edição e visita a página de cada artigo para extrair resumo, palavras-chave, DOI e BibTeX. As páginas baixadas ficam em cache em `data/cache/` (ignorado pelo git), de modo que reexecutar não baixa tudo de novo.

## Fonte e créditos

Todos os metadados pertencem ao [WERpapers](https://werpapers.dimap.ufrn.br/), criado em 2005 no DI/PUC-Rio e mantido desde 2024 pelo Dimap/UFRN. Ao usar este dataset, cite o WERpapers e os artigos originais.

Coleta realizada em outubro de 2026.
