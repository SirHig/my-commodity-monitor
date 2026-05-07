const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

const COMMODITIES = {
  oil: {
    instruments: [
      { ticker: 'CL=F', name: 'WTI Crude', unit: 'USD/bbl', color: '#f59e0b' },
      { ticker: 'BZ=F', name: 'Brent Crude', unit: 'USD/bbl', color: '#fb923c' },
    ],
  },
  aluminum: {
    instruments: [
      { ticker: 'ALI=F', name: 'Aluminum', unit: 'USD/cwt', color: '#94a3b8' },
    ],
  },
  ss: {
    instruments: [
      { ticker: 'NI=F', name: 'Nickel (SS Proxy)', unit: 'USD/MT', color: '#06b6d4' },
    ],
  },
};

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
};

async function fetchYF(ticker, interval, range) {
  const url = `${YF_BASE}/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;
  const res = await fetch(url, { headers: YF_HEADERS });
  if (!res.ok) throw new Error(`Yahoo Finance ${ticker} (${interval}/${range}) returned ${res.status}`);
  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(`No chart data for ${ticker}`);
  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  return timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      close: closes[i] != null ? Math.round(closes[i] * 100) / 100 : null,
    }))
    .filter((d) => d.close !== null);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { commodity } = req.query;
  const config = COMMODITIES[commodity];
  if (!config) return res.status(400).json({ error: `Unknown commodity: ${commodity}` });

  try {
    const instruments = await Promise.all(
      config.instruments.map(async (inst) => {
        const [daily, monthly] = await Promise.all([
          fetchYF(inst.ticker, '1d', '5y'),
          fetchYF(inst.ticker, '1mo', 'max'),
        ]);
        return { ...inst, daily, monthly };
      })
    );
    return res.status(200).json({ instruments, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('commodity-data error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
