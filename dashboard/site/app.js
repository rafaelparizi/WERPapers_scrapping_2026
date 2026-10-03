/* Dashboard bibliométrico do WER: carrega data.json e calcula os indicadores no navegador. */
(async function () {
  const data = await fetch("data.json").then((r) => r.json());
  const papers = data.papers;
  const editions = data.editions;
  const years = editions.map((e) => e.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  // primeira participação de cada autor em toda a série (para "novos x recorrentes")
  const firstYear = new Map();
  for (const p of papers) {
    for (const a of p.authors) {
      if (!firstYear.has(a) || p.year < firstYear.get(a)) firstYear.set(a, p.year);
    }
  }

  const TRACKS = ["Research", "Masters & Doctoral", "Industry", "Tools", "Video papers"];
  const state = { from: minYear, to: maxYear, sort: "n", asc: false, search: "" };
  const charts = {};

  // ------------------------------------------------------------ utilidades
  const $ = (id) => document.getElementById(id);
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, d = 0) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

  function theme() {
    return {
      text: css("--text-primary"), text2: css("--text-secondary"), muted: css("--text-muted"),
      grid: css("--grid"), axis: css("--axis"), surface: css("--surface"), border: css("--border"),
      series: [1, 2, 3, 4, 5].map((i) => css(`--series-${i}`)),
    };
  }

  function base(t) {
    return {
      animationDuration: 300,
      textStyle: { fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif", color: t.text2 },
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        backgroundColor: t.surface, borderColor: t.border, borderWidth: 1,
        textStyle: { color: t.text, fontSize: 13 }, extraCssText: "box-shadow:0 4px 16px rgba(0,0,0,.12);border-radius:8px;",
      },
    };
  }
  const catAxis = (t, dataArr, extra = {}) => ({
    type: "category", data: dataArr,
    axisLine: { lineStyle: { color: t.axis } }, axisTick: { show: false },
    axisLabel: { color: t.muted, fontSize: 11 }, ...extra,
  });
  const valAxis = (t, extra = {}) => ({
    type: "value", splitLine: { lineStyle: { color: t.grid } },
    axisLabel: { color: t.muted, fontSize: 11 }, ...extra,
  });
  const barStyle = (color) => ({ color, borderRadius: [4, 4, 0, 0] });

  function chart(id) {
    if (!charts[id]) charts[id] = echarts.init($(id), null, { renderer: "svg" });
    return charts[id];
  }
  function empty(id, msg) {
    const t = theme();
    chart(id).setOption({
      graphic: { type: "text", left: "center", top: "middle", style: { text: msg, fill: t.muted, fontSize: 13 } },
      xAxis: { show: false }, yAxis: { show: false }, series: [],
    }, true);
  }

  // ------------------------------------------------------------ filtros
  function setupFilters() {
    for (const id of ["yearFrom", "yearTo"]) {
      $(id).innerHTML = years.map((y) => `<option value="${y}">${y}</option>`).join("");
    }
    $("yearFrom").value = state.from;
    $("yearTo").value = state.to;
    $("yearFrom").addEventListener("change", (e) => {
      state.from = +e.target.value;
      if (state.from > state.to) { state.to = state.from; $("yearTo").value = state.to; }
      render();
    });
    $("yearTo").addEventListener("change", (e) => {
      state.to = +e.target.value;
      if (state.to < state.from) { state.from = state.to; $("yearFrom").value = state.from; }
      render();
    });
    $("resetPeriod").addEventListener("click", () => {
      state.from = minYear; state.to = maxYear;
      $("yearFrom").value = minYear; $("yearTo").value = maxYear;
      render();
    });
    $("authorSearch").addEventListener("input", (e) => { state.search = e.target.value; renderAuthorTable(); });
    document.querySelectorAll("#authorTable th[data-sort]").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        state.asc = state.sort === key ? !state.asc : key === "name";
        state.sort = key;
        renderAuthorTable();
      });
    });
  }

  // ------------------------------------------------------------ agregações
  let P = [];          // artigos no período
  let authorStats = []; // [{name, n, first, last, coauthors, papers}]

  function aggregate() {
    P = papers.filter((p) => p.year >= state.from && p.year <= state.to);
    const m = new Map();
    for (const p of P) {
      for (const a of p.authors) {
        if (!m.has(a)) m.set(a, { name: a, n: 0, first: p.year, last: p.year, co: new Set(), papers: [] });
        const s = m.get(a);
        s.n += 1;
        s.first = Math.min(s.first, p.year);
        s.last = Math.max(s.last, p.year);
        p.authors.forEach((o) => o !== a && s.co.add(o));
        s.papers.push(p);
      }
    }
    authorStats = [...m.values()].map((s) => ({ ...s, coauthors: s.co.size }));
  }

  // ------------------------------------------------------------ KPIs
  function renderKpis() {
    const nAuth = authorStats.length;
    const single = authorStats.filter((s) => s.n === 1).length;
    const nEd = new Set(P.map((p) => p.year)).size;
    const avg = P.length ? P.reduce((s, p) => s + p.authors.length, 0) / P.length : 0;
    const items = [
      ["Artigos", fmt(P.length), `${state.from}–${state.to}`],
      ["Autores distintos", fmt(nAuth), "nomes normalizados"],
      ["Edições", fmt(nEd), "uma por ano"],
      ["Autores por artigo", fmt(avg, 2), "média"],
      ["Autores com 1 artigo", nAuth ? `${fmt((100 * single) / nAuth, 0)}%` : "–", `${fmt(single)} de ${fmt(nAuth)}`],
    ];
    $("kpis").innerHTML = items.map(([l, v, h]) =>
      `<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="hint">${h}</div></div>`).join("");
  }

  // ------------------------------------------------------------ gráficos: produção e autoria
  function renderProduction() {
    const t = theme();
    const ys = range(state.from, state.to);
    const byYear = new Map(ys.map((y) => [y, P.filter((p) => p.year === y)]));

    chart("chPapers").setOption({
      ...base(t),
      tooltip: { ...base(t).tooltip, trigger: "axis", axisPointer: { type: "shadow" },
        formatter: (ps) => `<b>${ps[0].name}</b><br>${ps[0].value} artigos` },
      xAxis: catAxis(t, ys), yAxis: valAxis(t, { minInterval: 1 }),
      series: [{ type: "bar", data: ys.map((y) => byYear.get(y).length), itemStyle: barStyle(t.series[0]), barMaxWidth: 28 }],
    }, true);

    const distinct = ys.map((y) => new Set(byYear.get(y).flatMap((p) => p.authors)).size);
    chart("chAuthorsYear").setOption({
      ...base(t),
      tooltip: { ...base(t).tooltip, trigger: "axis", axisPointer: { type: "line", lineStyle: { color: t.axis } },
        formatter: (ps) => `<b>${ps[0].name}</b><br>${ps[0].value} autores distintos` },
      xAxis: catAxis(t, ys, { boundaryGap: false }), yAxis: valAxis(t, { minInterval: 1 }),
      series: [{ type: "line", data: distinct, color: t.series[0], lineStyle: { width: 2 },
        symbol: "circle", symbolSize: 8, showSymbol: ys.length <= 12 }],
    }, true);

    const avg = ys.map((y) => {
      const ps = byYear.get(y);
      return ps.length ? +(ps.reduce((s, p) => s + p.authors.length, 0) / ps.length).toFixed(2) : null;
    });
    chart("chAvgAuthors").setOption({
      ...base(t),
      tooltip: { ...base(t).tooltip, trigger: "axis", axisPointer: { type: "line", lineStyle: { color: t.axis } },
        formatter: (ps) => `<b>${ps[0].name}</b><br>${fmt(ps[0].value, 2)} autores por artigo` },
      xAxis: catAxis(t, ys, { boundaryGap: false }), yAxis: valAxis(t, { min: 0 }),
      series: [{ type: "line", data: avg, color: t.series[0], lineStyle: { width: 2 },
        symbol: "circle", symbolSize: 8, showSymbol: ys.length <= 12 }],
    }, true);

    const novos = ys.map((y) => new Set(byYear.get(y).flatMap((p) => p.authors).filter((a) => firstYear.get(a) === y)).size);
    const recor = ys.map((y, i) => distinct[i] - novos[i]);
    chart("chNewAuthors").setOption({
      ...base(t),
      grid: { ...base(t).grid, top: 36 },
      legend: { top: 0, left: 0, icon: "roundRect", itemWidth: 12, itemHeight: 12, textStyle: { color: t.text2 } },
      tooltip: { ...base(t).tooltip, trigger: "axis", axisPointer: { type: "shadow" },
        formatter: (ps) => {
          const tot = ps.reduce((s, x) => s + x.value, 0);
          return `<b>${ps[0].name}</b><br>` + ps.map((x) => `${x.marker}${x.seriesName}: ${x.value}`).join("<br>") +
            `<br><span style="color:${t.muted}">${tot ? fmt((100 * ps[0].value) / tot, 0) : 0}% novos</span>`;
        } },
      xAxis: catAxis(t, ys), yAxis: valAxis(t, { minInterval: 1 }),
      series: [
        { name: "Novos", type: "bar", stack: "a", data: novos, itemStyle: { color: t.series[0], borderColor: t.surface, borderWidth: 1 }, barMaxWidth: 28 },
        { name: "Recorrentes", type: "bar", stack: "a", data: recor, itemStyle: { color: t.series[1], borderRadius: [4, 4, 0, 0], borderColor: t.surface, borderWidth: 1 }, barMaxWidth: 28 },
      ],
    }, true);

    const sizes = P.map((p) => p.authors.length);
    const maxSize = Math.max(1, ...sizes);
    const xs = range(1, maxSize);
    const hist = xs.map((k) => sizes.filter((s) => s === k).length);
    chart("chTeamSize").setOption({
      ...base(t),
      tooltip: { ...base(t).tooltip, trigger: "axis", axisPointer: { type: "shadow" },
        formatter: (ps) => `<b>${ps[0].name} autor${ps[0].name === "1" ? "" : "es"}</b><br>${ps[0].value} artigos` +
          `<br><span style="color:${t.muted}">${P.length ? fmt((100 * ps[0].value) / P.length, 0) : 0}% do total</span>` },
      xAxis: catAxis(t, xs, { name: "autores no artigo", nameLocation: "middle", nameGap: 28, nameTextStyle: { color: t.muted } }),
      yAxis: valAxis(t, { minInterval: 1 }),
      grid: { ...base(t).grid, bottom: 24 },
      series: [{ type: "bar", data: hist, itemStyle: barStyle(t.series[0]), barMaxWidth: 36 }],
    }, true);

    const top = [...authorStats].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, 20).reverse();
    if (!top.length) return empty("chTopAuthors", "Sem artigos no período");
    chart("chTopAuthors").setOption({
      ...base(t),
      tooltip: { ...base(t).tooltip, trigger: "item",
        formatter: (x) => { const s = top[x.dataIndex];
          return `<b>${esc(s.name)}</b><br>${s.n} artigos<br>${s.first === s.last ? s.first : `${s.first}–${s.last}`}<br>${s.coauthors} coautores`; } },
      grid: { ...base(t).grid, right: 32 },
      xAxis: valAxis(t, { minInterval: 1 }),
      yAxis: catAxis(t, top.map((s) => s.name), { axisLabel: { color: t.text2, fontSize: 12, width: window.innerWidth < 600 ? 150 : 260, overflow: "truncate" } }),
      series: [{ type: "bar", data: top.map((s) => s.n), barMaxWidth: 18,
        itemStyle: { color: t.series[0], borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: "right", color: t.text2, fontSize: 11 } }],
    }, true);
    chart("chTopAuthors").off("click");
    chart("chTopAuthors").on("click", (x) => openAuthor(x.name));
  }


  // ------------------------------------------------------------ produção por década
  function renderDecades() {
    const t = theme();
    const label = (d) => `${d}s`;
    const rows = new Map();
    for (const p of P) {
      const d = Math.floor(p.year / 10) * 10;
      if (!rows.has(d)) rows.set(d, { d, years: new Set(), papers: 0, authorSlots: 0, authors: new Set(), novos: new Set() });
      const r = rows.get(d);
      r.years.add(p.year);
      r.papers += 1;
      r.authorSlots += p.authors.length;
      for (const a of p.authors) {
        r.authors.add(a);
        if (Math.floor(firstYear.get(a) / 10) * 10 === d) r.novos.add(a);
      }
    }
    const ds = [...rows.values()].sort((a, b) => a.d - b.d);
    for (const r of ds) {
      const ys = [...r.years];
      r.range = `${Math.min(...ys)}–${Math.max(...ys)}`;
      r.perEd = r.papers / r.years.size;
    }
    if (!ds.length) return empty("chDecades", "Sem artigos no período");
    chart("chDecades").setOption({
      ...base(t),
      grid: { ...base(t).grid, top: 44 },
      tooltip: { ...base(t).tooltip, trigger: "axis", axisPointer: { type: "shadow" },
        formatter: (ps) => { const r = ds[ps[0].dataIndex];
          return `<b>Década de ${r.d} (${r.range})</b><br>${fmt(r.perEd, 1)} artigos por edição<br>` +
            `${r.papers} artigos em ${r.years.size} ediç${r.years.size > 1 ? "ões" : "ão"}`; } },
      xAxis: catAxis(t, ds.map((r) => label(r.d))),
      yAxis: valAxis(t, { name: "artigos por edição", nameTextStyle: { color: t.muted, align: "left" } }),
      series: [{ type: "bar", data: ds.map((r) => +r.perEd.toFixed(1)), itemStyle: barStyle(t.series[0]), barMaxWidth: 56,
        label: { show: true, position: "top", color: t.text2, fontSize: 11, lineHeight: 14,
          formatter: (x) => `{b|${fmt(x.value, 1)}}\n${ds[x.dataIndex].papers} artigos`,
          rich: { b: { fontWeight: 600, fontSize: 12, color: t.text } } } }],
    }, true);
    $("decadeTable").querySelector("tbody").innerHTML = ds.map((r) =>
      `<tr><td>${label(r.d)} <span class="tag">${r.range}</span></td><td class="num">${r.years.size}</td>` +
      `<td class="num">${r.papers}</td><td class="num">${fmt(r.perEd, 1)}</td><td class="num">${fmt(r.authors.size)}</td>` +
      `<td class="num">${fmt(r.novos.size)}</td><td class="num">${fmt(r.authorSlots / r.papers, 2)}</td></tr>`).join("");
  }

  // ------------------------------------------------------------ tabela de autores
  function renderAuthorTable() {
    const q = state.search.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const key = state.sort;
    let rows = authorStats.filter((s) => !q || s.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(q));
    rows.sort((a, b) => {
      const v = key === "name" ? a.name.localeCompare(b.name) : a[key] - b[key] || a.name.localeCompare(b.name);
      return state.asc ? v : -v;
    });
    document.querySelectorAll("#authorTable th[data-sort]").forEach((th) => {
      th.classList.toggle("sorted", th.dataset.sort === key);
      th.classList.toggle("asc", th.dataset.sort === key && state.asc);
    });
    $("authorTable").querySelector("tbody").innerHTML = rows.map((s) =>
      `<tr data-name="${esc(s.name)}"><td>${esc(s.name)}</td><td class="num">${s.n}</td>` +
      `<td class="num">${s.first}</td><td class="num">${s.last}</td><td class="num">${s.coauthors}</td></tr>`).join("");
    $("authorCount").textContent = `${fmt(rows.length)} autores${q ? " encontrados" : ""}. Clique em um autor para ver a produção por ano e os artigos.`;
  }

  function showAuthor(name) {
    const s = authorStats.find((x) => x.name === name);
    if (!s) return;
    const box = $("authorDetail");
    box.hidden = false;
    const co = new Map();
    for (const p of s.papers) for (const a of p.authors) if (a !== s.name) co.set(a, (co.get(a) || 0) + 1);
    const topCo = [...co.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
    const active = new Set(s.papers.map((p) => p.year)).size;
    box.innerHTML = `<h4>${esc(s.name)} <span class="tag">${s.n} artigo${s.n > 1 ? "s" : ""}</span></h4>` +
      `<p class="meta">${s.first === s.last ? s.first : `${s.first}–${s.last}`} · ${active} ano${active > 1 ? "s" : ""} com artigo · ${s.coauthors} coautores` +
      (topCo.length ? `<br>Principais coautores: ${topCo.map(([a, n]) => `${esc(a)} (${n})`).join(", ")}` : "") + `</p>` +
      `<div class="chart author-chart" id="chAuthorYears"></div><ol>` +
      [...s.papers].sort((a, b) => a.year - b.year).map((p) =>
        `<li><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a>` +
        `<div class="meta">${p.year} · ${esc(p.authors.join("; "))}${p.doi ? ` · DOI ${esc(p.doi)}` : ""}</div></li>`).join("") + "</ol>";

    // produção do autor por ano (anos sem artigo = 0), no período filtrado
    if (charts.chAuthorYears) { charts.chAuthorYears.dispose(); delete charts.chAuthorYears; }
    const t = theme();
    const ys = range(state.from, state.to);
    const perYear = ys.map((y) => s.papers.filter((p) => p.year === y).length);
    chart("chAuthorYears").setOption({
      ...base(t),
      tooltip: { ...base(t).tooltip, trigger: "axis", axisPointer: { type: "shadow" },
        formatter: (ps) => `<b>${ps[0].name}</b><br>${ps[0].value} artigo${ps[0].value === 1 ? "" : "s"}` },
      xAxis: catAxis(t, ys), yAxis: valAxis(t, { minInterval: 1 }),
      series: [{ type: "bar", data: perYear, itemStyle: barStyle(t.series[0]), barMaxWidth: 22 }],
    }, true);
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function openAuthor(name) {
    if (location.hash !== "#autores") location.hash = "autores";
    setTimeout(() => showAuthor(name), 50);
  }

  $("authorTable").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-name]");
    if (tr) showAuthor(tr.dataset.name);
  });

  // ------------------------------------------------------------ edições e trilhas
  function renderEditions() {
    const t = theme();
    const eds = editions.filter((e) => e.year >= state.from && e.year <= state.to);

    const byCountry = new Map();
    for (const e of eds) {
      if (!byCountry.has(e.country)) byCountry.set(e.country, { n: 0, papers: 0, years: [] });
      const c = byCountry.get(e.country);
      c.n += 1; c.papers += e.n_papers; c.years.push(e.year);
    }
    const countries = [...byCountry.entries()].sort((a, b) => a[1].n - b[1].n || b[0].localeCompare(a[0]));
    chart("chCountries").setOption({
      ...base(t),
      tooltip: { ...base(t).tooltip, trigger: "item",
        formatter: (x) => { const [name, c] = countries[x.dataIndex];
          return `<b>${esc(name)}</b><br>${c.n} ediç${c.n > 1 ? "ões" : "ão"} · ${c.papers} artigos<br><span style="color:${t.muted}">${c.years.join(", ")}</span>`; } },
      grid: { ...base(t).grid, right: 32 },
      xAxis: valAxis(t, { minInterval: 1 }),
      yAxis: catAxis(t, countries.map(([n]) => n), { axisLabel: { color: t.text2, fontSize: 12 } }),
      series: [{ type: "bar", data: countries.map(([, c]) => c.n), barMaxWidth: 20,
        itemStyle: { color: t.series[0], borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: "right", color: t.text2, fontSize: 11 } }],
    }, true);

    const ty = range(Math.max(2018, state.from), state.to);
    if (!ty.length) {
      empty("chTracks", "Período sem edições a partir de 2018");
    } else {
      const present = TRACKS.filter((g) => P.some((p) => p.track_group === g));
      chart("chTracks").setOption({
        ...base(t),
        grid: { ...base(t).grid, top: 56 },
        legend: { top: 0, left: 0, icon: "roundRect", itemWidth: 12, itemHeight: 12, textStyle: { color: t.text2 } },
        tooltip: { ...base(t).tooltip, trigger: "axis", axisPointer: { type: "shadow" },
          formatter: (ps) => `<b>${ps[0].name}</b><br>` + ps.filter((x) => x.value).map((x) => `${x.marker}${x.seriesName}: ${x.value}`).join("<br>") },
        xAxis: catAxis(t, ty), yAxis: valAxis(t, { minInterval: 1 }),
        series: present.map((g, i) => ({
          name: g, type: "bar", stack: "t", barMaxWidth: 32,
          data: ty.map((y) => P.filter((p) => p.year === y && p.track_group === g).length),
          itemStyle: { color: t.series[TRACKS.indexOf(g)], borderColor: t.surface, borderWidth: 1,
            borderRadius: i === present.length - 1 ? [4, 4, 0, 0] : 0 },
        })),
      }, true);
    }

    $("editionTable").querySelector("tbody").innerHTML = [...eds].reverse().map((e) =>
      `<tr><td class="num">${e.year}</td><td title="${esc(e.name)}">${esc(e.edition)}</td><td>${esc(e.city)}${e.virtual ? '<span class="tag">virtual</span>' : ""}</td>` +
      `<td>${esc(e.country)}</td><td class="num">${e.n_papers}</td></tr>`).join("");

    const old = P.filter((p) => p.year <= 2017);
    const byYear = new Map();
    for (const p of old) {
      if (!byYear.has(p.year)) byYear.set(p.year, new Map());
      const m = byYear.get(p.year);
      m.set(p.track, (m.get(p.track) || 0) + 1);
    }
    $("sessions").innerHTML = byYear.size
      ? [...byYear.entries()].map(([y, m]) =>
        `<div><div class="year">${y}</div><ul>${[...m.entries()].map(([tr, n]) => `<li>${esc(tr)} (${n})</li>`).join("")}</ul></div>`).join("")
      : `<p class="note">Sem edições até 2017 no período selecionado.</p>`;
  }


  // ------------------------------------------------------------ mapa das sedes
  let worldReady = false;
  const mapAnim = { timer: null, step: -1 };

  async function loadWorld() {
    const topo = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then((r) => r.json());
    echarts.registerMap("world", topojson.feature(topo, topo.objects.countries));
    worldReady = true;
    renderMap();
    bindMapHover();
  }

  function mix(a, b, t) {
    const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
    const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
    return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }

  // trechos entre sedes consecutivas; a cor depende só do ano (estável ao filtrar)
  function allLegs() {
    const legs = [];
    for (let i = 0; i + 1 < editions.length; i++) {
      const a = editions[i], b = editions[i + 1];
      if (a.city === b.city) continue;
      legs.push({ from: a, to: b, t: (a.year - minYear) / Math.max(1, maxYear - 1 - minYear) });
    }
    return legs;
  }
  const LEGS = allLegs();

  function periodLegs() {
    return LEGS.filter((l) => l.from.year >= state.from && l.to.year <= state.to);
  }

  function legLabel(l) {
    return `${l.from.year} → ${l.to.year}: ${l.from.city} (${l.from.country}) → ${l.to.city} (${l.to.country})`;
  }

  function renderMap() {
    if (!worldReady) return;
    const t = theme();
    const rs = css("--ramp-start"), re = css("--ramp-end");
    const legs = periodLegs();
    const eds = editions.filter((e) => e.year >= state.from && e.year <= state.to);
    const cities = new Map();
    for (const e of eds) {
      if (!cities.has(e.city)) cities.set(e.city, { name: e.city, country: e.country, coord: e.coord, years: [] });
      cities.get(e.city).years.push(e.year + (e.virtual ? " (virtual)" : ""));
    }
    $("legendFrom").textContent = state.from;
    $("legendTo").textContent = state.to;

    const current = mapAnim.step >= 0 && mapAnim.step < legs.length ? [legs[mapAnim.step]] : [];
    chart("chMap").setOption({
      ...base(t),
      tooltip: { ...base(t).tooltip, trigger: "item" },
      geo: {
        map: "world", roam: true, center: HOME.center, zoom: HOME.zoom, scaleLimit: { min: 1, max: 12 },
        itemStyle: { areaColor: css("--land"), borderColor: css("--land-border"), borderWidth: 0.6 },
        emphasis: { disabled: true }, select: { disabled: true }, silent: true,
      },
      series: [
        {
          id: "legs", type: "lines", coordinateSystem: "geo", zlevel: 1,
          symbol: ["none", "arrow"], symbolSize: 9,
          data: legs.map((l) => ({
            coords: [l.from.coord, l.to.coord], leg: l,
            lineStyle: { color: mix(rs, re, l.t), width: 2, curveness: 0.28,
              type: l.from.virtual || l.to.virtual ? "dashed" : "solid",
              opacity: current.length ? 0.25 : 0.85 },
          })),
          label: { show: !current.length, position: "insideEndTop", formatter: (x) => x.data.leg.to.year,
            color: t.text2, fontSize: 10, fontWeight: 600, textBorderColor: t.surface, textBorderWidth: 3, distance: 4 },
          labelLayout: { hideOverlap: true },
          emphasis: { lineStyle: { width: 3.5, opacity: 1 }, label: { show: true, color: t.text, fontSize: 12 } },
          tooltip: { formatter: (x) => `<b>${x.data.leg.from.year} → ${x.data.leg.to.year}</b><br>${esc(x.data.leg.from.city)} → ${esc(x.data.leg.to.city)}` },
        },
        {
          id: "flight", type: "lines", coordinateSystem: "geo", zlevel: 2, silent: true, polyline: true,
          lineStyle: { color: t.series[1], width: 3, opacity: 0.95, cap: "round" },
          data: [],
        },
        {
          id: "head", type: "scatter", coordinateSystem: "geo", zlevel: 4, silent: true,
          symbol: "arrow", symbolSize: [12, 14], itemStyle: { color: t.series[1], borderColor: t.surface, borderWidth: 1 },
          label: { show: false, position: "top", distance: 8, formatter: (x) => x.data.year,
            color: t.text, fontSize: 14, fontWeight: 700, textBorderColor: t.surface, textBorderWidth: 4 },
          data: [],
        },
        {
          id: "cities", type: "scatter", coordinateSystem: "geo", zlevel: 3,
          data: [...cities.values()].map((c) => ({ name: c.name, value: [...c.coord, c.years.length], city: c })),
          symbolSize: (v) => 7 + 4 * v[2],
          itemStyle: { color: t.series[0], borderColor: t.surface, borderWidth: 2 },
          label: { show: true, formatter: "{b}", position: "right", color: t.text2, fontSize: 11,
            textBorderColor: t.surface, textBorderWidth: 3 },
          labelLayout: { hideOverlap: true },
          emphasis: { scale: 1.3, label: { color: t.text, fontWeight: 600 } },
          tooltip: { formatter: (x) => { const c = x.data.city;
            return `<b>${esc(c.name)}</b> · ${esc(c.country)}<br>${c.years.length} ediç${c.years.length > 1 ? "ões" : "ão"}: ${c.years.join(", ")}`; } },
        },
      ],
    }, true);
    setFlag(current.length ? current[0].to : eds[eds.length - 1]);
    if (mapAnim.step < 0) $("mapCaption").textContent = legs.length ? "" : "Sem deslocamentos no período selecionado.";
  }

  function setFlag(ed, years) {
    const box = $("mapFlag");
    if (!ed) { box.hidden = true; return; }
    box.hidden = false;
    $("mapFlagImg").src = `https://cdn.jsdelivr.net/npm/flag-icons@7/flags/4x3/${ed.iso}.svg`;
    $("mapFlagImg").alt = `Bandeira: ${ed.country}`;
    $("mapFlagEd").textContent = years || ed.edition;
    $("mapFlagCity").textContent = `${ed.city}, ${ed.country}${ed.virtual ? " · virtual" : ""}`;
  }

  // passar o mouse numa cidade mostra a bandeira dela (fora da animação)
  function bindMapHover() {
    const c = chart("chMap");
    c.off("mouseover"); c.off("mouseout");
    c.on("mouseover", { seriesId: "cities" }, (x) => {
      if (mapAnim.timer) return;
      const city = x.data.city;
      const ed = editions.filter((e) => e.city === city.name && e.year >= state.from && e.year <= state.to).pop();
      setFlag(ed, city.years.length > 1 ? `WER ${city.years.map((y) => String(y).slice(0, 4)).join(", ")}` : null);
    });
    c.on("mouseover", { seriesId: "legs" }, (x) => { if (!mapAnim.timer) setFlag(x.data.leg.to); });
    c.on("mouseout", () => {
      if (mapAnim.timer) return;
      const eds = editions.filter((e) => e.year >= state.from && e.year <= state.to);
      setFlag(eds[eds.length - 1]);
    });
  }

  const HOME = { center: [-38, 4], zoom: 2.4 };
  let tween = null;

  // move a "câmera" do mapa suavemente até center/zoom
  function flyTo(center, zoom, ms = 1100, onDone) {
    const c = chart("chMap");
    const g = c.getOption().geo[0];
    const c0 = g.center || HOME.center, z0 = g.zoom || HOME.zoom;
    cancelAnimationFrame(tween);
    const t0 = performance.now();
    const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    const frame = (now) => {
      const k = ease(Math.min(1, (now - t0) / ms));
      // interpola o zoom em escala logarítmica para a aproximação parecer constante
      const z = Math.exp(Math.log(z0) + (Math.log(zoom) - Math.log(z0)) * k);
      c.setOption({ geo: { center: [c0[0] + (center[0] - c0[0]) * k, c0[1] + (center[1] - c0[1]) * k], zoom: z } });
      if (k < 1) tween = requestAnimationFrame(frame);
      else if (onDone) onDone();
    };
    tween = requestAnimationFrame(frame);
  }

  // enquadramento que mostra origem e destino de um trecho, fora da área coberta pela bandeira
  function frameLeg(l) {
    const c = chart("chMap");
    const [a, b] = [l.from.coord, l.to.coord];
    const z = c.getOption().geo[0].zoom || HOME.zoom;
    const p0 = c.convertToPixel("geo", [0, 0]), px = c.convertToPixel("geo", [1, 0]), py = c.convertToPixel("geo", [0, 1]);
    const ppdX = Math.abs(px[0] - p0[0]), ppdY = Math.abs(py[1] - p0[1]);
    const flag = $("mapFlag");
    const top = flag.hidden ? 0 : flag.offsetTop + flag.offsetHeight + 8;  // faixa ocupada pela bandeira
    const W = c.getWidth(), H = c.getHeight() - top;
    const dlon = Math.max(4, Math.abs(a[0] - b[0])), dlat = Math.max(4, Math.abs(a[1] - b[1]));
    const f = Math.min((W * 0.55) / (dlon * ppdX), (H * 0.55) / (dlat * ppdY));
    const zoom = Math.min(10, Math.max(1.6, z * f));
    const k = zoom / z;
    // desloca o centro para o norte: o trecho fica centralizado na área livre, abaixo da bandeira
    const lat = (a[1] + b[1]) / 2 + top / 2 / (ppdY * k);
    return { center: [(a[0] + b[0]) / 2, lat], zoom };
  }

  function stepDuration() { return +$("mapSpeed").value; }

  // destaca o trecho atual sem redesenhar o mapa (mantém a transição de zoom)
  function focusLeg(l) {
    const t = theme();
    const rs = css("--ramp-start"), re = css("--ramp-end");
    const legs = periodLegs();
    chart("chMap").setOption({
      series: [
        { id: "legs", label: { show: false },
          data: legs.map((x) => ({ coords: [x.from.coord, x.to.coord], leg: x,
            lineStyle: { color: mix(rs, re, x.t), width: 2, curveness: 0.28,
              type: x.from.virtual || x.to.virtual ? "dashed" : "solid", opacity: 0.25 } })) },
        { id: "flight", data: [] },  // some enquanto a câmera se move
        { id: "head", data: [] },
      ],
    });
    setFlag(l.to);
    const v = frameLeg(l);
    const step = mapAnim.step;
    // o traçado só começa quando o mapa parou: fica sincronizado com a geografia
    flyTo(v.center, v.zoom, 1100, () => {
      if (mapAnim.step !== step || !mapAnim.timer) return;
      drawFlight(l, Math.max(1200, (stepDuration() - 1100) * 0.7));
    });
  }


  // desenha o voo: a linha laranja cresce atrás da ponta da seta, pela mesma curva das rotas
  let flightRaf = null;
  function drawFlight(l, ms) {
    const c = chart("chMap");
    const p1 = c.convertToPixel("geo", l.from.coord), p2 = c.convertToPixel("geo", l.to.coord);
    if (!p1 || !p2 || !c.getWidth()) return;  // mapa ainda sem tamanho (seção oculta)
    const cv = 0.28;  // mesma curvatura da série "legs" (curva quadrática em pixels, como no ECharts)
    const cp = [(p1[0] + p2[0]) / 2 - (p1[1] - p2[1]) * cv, (p1[1] + p2[1]) / 2 - (p2[0] - p1[0]) * cv];
    const at = (u) => [
      (1 - u) * (1 - u) * p1[0] + 2 * (1 - u) * u * cp[0] + u * u * p2[0],
      (1 - u) * (1 - u) * p1[1] + 2 * (1 - u) * u * cp[1] + u * u * p2[1]];
    const tangent = (u) => [2 * (1 - u) * (cp[0] - p1[0]) + 2 * u * (p2[0] - cp[0]),
                            2 * (1 - u) * (cp[1] - p1[1]) + 2 * u * (p2[1] - cp[1])];
    const N = 80;
    const geoPts = Array.from({ length: N + 1 }, (_, i) => c.convertFromPixel("geo", at(i / N)));
    const step = mapAnim.step;
    const t0 = performance.now();
    const ease = (x) => 1 - Math.pow(1 - x, 2);  // desacelera na chegada
    cancelAnimationFrame(flightRaf);
    const frame = (now) => {
      if (mapAnim.step !== step || !mapAnim.timer) return;
      const k = ease(Math.min(1, (now - t0) / ms));
      const n = Math.floor(k * N);
      const head = c.convertFromPixel("geo", at(k));
      const path = geoPts.slice(0, n + 1).concat([head]);
      const [dx, dy] = tangent(Math.max(k, 0.001));
      const rot = (Math.atan2(-dy, dx) * 180) / Math.PI - 90;  // o símbolo "arrow" aponta para cima
      const done = k >= 1;
      c.setOption({ series: [
        { id: "flight", data: [{ coords: path }] },
        { id: "head", data: [{ value: head, year: l.to.year, symbolRotate: rot,
          label: { show: done } }] },
      ] });
      if (!done) flightRaf = requestAnimationFrame(frame);
    };
    flightRaf = requestAnimationFrame(frame);
  }

  function stopMap(keepCaption) {
    clearTimeout(mapAnim.timer);
    mapAnim.timer = null;
    mapAnim.step = -1;
    $("mapPlay").textContent = "▶ Reproduzir trajetória";
    $("mapPlay").setAttribute("aria-pressed", "false");
    if (!keepCaption) $("mapCaption").textContent = "";
    cancelAnimationFrame(tween);
    cancelAnimationFrame(flightRaf);
    renderMap();
  }

  function stepMap() {
    const legs = periodLegs();
    mapAnim.step += 1;
    if (mapAnim.step >= legs.length) {
      mapAnim.timer = null;
      flyTo(HOME.center, HOME.zoom, 1400);
      setTimeout(() => { if (!mapAnim.timer) stopMap(true); }, 1500);
      return;
    }
    const l = legs[mapAnim.step];
    $("mapCaption").textContent = `${mapAnim.step + 1}/${legs.length} · ${legLabel(l)}`;
    focusLeg(l);
    mapAnim.timer = setTimeout(stepMap, stepDuration());
  }

  $("mapPlay").addEventListener("click", () => {
    if (mapAnim.timer) return stopMap(false);
    if (!periodLegs().length) return;
    $("mapPlay").textContent = "■ Parar";
    $("mapPlay").setAttribute("aria-pressed", "true");
    renderMap();
    mapAnim.step = -1;
    stepMap();
  });


  // ------------------------------------------------------------ navegação (menu lateral)
  const VIEWS = { dashboard: "Dashboard", autores: "Autores", edicoes: "Edições", trilhas: "Trilhas", dados: "Dados" };

  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    $("scrim").hidden = !open;
    $("menuBtn").setAttribute("aria-expanded", String(open));
  }

  function route() {
    const view = location.hash.slice(1) in VIEWS ? location.hash.slice(1) : "dashboard";
    document.querySelectorAll("section.view").forEach((sec) => { sec.hidden = sec.dataset.view !== view; });
    document.querySelectorAll(".sidebar nav a").forEach((a) => {
      if (a.dataset.view === view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    $("viewTitle").textContent = VIEWS[view];
    document.title = `${VIEWS[view]} · WER Bibliometria`;
    if (view !== "edicoes" && mapAnim.timer) stopMap(false);
    setMenu(false);
    window.scrollTo(0, 0);
    // gráficos criados com a seção oculta precisam ser redimensionados ao aparecer
    requestAnimationFrame(() => Object.values(charts).forEach((c) => c.resize()));
  }

  $("menuBtn").addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
  $("scrim").addEventListener("click", () => setMenu(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  window.addEventListener("hashchange", route);


  // ------------------------------------------------------------ botões "?" (explicações)
  function setupInfoTips() {
    const close = (except) => document.querySelectorAll(".info").forEach((w) => {
      if (w === except) return;
      w.querySelector(".tip").hidden = true;
      w.querySelector(".info-btn").setAttribute("aria-expanded", "false");
    });
    document.querySelectorAll(".info").forEach((w) => {
      const btn = w.querySelector(".info-btn"), tip = w.querySelector(".tip");
      const show = () => {
        close(w);
        tip.hidden = false;
        btn.setAttribute("aria-expanded", "true");
        // mantém o balão dentro da tela (16px de margem)
        tip.style.left = "";
        const r = tip.getBoundingClientRect();
        const over = r.right - (document.documentElement.clientWidth - 16);
        if (over > 0) tip.style.left = `${Math.max(16 - (r.left + 8), -8 - over)}px`;
      };
      btn.addEventListener("click", (e) => { e.stopPropagation(); tip.hidden ? show() : close(); });
      w.addEventListener("mouseenter", show);
      w.addEventListener("mouseleave", () => { if (document.activeElement !== btn) close(); });
      btn.addEventListener("focus", show);
      btn.addEventListener("blur", () => setTimeout(() => { if (!w.matches(":hover")) close(); }, 0));
    });
    document.addEventListener("click", (e) => { if (!e.target.closest(".info")) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  // ------------------------------------------------------------ ciclo
  function render() {
    aggregate();
    renderKpis();
    renderProduction();
    renderDecades();
    renderAuthorTable();
    renderEditions();
    if (mapAnim.timer) stopMap(false); else renderMap();
    $("authorDetail").hidden = true;
  }

  $("generated").textContent = new Date(data.meta.generated + "T12:00:00").toLocaleDateString("pt-BR");
  setupFilters();
  setupInfoTips();
  render();
  route();
  loadWorld().catch(() => { $("mapCaption").textContent = "Não foi possível carregar o mapa-múndi (sem conexão com o CDN)."; });

  window.addEventListener("resize", () => Object.values(charts).forEach((c) => c.resize()));
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
})();
