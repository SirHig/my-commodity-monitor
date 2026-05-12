const PN_BASE = 'https://data.plasticsnews.com';

const GRADES = {
  HDPE: [
    { id: 33609, name: 'Extrusion Sheet' },
    { id: 33587, name: 'Blow Molding Copolymer (HIC)' },
    { id: 33623, name: 'Blow Molding Homopolymer (Dairy)' },
    { id: 33583, name: 'Drums' },
    { id: 33610, name: 'Injection GP' },
    { id: 33654, name: 'Extrusion Film HMW' },
    { id: 33674, name: 'Extrusion Film MMW' },
    { id: 33668, name: 'Extrusion Pipe HMW' },
    { id: 33684, name: 'Extrusion Pipe MMW' },
    { id: 33709, name: 'Rotomolding Powder' },
  ],
  LLDPE: [
    { id: 33592, name: 'HAO Rotomolding Powder' },
    { id: 33605, name: 'Butene Injection GP' },
    { id: 33705, name: 'Butene Extrusion Liner Film' },
    { id: 33580, name: 'HAO Injection GP' },
    { id: 33708, name: 'HAO Lid Resin' },
    { id: 33665, name: 'HAO Extrusion Liner Film' },
  ],
};

const HEADLINES = { HDPE: 33609, LLDPE: 33592 };

async function fetchHistory(id) {
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { gradeId } = req.query;

  try {
    // History request for a specific grade
    if (gradeId) {
      const id = parseInt(gradeId, 10);
      const allGrades = [...GRADES.HDPE, ...GRADES.LLDPE];
      if (!allGrades.find((g) => g.id === id)) {
        return res.status(400).json({ error: 'Unknown grade ID' });
      }
      const history = await fetchHistory(id);
      return res.status(200).json({ history, fetchedAt: new Date().toISOString() });
    }

    // Current data for all grades
    const currentRes = await fetch(`${PN_BASE}/get-resin-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'resinClass=commodity-thermoplastics',
    });
    if (!currentRes.ok) throw new Error(`PN current data returned ${currentRes.status}`);
    const currentRaw = await currentRes.json();

    const buildCurrent = (grades, rawKey) => {
      const rawGrades = currentRaw[rawKey] || [];
      return grades.map((g) => {
        const raw = rawGrades.find((r) => r.ID === g.id);
        if (!raw) return { ...g, current: null, change: null, date: null };
        const avg =
          parseFloat(raw.VOL2HIGH) > 0
            ? (parseFloat(raw.VOL2LOW) + parseFloat(raw.VOL2HIGH)) / 2
            : (parseFloat(raw.VOL1LOW) + parseFloat(raw.VOL1HIGH)) / 2;
        return {
          ...g,
          current: Math.round(avg * 100) / 100,
          change: parseFloat(raw.VOL2CHANGE) || parseFloat(raw.VOL1CHANGE) || 0,
          date: raw.DATE,
        };
      });
    };

    return res.status(200).json({
      grades: {
        HDPE: buildCurrent(GRADES.HDPE, 'HDPE'),
        LLDPE: buildCurrent(GRADES.LLDPE, 'LLDPE'),
      },
      headlines: HEADLINES,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('plastics-data error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
