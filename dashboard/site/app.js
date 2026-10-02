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
    $("authorCount").textContent = `${fmt(rows.length)} autores${q ? " encontrados" : ""}. Clique em um autor para ver os artigos.`;
  }

  function showAuthor(name) {
    const s = authorStats.find((x) => x.name === name);
    if (!s) return;
    const box = $("authorDetail");
    box.hidden = false;
    box.innerHTML = `<h4>${esc(s.name)} <span class="tag">${s.n} artigo${s.n > 1 ? "s" : ""}</span></h4><ol>` +
      [...s.papers].sort((a, b) => a.year - b.year).map((p) =>
        `<li><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a>` +
        `<div class="meta">${p.year} · ${esc(p.authors.join("; "))}${p.doi ? ` · DOI ${esc(p.doi)}` : ""}</div></li>`).join("") + "</ol>";
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

  // ------------------------------------------------------------ ciclo
  function render() {
    aggregate();
    renderKpis();
    renderProduction();
    renderAuthorTable();
    renderEditions();
    $("authorDetail").hidden = true;
  }

  $("generated").textContent = new Date(data.meta.generated + "T12:00:00").toLocaleDateString("pt-BR");
  setupFilters();
  render();

  window.addEventListener("resize", () => Object.values(charts).forEach((c) => c.resize()));
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
})();
