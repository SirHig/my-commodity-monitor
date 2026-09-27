import { PN_BASE, fetchHistory } from '../../lib/plastics.mjs';

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
  PP: [
    { id: 33596, name: 'Homopolymer Injection GP' },
    { id: 33608, name: 'Extrusion Fiber' },
    { id: 33594, name: 'Extrusion Film' },
    { id: 33630, name: 'Extrusion Profiles' },
    { id: 33624, name: 'Extrusion Sheet' },
    { id: 33614, name: 'Random Copolymer Injection' },
    { id: 33691, name: 'Random Copolymer Film' },
    { id: 33619, name: 'Random Copolymer Blow Molding' },
    { id: 33643, name: 'Impact Copolymer High Impact' },
    { id: 33627, name: 'Impact Copolymer TPO' },
  ],
};

const HEADLINES = { HDPE: 33609, LLDPE: 33592, PP: 33596 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { gradeId } = req.query;

  try {
    // History request for a specific grade
    if (gradeId) {
      const id = parseInt(gradeId, 10);
      const allGrades = [...GRADES.HDPE, ...GRADES.LLDPE, ...GRADES.PP];
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
        PP: buildCurrent(GRADES.PP, 'PP'),
      },
      headlines: HEADLINES,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('plastics-data error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
