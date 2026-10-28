// Cloudflare Pages advanced mode: /api/quote returns live ASST and BTC prices, everything else is served as static files.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function get(url) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json,text/csv,text/plain,*/*" } });
  if (!r.ok) throw new Error(url + " " + r.status);
  return r;
}

async function asstYahoo() {
  for (const host of ["query1", "query2"]) {
    try {
      const r = await get("https://" + host + ".finance.yahoo.com/v8/finance/chart/ASST?interval=1m&range=1d&includePrePost=true");
      const d = await r.json();
      const res = d.chart.result[0];
      const m = res.meta;
      let price = m.regularMarketPrice, time = m.regularMarketTime, extended = false;
      const ts = res.timestamp || [];
      const close = (res.indicators && res.indicators.quote && res.indicators.quote[0] && res.indicators.quote[0].close) || [];
      for (let i = ts.length - 1; i >= 0; i--) {
        if (close[i] != null) {
          if (ts[i] > time) { price = close[i]; time = ts[i]; extended = true; }
          break;
        }
      }
      if (price > 0) return { price, time, extended, source: "Yahoo Finance" };
    } catch (e) {}
  }
  throw new Error("yahoo");
}

async function asstStooq() {
  const r = await get("https://stooq.com/q/l/?s=asst.us&f=sd2t2c&h&e=csv");
  const rows = (await r.text()).trim().split("\n");
  const cols = rows[1].split(",");
  const price = parseFloat(cols[3]);
  if (!(price > 0)) throw new Error("stooq");
  return { price, time: null, extended: false, source: "Stooq, delayed" };
}

async function btcPrice() {
  try {
    const d = await (await get("https://api.coinbase.com/v2/prices/BTC-USD/spot")).json();
    const p = parseFloat(d.data.amount);
    if (p > 0) return { price: p, source: "Coinbase" };
  } catch (e) {}
  try {
    const d = await (await get("https://api.kraken.com/0/public/Ticker?pair=XBTUSD")).json();
    const k = Object.keys(d.result)[0];
    const p = parseFloat(d.result[k].c[0]);
    if (p > 0) return { price: p, source: "Kraken" };
  } catch (e) {}
  const d = await (await get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")).json();
  return { price: d.bitcoin.usd, source: "CoinGecko" };
}

async function quote(ctx) {
  const cache = caches.default;
  const key = new Request("https://cache.internal/api/quote");
  const hit = await cache.match(key);
  if (hit) return hit;
  const [a, b] = await Promise.allSettled([asstYahoo().catch(() => asstStooq()), btcPrice()]);
  const body = {
    asst: a.status === "fulfilled" ? a.value.price : null,
    asstTime: a.status === "fulfilled" ? a.value.time : null,
    asstExtended: a.status === "fulfilled" ? a.value.extended : false,
    asstSource: a.status === "fulfilled" ? a.value.source : null,
    btc: b.status === "fulfilled" ? b.value.price : null,
    btcSource: b.status === "fulfilled" ? b.value.source : null,
    fetchedAt: Math.floor(Date.now() / 1000)
  };
  const res = new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=30", "access-control-allow-origin": "*" }
  });
  if (body.asst && body.btc) ctx.waitUntil(cache.put(key, res.clone()));
  return res;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/quote") {
      try { return await quote(ctx); }
      catch (e) { return new Response(JSON.stringify({ error: "unavailable" }), { status: 502, headers: { "content-type": "application/json" } }); }
    }
    return env.ASSETS.fetch(request);
  }
};
