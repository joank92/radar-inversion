const DEFAULT_ROWS = [
  { ticker: "MSFT", empresa: "Microsoft", sector: "Technology", market_cap_busd: 2900, moat: "Wide", cagr_ventas_5y: 14, ev_fcf: 31, ev_ebit: 24, pct_from_52w_low: 38, analysts_buy_overweight_pct: 97, street_target_upside_pct: 14 },
  { ticker: "ASML", empresa: "ASML", sector: "Technology", market_cap_busd: 350, moat: "Wide", cagr_ventas_5y: 18, ev_fcf: 35, ev_ebit: 25, pct_from_52w_low: 28, analysts_buy_overweight_pct: 96, street_target_upside_pct: 18 },
  { ticker: "V", empresa: "Visa", sector: "Financials", market_cap_busd: 680, moat: "Wide", cagr_ventas_5y: 12, ev_fcf: 28, ev_ebit: 23, pct_from_52w_low: 22, analysts_buy_overweight_pct: 95, street_target_upside_pct: 16 },
  { ticker: "MA", empresa: "Mastercard", sector: "Financials", market_cap_busd: 510, moat: "Wide", cagr_ventas_5y: 13, ev_fcf: 30, ev_ebit: 24, pct_from_52w_low: 24, analysts_buy_overweight_pct: 96, street_target_upside_pct: 17 },
  { ticker: "COST", empresa: "Costco", sector: "Consumer Defensive", market_cap_busd: 447, moat: "Wide", cagr_ventas_5y: 11, ev_fcf: 33, ev_ebit: 27, pct_from_52w_low: 41, analysts_buy_overweight_pct: 78, street_target_upside_pct: 7 },
  { ticker: "ORCL", empresa: "Oracle", sector: "Technology", market_cap_busd: 437, moat: "Wide", cagr_ventas_5y: 10, ev_fcf: 25, ev_ebit: 19, pct_from_52w_low: 31, analysts_buy_overweight_pct: 83, street_target_upside_pct: 9 }
];

const el = {
  fileInput: document.getElementById("fileInput"),
  dataStatus: document.getElementById("dataStatus"),
  searchInput: document.getElementById("searchInput"),
  maxEvFcfInput: document.getElementById("maxEvFcfInput"),
  maxEvEbitInput: document.getElementById("maxEvEbitInput"),
  maxFromLowInput: document.getElementById("maxFromLowInput"),
  minAnalystBuyInput: document.getElementById("minAnalystBuyInput"),
  minUpsideInput: document.getElementById("minUpsideInput"),
  tableBody: document.getElementById("tableBody"),
  kpiUniverse: document.getElementById("kpiUniverse"),
  kpiTop: document.getElementById("kpiTop"),
  kpiAvg: document.getElementById("kpiAvg")
};

let rows = DEFAULT_ROWS;

function n(v, fallback = null) {
  const num = Number(String(v ?? "").replace("%", "").replace(",", "."));
  return Number.isFinite(num) ? num : fallback;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (values[i] || "").trim(); });
    return {
      ticker: obj.ticker || "",
      empresa: obj.empresa || "",
      sector: obj.sector || "",
      market_cap_busd: n(obj.market_cap_busd, 0) || 0,
      moat: obj.moat || "",
      cagr_ventas_5y: n(obj.cagr_ventas_5y),
      ev_fcf: n(obj.ev_fcf),
      ev_ebit: n(obj.ev_ebit),
      pct_from_52w_low: n(obj.pct_from_52w_low),
      analysts_buy_overweight_pct: n(obj.analysts_buy_overweight_pct),
      street_target_upside_pct: n(obj.street_target_upside_pct)
    };
  });
}

function scoreLowerBetter(value, best, worst) {
  if (value === null) return 50;
  if (value <= best) return 100;
  if (value >= worst) return 0;
  return ((worst - value) / (worst - best)) * 100;
}

function scoreHigherBetter(value, floor, target) {
  if (value === null) return 50;
  if (value <= floor) return 0;
  if (value >= target) return 100;
  return ((value - floor) / (target - floor)) * 100;
}

function scoreMoat(moat) {
  return String(moat || "").toLowerCase().includes("wide") ? 100 : 60;
}

function compute(list) {
  const q = el.searchInput.value.trim().toLowerCase();
  const maxEvFcf = n(el.maxEvFcfInput.value, 30);
  const maxEvEbit = n(el.maxEvEbitInput.value, 22);
  const maxFromLow = n(el.maxFromLowInput.value, 45);
  const minBuy = n(el.minAnalystBuyInput.value, 95);
  const minUpside = n(el.minUpsideInput.value, 20);

  return list
    .filter((r) => {
      if (q && !(r.ticker + " " + r.empresa).toLowerCase().includes(q)) return false;
      if (r.ev_fcf !== null && r.ev_fcf > maxEvFcf) return false;
      if (r.ev_ebit !== null && r.ev_ebit > maxEvEbit) return false;
      if (r.pct_from_52w_low !== null && r.pct_from_52w_low > maxFromLow) return false;
      if (r.analysts_buy_overweight_pct !== null && r.analysts_buy_overweight_pct < minBuy) return false;
      if (r.street_target_upside_pct !== null && r.street_target_upside_pct < minUpside) return false;
      return true;
    })
    .map((r) => {
      const score =
        scoreMoat(r.moat) * 0.2 +
        scoreHigherBetter(r.cagr_ventas_5y, 0, 20) * 0.18 +
        scoreLowerBetter(r.ev_fcf, 8, maxEvFcf) * 0.18 +
        scoreLowerBetter(r.ev_ebit, 6, maxEvEbit) * 0.14 +
        scoreLowerBetter(r.pct_from_52w_low, 0, maxFromLow) * 0.1 +
        scoreHigherBetter(r.analysts_buy_overweight_pct, 50, 100) * 0.12 +
        scoreHigherBetter(r.street_target_upside_pct, 0, 35) * 0.08;
      return { ...r, score: Math.round(score * 10) / 10 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);
}

function render() {
  const top = compute(rows);
  el.tableBody.innerHTML = "";

  top.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${r.ticker}</td>
      <td>${r.empresa}</td>
      <td>${r.score}</td>
      <td>${r.ev_fcf ?? "n/d"}</td>
      <td>${r.ev_ebit ?? "n/d"}</td>
      <td>${r.pct_from_52w_low ?? "n/d"}</td>
      <td>${r.analysts_buy_overweight_pct ?? "n/d"}</td>
      <td>${r.street_target_upside_pct ?? "n/d"}</td>
    `;
    el.tableBody.appendChild(tr);
  });

  const avg = top.length ? (top.reduce((a, r) => a + r.score, 0) / top.length).toFixed(1) : "0";
  el.kpiUniverse.textContent = String(rows.length);
  el.kpiTop.textContent = String(top.length);
  el.kpiAvg.textContent = String(avg);
}

[el.searchInput, el.maxEvFcfInput, el.maxEvEbitInput, el.maxFromLowInput, el.minAnalystBuyInput, el.minUpsideInput]
  .forEach((input) => {
    input.addEventListener("input", render);
    input.addEventListener("change", render);
  });

el.fileInput.addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const parsed = parseCsv(text);
  if (!parsed.length) {
    el.dataStatus.textContent = "No se pudo leer el CSV. Revisa cabeceras.";
    return;
  }
  rows = parsed;
  el.dataStatus.textContent = `CSV cargado: ${file.name} (${rows.length} filas)`;
  render();
});

render();
