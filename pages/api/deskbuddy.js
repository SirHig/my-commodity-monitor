import { INSTRUMENTS, buildItem, buildPayload } from '../../lib/deskbuddy.mjs';
import { fetchYF } from '../../lib/yahoo.mjs';
import { fetchHistory } from '../../lib/plastics.mjs';

async function fetchSeries(inst) {
  if (inst.source === 'yahoo') {
    const rows = await fetchYF(inst.ticker, '1d', '1mo');
    return rows.map((r) => (inst.divisor ? r.close / inst.divisor : r.close));
  }
  const rows = await fetchHistory(inst.gradeId);
  return rows.map((r) => r.avg);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const results = await Promise.allSettled(INSTRUMENTS.map(fetchSeries));
  const items = INSTRUMENTS.map((inst, i) => {
    const r = results[i];
    if (r.status === 'rejected') console.error(`deskbuddy ${inst.id}:`, r.reason?.message);
    return buildItem(inst, r.status === 'fulfilled' ? r.value : null);
  });

  res.setHeader('Cache-Control', 'public, max-age=60');
  res.setHeader('Netlify-CDN-Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
  return res.status(200).json(buildPayload(items, new Date()));
}
