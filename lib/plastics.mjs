export const PN_BASE = 'https://data.plasticsnews.com';

export async function fetchHistory(id) {
  const res = await fetch(`${PN_BASE}/get-resin-history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `resinRecId=${id}`,
  });
  if (!res.ok) throw new Error(`PN history ${id} returned ${res.status}`);
  const raw = await res.json();
  return raw
    .map((r) => {
      const avg    = r.V2[2] > 0 ? r.V2[2] : r.V1[2] > 0 ? r.V1[2] : null;
      const low    = r.V2[0] > 0 ? r.V2[0] : r.V1[0] > 0 ? r.V1[0] : null;
      const high   = r.V2[1] > 0 ? r.V2[1] : r.V1[1] > 0 ? r.V1[1] : null;
      const change = r.V2[3] !== 0 ? r.V2[3] : r.V1[3];
      const [m, d, y] = r.DT.split('/');
      const date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      return { date, avg, low, high, change };
    })
    .filter((r) => r.avg !== null);
}
