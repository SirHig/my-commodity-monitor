// Compact commodity summary for the Deskbuddy CYD (ESP32). Pure functions only;
// fetching lives in pages/api/deskbuddy.js.

export const INSTRUMENTS = [
  { id: 'wti', name: 'WTI', unit: 'USD/bbl', source: 'yahoo', ticker: 'CL=F', decimals: 2, sparkLen: 22 },
  { id: 'brent', name: 'Brent', unit: 'USD/bbl', source: 'yahoo', ticker: 'BZ=F', decimals: 2, sparkLen: 22 },
  { id: 'aluminum', name: 'Aluminum', unit: 'USD/lb', source: 'yahoo', ticker: 'ALI=F', divisor: 2204.62, decimals: 4, sparkLen: 22 },
  { id: 'nickel', name: 'Nickel proxy', unit: 'USD', source: 'yahoo', ticker: 'VALE', decimals: 2, sparkLen: 22 },
  { id: 'hrc', name: 'HRC', unit: 'USD/T', source: 'yahoo', ticker: 'HRC=F', decimals: 2, sparkLen: 22 },
  { id: 'hdpe', name: 'HDPE Sheet', unit: 'cents/lb', source: 'plastics', gradeId: 33609, decimals: 2, sparkLen: 12 },
  { id: 'lldpe', name: 'LLDPE Roto', unit: 'cents/lb', source: 'plastics', gradeId: 33592, decimals: 2, sparkLen: 12 },
];

const round = (value, decimals) => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};

export function summarize(series, sparkLen, decimals) {
  const clean = (series || []).filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (clean.length < 2) throw new Error('not enough data');
  const price = clean[clean.length - 1];
  const prev = clean[clean.length - 2];
  const chg = price - prev;
  const pct = prev !== 0 ? (chg / prev) * 100 : 0;
  return {
    price: round(price, decimals),
    chg: round(chg, decimals),
    pct: round(pct, 2),
    spark: clean.slice(-sparkLen).map((v) => round(v, decimals)),
  };
}

export function buildItem(inst, series) {
  const base = { id: inst.id, name: inst.name, unit: inst.unit };
  try {
    return { ...base, ...summarize(series, inst.sparkLen, inst.decimals) };
  } catch {
    return { ...base, error: true };
  }
}

export function buildPayload(items, now) {
  return { v: 1, asOf: now.toISOString(), items };
}
