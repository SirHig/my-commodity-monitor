import { fetchYF } from '../../lib/yahoo.mjs';

const COMMODITIES = {
  oil: {
    instruments: [
      { ticker: 'CL=F', name: 'WTI Crude', unit: 'USD/bbl', color: '#f59e0b' },
      { ticker: 'BZ=F', name: 'Brent Crude', unit: 'USD/bbl', color: '#38bdf8' },
    ],
  },
  aluminum: {
    instruments: [
      { ticker: 'ALI=F', name: 'Aluminum', unit: 'USD/lb', color: '#94a3b8', divisor: 2204.62 },
    ],
  },
  ss: {
    instruments: [
      { ticker: 'VALE', name: 'Vale S.A. (Nickel Proxy)', unit: 'USD', color: '#06b6d4' },
    ],
  },
  hrc: {
    instruments: [
      { ticker: 'HRC=F', name: 'HRC Steel (CME)', unit: 'USD/T', color: '#ef4444' },
    ],
  },
  natgas: {
    instruments: [
      { ticker: 'NG=F', name: 'Henry Hub Natural Gas', unit: 'USD/MMBtu', color: '#34d399' },
    ],
  },
  pkg: {
    instruments: [
      { ticker: 'PKG', name: 'Packaging Corp of America', unit: 'USD', color: '#84cc16' },
    ],
  },
  ip: {
    instruments: [
      { ticker: 'IP', name: 'International Paper', unit: 'USD', color: '#60a5fa' },
    ],
  },
  diesel: {
    instruments: [
      { ticker: 'HO=F', name: 'ULSD Diesel (NYMEX)', unit: 'USD/gal', color: '#fb923c' },
    ],
  },
  lumber: {
    instruments: [
      // CME Lumber (LBR) launched Aug 2022, replacing random-length LBS. Quoted USD per 1,000 board feet.
      { ticker: 'LBR=F', name: 'Lumber (CME)', unit: 'USD/mbf', color: '#d4a373' },
    ],
  },
  tio2: {
    instruments: [
      { ticker: 'CC',   name: 'Chemours (TiO2)', unit: 'USD', color: '#f472b6' },
      { ticker: 'TROX', name: 'Tronox (TiO2)',   unit: 'USD', color: '#c084fc' },
      { ticker: 'KRO',  name: 'Kronos (TiO2)',   unit: 'USD', color: '#fbbf24' },
    ],
  },
  coatings: {
    instruments: [
      { ticker: 'PPG',  name: 'PPG Industries', unit: 'USD', color: '#38bdf8' },
      { ticker: 'AXTA', name: 'Axalta Coating Systems', unit: 'USD', color: '#4ade80' },
    ],
  },
};

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
        const convert = (data) => {
          if (!inst.divisor) return data;
          return data.map((d) => ({
            ...d,
            close: d.close != null ? Math.round((d.close / inst.divisor) * 10000) / 10000 : null,
          }));
        };
        return { ...inst, daily: convert(daily), monthly: convert(monthly) };
      })
    );
    return res.status(200).json({ instruments, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('commodity-data error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
