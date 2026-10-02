# WERpapers: dataset para análise bibliométrica

Metadados de todos os artigos publicados no **WER – Workshop on Requirements Engineering** (Workshop em Engenharia de Requisitos), de 1998 a 2026, coletados do repositório de acesso aberto [WERpapers](https://werpapers.dimap.ufrn.br/) (ISSN 2675-0066).

- **29 edições** (1998–2026)
- **554 artigos** + 8 prefácios
- **1.141 grafias distintas de autores** (sem desambiguação)
- Idiomas: português, espanhol e inglês

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| [`data/wer_papers.xlsx`](data/wer_papers.xlsx) | Planilha para abrir no Excel (sem a coluna BibTeX) |
| [`data/wer_papers.csv`](data/wer_papers.csv) | CSV em UTF-8 com BOM (acentos corretos no Excel) |
| [`data/wer_papers.json`](data/wer_papers.json) | Os mesmos registros em JSON |
| [`data/wer_papers.bib`](data/wer_papers.bib) | Entradas BibTeX fornecidas pelo WERpapers (importáveis no Zotero/Mendeley) |
| [`scrape_werpapers.py`](scrape_werpapers.py) | Script de coleta |

## Colunas

| Coluna | Descrição |
|---|---|
| `paper_id` | Identificador do artigo no WERpapers (ex.: `wer202401`) |
| `year` | Ano da edição |
| `edition`, `edition_name` | Ex.: `WER2024`, `27th Workshop on Requirements Engineering` |
| `location_date` | Local e data do evento |
| `track` | Trilha ou sessão em que o artigo foi publicado |
| `title` | Título |
| `authors` | Autores, separados por `;` |
| `n_authors` | Número de autores |
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

## Limitações conhecidas

- **DOI** só existe a partir de 2018 (PUC-Rio Editora em 2018, Even3 desde 2019).
- **Keywords** não constam no site para 2008–2010 e 2013, e faltam parcialmente em outros anos antigos.
- **Abstracts:** dois artigos (2000 e 2003) estão sem resumo no próprio site.
- **Autores não normalizados:** a mesma pessoa pode aparecer com grafias diferentes (ex.: “Julio Cesar Sampaio do Prado Leite” e “Julio Cesar Leite”). Análises de autoria exigem desambiguação.
- **Trilhas heterogêneas:** até 2017 as seções são temáticas; depois, por tipo de submissão (Research, Tools, Industry, Masters and Doctoral).
- **Ligaduras perdidas:** alguns resumos antigos vieram com ligaduras “ff”/“fi” ausentes (ex.: “o er” em vez de “offer”), herdadas da extração de PDF feita pela fonte.

## Como reproduzir

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python scrape_werpapers.py
```

O script lê a lista de edições na página inicial, percorre o sumário de cada edição e visita a página de cada artigo para extrair resumo, palavras-chave, DOI e BibTeX. As páginas baixadas ficam em cache em `data/cache/` (ignorado pelo git), de modo que reexecutar não baixa tudo de novo.

## Fonte e créditos

Todos os metadados pertencem ao [WERpapers](https://werpapers.dimap.ufrn.br/), criado em 2005 no DI/PUC-Rio e mantido desde 2024 pelo Dimap/UFRN. Ao usar este dataset, cite o WERpapers e os artigos originais.

Coleta realizada em outubro de 2026.
