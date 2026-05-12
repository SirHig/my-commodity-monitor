import { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ─── Tab Config ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'hrc',      label: 'HRC Steel',      color: '#ef4444', subtitle: 'Hot-Rolled Coil Futures · USD/T · Yahoo Finance (HRC=F)' },
  { key: 'plastics', label: 'Plastics',        color: '#a78bfa', subtitle: 'HDPE & LLDPE · ¢/lb · Source: Plastics News' },
  { key: 'aluminum', label: 'Aluminum',        color: '#94a3b8', subtitle: 'CME Aluminum Futures · USD/cwt · Yahoo Finance (ALI=F)' },
  { key: 'ss',       label: 'Stainless Steel', color: '#06b6d4', subtitle: 'Vale S.A. (VALE) · Nickel Proxy · Yahoo Finance' },
  { key: 'oil',      label: 'Oil',             color: '#f59e0b', subtitle: 'WTI & Brent Crude · USD/bbl · Yahoo Finance (CL=F, BZ=F)' },
];

const RANGES = [
  { label: 'YTD', key: 'ytd' },
  { label: '1Y',  key: '1y'  },
  { label: '2Y',  key: '2y'  },
  { label: '5Y',  key: '5y'  },
  { label: 'Max', key: 'max' },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[+m - 1]} ${+d}, ${y}`;
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function filterByRange(data, range) {
  if (!data.length) return [];
  const now = new Date();
  const cutoff = (years) => {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - years);
    return d.toISOString().split('T')[0];
  };
  if (range === 'ytd') return data.filter((d) => d.date >= `${now.getFullYear()}-01-01`);
  if (range === '1y')  return data.filter((d) => d.date >= cutoff(1));
  if (range === '2y')  return data.filter((d) => d.date >= cutoff(2));
  if (range === '5y')  return data.filter((d) => d.date >= cutoff(5));
  return data;
}

function buildKpi(daily) {
  if (!daily?.length) return null;
  const last  = daily[daily.length - 1];
  const prev  = daily.length > 1 ? daily[daily.length - 2] : null;
  const dayChange    = prev ? last.close - prev.close : 0;
  const dayChangePct = prev ? (dayChange / prev.close) * 100 : 0;
  const now = new Date();
  const ytd = daily.filter((d) => d.date >= `${now.getFullYear()}-01-01`);
  const ytdFirst     = ytd[0];
  const ytdChangePct = ytdFirst ? ((last.close - ytdFirst.close) / ytdFirst.close) * 100 : null;
  const ytdHigh      = ytd.length ? Math.max(...ytd.map((d) => d.close)) : null;
  const ytdLow       = ytd.length ? Math.min(...ytd.map((d) => d.close)) : null;
  const fiveYrHigh   = daily.length ? Math.max(...daily.map((d) => d.close)) : null;
  return { last, dayChange, dayChangePct, ytdChangePct, ytdHigh, ytdLow, fiveYrHigh };
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function ChangeChip({ value, suffix = '%', decimals = 2 }) {
  if (value == null || isNaN(value)) return null;
  const pos = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-semibold px-1.5 py-0.5 rounded ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
      {pos ? '▲' : '▼'} {pos ? '+' : ''}{fmt(value, decimals)}{suffix}
    </span>
  );
}

function KpiCard({ title, main, sub, accent, children }) {
  return (
    <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl p-5 flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</p>
      <p className="text-3xl font-bold font-mono" style={{ color: accent || '#fff' }}>{main}</p>
      {sub && <p className="text-sm text-slate-400">{sub}</p>}
      {children}
    </div>
  );
}

function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-lg p-3 text-sm shadow-xl">
      <p className="text-slate-400 mb-1">{fmtDate(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-mono font-semibold">
          {p.name}: {fmt(p.value)}{unit}
        </p>
      ))}
    </div>
  );
}

function RangeButtons({ range, setRange, tabColor }) {
  return (
    <div className="flex flex-wrap gap-1">
      {RANGES.map((r) => (
        <button
          key={r.key}
          onClick={() => setRange(r.key)}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            range === r.key ? 'text-black' : 'bg-[#2a2a32] text-slate-300 hover:bg-[#3a3a44]'
          }`}
          style={range === r.key ? { backgroundColor: tabColor } : {}}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function ChartPanel({ title, data, lines, tabColor, useMonthlyFor, unit = '', tickPrefix = '$' }) {
  const [range, setRange] = useState('ytd');

  const activeData = useMemo(() => {
    const src = range === 'max' && useMonthlyFor ? useMonthlyFor : data;
    return filterByRange(src, range);
  }, [data, useMonthlyFor, range]);

  const yDomain = useMemo(() => {
    const vals = lines.flatMap((l) => activeData.map((d) => d[l.dataKey]).filter((v) => v != null));
    if (!vals.length) return ['auto', 'auto'];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.1 || 5;
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [activeData, lines]);

  const xFmt = (val) => {
    if (!val) return '';
    const d = new Date(val + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <RangeButtons range={range} setRange={setRange} tabColor={tabColor} />
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={activeData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" />
          <XAxis
            dataKey="date"
            tickFormatter={xFmt}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            interval={Math.max(0, Math.floor(activeData.length / 8) - 1)}
            stroke="#2a2a32"
          />
          <YAxis
            domain={yDomain}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            stroke="#2a2a32"
            tickFormatter={(v) => `${tickPrefix}${fmt(v, 0)}`}
            width={65}
          />
          <Tooltip content={<ChartTooltip unit={unit} />} />
          {lines.length > 1 && <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12, paddingTop: 8 }} />}
          {lines.map((l) => (
            <Line
              key={l.dataKey}
              type="linear"
              dataKey={l.dataKey}
              name={l.name}
              stroke={l.color}
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 4, fill: l.color }}
              isAnimationActive={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function NewsPanel({ commodity, tabColor }) {
  const [news, setNews]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState('All');

  useEffect(() => {
    setLoading(true); setError(null); setFilter('All');
    fetch(`/api/commodity-news?commodity=${commodity}`)
      .then((r) => r.json())
      .then(({ news: n, error: e }) => {
        if (e) throw new Error(e);
        setNews(n || []); setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [commodity]);

  const feeds    = [...new Set(news.map((n) => n.feed))];
  const tabs     = ['All', ...feeds];
  const filtered = filter === 'All' ? news : news.filter((n) => n.feed === filter);

  return (
    <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold text-white">Market News</h2>
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${filter === t ? 'text-black' : 'bg-[#2a2a32] text-slate-300 hover:bg-[#3a3a44]'}`}
              style={filter === t ? { backgroundColor: tabColor } : {}}
            >{t}</button>
          ))}
        </div>
      </div>
      {loading && <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: tabColor }} /></div>}
      {error && <p className="text-red-400 text-sm py-4">{error}</p>}
      {!loading && !error && filtered.length === 0 && <p className="text-slate-500 text-sm py-4">No news found.</p>}
      {!loading && !error && (
        <ul className="divide-y divide-[#2a2a32]">
          {filtered.map((item, i) => (
            <li key={i} className="py-3 flex flex-col gap-1">
              <a href={item.link} target="_blank" rel="noopener noreferrer"
                className="text-sm text-slate-100 hover:text-amber-400 transition-colors leading-snug">
                {item.title}
              </a>
              <div className="flex items-center gap-2 text-xs">
                {item.feed && <span className="px-1.5 py-0.5 rounded font-medium" style={{ color: tabColor, background: 'rgba(255,255,255,0.05)' }}>{item.feed}</span>}
                {item.source && <span className="text-slate-500">{item.source}</span>}
                <span className="text-slate-600 ml-auto">{timeAgo(item.pubDate)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Spinner({ color }) {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: color, borderTopColor: 'transparent' }} />
        <p className="text-slate-400 text-sm">Loading data…</p>
      </div>
    </div>
  );
}

function ErrorCard({ message }) {
  return (
    <div className="bg-red-950 border border-red-800 rounded-xl p-5">
      <p className="text-red-300 font-semibold">Failed to load data</p>
      <p className="text-red-400 text-sm mt-1">{message}</p>
    </div>
  );
}

function TabFooter({ source, fetchedAt }) {
  return (
    <footer className="border-t border-[#2a2a32] pt-4 pb-2 text-xs text-slate-500 flex flex-wrap justify-between gap-2">
      <span>{source}</span>
      {fetchedAt && <span>Updated: {new Date(fetchedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
    </footer>
  );
}

// ─── Tab: Oil ─────────────────────────────────────────────────────────────────

function OilTab({ tabColor }) {
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [fetchedAt, setFetchedAt]     = useState(null);

  useEffect(() => {
    fetch('/api/commodity-data?commodity=oil')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(({ instruments: inst, fetchedAt: fa }) => { setInstruments(inst || []); setFetchedAt(fa); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const wti   = instruments.find((i) => i.ticker === 'CL=F');
  const brent = instruments.find((i) => i.ticker === 'BZ=F');

  const merge = (a, b, keyA, keyB) => {
    if (!a?.length || !b?.length) return [];
    const mapA = Object.fromEntries(a.map((d) => [d.date, d.close]));
    const mapB = Object.fromEntries(b.map((d) => [d.date, d.close]));
    const dates = [...new Set([...a.map((d) => d.date), ...b.map((d) => d.date)])].sort();
    return dates.map((date) => ({ date, [keyA]: mapA[date] ?? null, [keyB]: mapB[date] ?? null }));
  };

  const combinedDaily   = useMemo(() => merge(wti?.daily,   brent?.daily,   'wti', 'brent'), [wti, brent]);
  const combinedMonthly = useMemo(() => merge(wti?.monthly, brent?.monthly, 'wti', 'brent'), [wti, brent]);

  const wtiKpi   = buildKpi(wti?.daily);
  const brentKpi = buildKpi(brent?.daily);
  const spread   = wtiKpi && brentKpi ? brentKpi.last?.close - wtiKpi.last?.close : null;

  if (loading) return <Spinner color={tabColor} />;
  if (error)   return <ErrorCard message={error} />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {wtiKpi && <>
          <KpiCard title="WTI Current" main={`$${fmt(wtiKpi.last?.close)}`} sub={fmtDate(wtiKpi.last?.date)} accent={wti?.color}>
            <ChangeChip value={wtiKpi.dayChangePct} />
          </KpiCard>
          <KpiCard title="WTI YTD" accent={wti?.color}
            main={wtiKpi.ytdChangePct != null ? `${wtiKpi.ytdChangePct >= 0 ? '+' : ''}${fmt(wtiKpi.ytdChangePct)}%` : '—'}
            sub={wtiKpi.ytdHigh != null ? `H: $${fmt(wtiKpi.ytdHigh, 0)}  ·  L: $${fmt(wtiKpi.ytdLow, 0)}` : 'No YTD data'} />
        </>}
        {brentKpi && <>
          <KpiCard title="Brent Current" main={`$${fmt(brentKpi.last?.close)}`} sub={fmtDate(brentKpi.last?.date)} accent={brent?.color}>
            <ChangeChip value={brentKpi.dayChangePct} />
          </KpiCard>
          <KpiCard title="Brent–WTI Spread" main={spread != null ? `$${fmt(Math.abs(spread))}` : '—'}
            sub={spread != null ? (spread > 0 ? 'Brent premium to WTI' : 'WTI premium to Brent') : ''} accent="#64748b" />
        </>}
      </div>
      <ChartPanel title="WTI & Brent Crude Oil (USD/bbl)" data={combinedDaily}
        lines={[{ dataKey: 'wti', name: 'WTI Crude', color: wti?.color || '#f59e0b' }, { dataKey: 'brent', name: 'Brent Crude', color: brent?.color || '#fb923c' }]}
        tabColor={tabColor} useMonthlyFor={combinedMonthly} />
      <NewsPanel commodity="oil" tabColor={tabColor} />
      <TabFooter source="Source: Yahoo Finance (CL=F, BZ=F) · Front-month continuous futures · USD/bbl" fetchedAt={fetchedAt} />
    </div>
  );
}

// ─── Tab: Single Instrument (HRC, Aluminum, SS) ───────────────────────────────

function SingleTab({ commodity, tabColor, unit, footerSource, proxyNote, tickPrefix = '$' }) {
  const [instrument, setInstrument] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [fetchedAt, setFetchedAt]   = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`/api/commodity-data?commodity=${commodity}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(({ instruments: inst, fetchedAt: fa }) => { setInstrument(inst?.[0] || null); setFetchedAt(fa); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [commodity]);

  const kpi = useMemo(() => buildKpi(instrument?.daily), [instrument]);

  if (loading) return <Spinner color={tabColor} />;
  if (error)   return <ErrorCard message={error} />;
  if (!instrument || !kpi) return <p className="text-slate-400 py-10 text-center">No data available.</p>;

  const pctOf5YHigh = kpi.fiveYrHigh ? (kpi.last?.close / kpi.fiveYrHigh) * 100 : null;

  return (
    <div className="space-y-6">
      {proxyNote && (
        <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl px-4 py-3 flex items-start gap-3">
          <span style={{ color: tabColor }} className="text-base mt-0.5 shrink-0">ℹ</span>
          <p className="text-xs text-slate-400 leading-relaxed">{proxyNote}</p>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title={`${instrument.name} — Current`} main={`${tickPrefix}${fmt(kpi.last?.close)}`} sub={fmtDate(kpi.last?.date)} accent={tabColor}>
          <ChangeChip value={kpi.dayChangePct} />
        </KpiCard>
        <KpiCard title="Day Change"
          main={kpi.dayChange != null ? `${kpi.dayChange >= 0 ? '+' : ''}${tickPrefix}${fmt(Math.abs(kpi.dayChange))}` : '—'}
          sub={unit} accent={tabColor}>
          <ChangeChip value={kpi.dayChangePct} />
        </KpiCard>
        <KpiCard title="YTD"
          main={kpi.ytdChangePct != null ? `${kpi.ytdChangePct >= 0 ? '+' : ''}${fmt(kpi.ytdChangePct)}%` : '—'}
          sub={kpi.ytdHigh != null ? `H: ${tickPrefix}${fmt(kpi.ytdHigh, 0)}  ·  L: ${tickPrefix}${fmt(kpi.ytdLow, 0)}` : 'No YTD data'}
          accent={tabColor} />
        <KpiCard title="5-Year High"
          main={kpi.fiveYrHigh != null ? `${tickPrefix}${fmt(kpi.fiveYrHigh, 0)}` : '—'}
          sub={pctOf5YHigh != null ? `Current at ${fmt(pctOf5YHigh, 0)}% of 5Y high` : ''} accent="#64748b" />
      </div>
      <ChartPanel title={`${instrument.name} (${unit})`} data={instrument.daily}
        lines={[{ dataKey: 'close', name: instrument.name, color: tabColor }]}
        tabColor={tabColor} useMonthlyFor={instrument.monthly}
        tickPrefix={tickPrefix} />
      <NewsPanel commodity={commodity} tabColor={tabColor} />
      <TabFooter source={footerSource} fetchedAt={fetchedAt} />
    </div>
  );
}

// ─── Tab: Plastics ────────────────────────────────────────────────────────────

const RESIN_COLORS = { HDPE: '#f59e0b', LLDPE: '#a78bfa' };

function PlasticsTab({ tabColor }) {
  const [grades, setGrades]         = useState({ HDPE: [], LLDPE: [] });
  const [headlines, setHeadlines]   = useState({ HDPE: 33609, LLDPE: 33592 });
  const [fetchedAt, setFetchedAt]   = useState(null);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError]           = useState(null);

  const [selectedHDPE,  setSelectedHDPE]  = useState(33609);
  const [selectedLLDPE, setSelectedLLDPE] = useState(33592);

  const [histCache,   setHistCache]   = useState({});
  const [histLoading, setHistLoading] = useState({});

  useEffect(() => {
    fetch('/api/plastics-data')
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(({ grades: g, headlines: h, fetchedAt: fa }) => {
        setGrades(g); setHeadlines(h); setFetchedAt(fa); setInitLoading(false);
      })
      .catch((e) => { setError(e.message); setInitLoading(false); });
  }, []);

  const loadHistory = useCallback((id) => {
    if (histCache[id] || histLoading[id]) return;
    setHistLoading((p) => ({ ...p, [id]: true }));
    fetch(`/api/plastics-data?gradeId=${id}`)
      .then((r) => r.json())
      .then(({ history }) => {
        setHistCache((p) => ({ ...p, [id]: history }));
        setHistLoading((p) => ({ ...p, [id]: false }));
      })
      .catch(() => setHistLoading((p) => ({ ...p, [id]: false })));
  }, [histCache, histLoading]);

  useEffect(() => {
    if (!initLoading) { loadHistory(headlines.HDPE); loadHistory(headlines.LLDPE); }
  }, [initLoading]);

  useEffect(() => { if (selectedHDPE)  loadHistory(selectedHDPE);  }, [selectedHDPE]);
  useEffect(() => { if (selectedLLDPE) loadHistory(selectedLLDPE); }, [selectedLLDPE]);

  const resinKpi = (key, selectedId) => {
    const list  = grades[key] || [];
    const grade = list.find((g) => g.id === selectedId) || list[0];
    if (!grade) return null;
    const hist = histCache[selectedId] || [];
    const now  = new Date();
    const ytd  = hist.filter((d) => d.date >= `${now.getFullYear()}-01-01`);
    return {
      current: grade.current,
      change:  grade.change,
      date:    grade.date,
      ytdHigh: ytd.length ? Math.max(...ytd.map((d) => d.avg)) : null,
      ytdLow:  ytd.length ? Math.min(...ytd.map((d) => d.avg)) : null,
      ytdChangePct: ytd.length > 1
        ? ((grade.current - ytd[0].avg) / ytd[0].avg) * 100 : null,
    };
  };

  const hdpeKpi  = resinKpi('HDPE',  selectedHDPE);
  const lldpeKpi = resinKpi('LLDPE', selectedLLDPE);

  const hdpeHistory  = (histCache[selectedHDPE]  || []).map((d) => ({ date: d.date, avg: d.avg }));
  const lldpeHistory = (histCache[selectedLLDPE] || []).map((d) => ({ date: d.date, avg: d.avg }));

  const GradeSelect = ({ resinKey, value, onChange, color }) => (
    <select value={value} onChange={(e) => onChange(+e.target.value)}
      className="bg-[#0f0f11] border border-[#2a2a32] rounded px-2 py-1 text-xs text-white focus:outline-none"
      style={{ accentColor: color }}>
      {(grades[resinKey] || []).map((g) => (
        <option key={g.id} value={g.id}>{g.name}</option>
      ))}
    </select>
  );

  if (initLoading) return <Spinner color={tabColor} />;
  if (error)       return <ErrorCard message={error} />;

  return (
    <div className="space-y-6">
      {/* Grade selectors */}
      <div className="flex flex-wrap gap-6 items-center bg-[#1a1a1f] border border-[#2a2a32] rounded-xl px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: RESIN_COLORS.HDPE }}>HDPE</span>
          <GradeSelect resinKey="HDPE" value={selectedHDPE} onChange={setSelectedHDPE} color={RESIN_COLORS.HDPE} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: RESIN_COLORS.LLDPE }}>LLDPE</span>
          <GradeSelect resinKey="LLDPE" value={selectedLLDPE} onChange={setSelectedLLDPE} color={RESIN_COLORS.LLDPE} />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {hdpeKpi && <>
          <KpiCard title="HDPE Current" main={`${fmt(hdpeKpi.current)}¢`} sub={hdpeKpi.date} accent={RESIN_COLORS.HDPE}>
            {hdpeKpi.change != null && <ChangeChip value={hdpeKpi.change} suffix="¢" />}
          </KpiCard>
          <KpiCard title="HDPE YTD" accent={RESIN_COLORS.HDPE}
            main={hdpeKpi.ytdChangePct != null ? `${hdpeKpi.ytdChangePct >= 0 ? '+' : ''}${fmt(hdpeKpi.ytdChangePct)}%` : '—'}
            sub={hdpeKpi.ytdHigh != null ? `H: ${fmt(hdpeKpi.ytdHigh)}¢  ·  L: ${fmt(hdpeKpi.ytdLow)}¢` : 'No YTD data'} />
        </>}
        {lldpeKpi && <>
          <KpiCard title="LLDPE Current" main={`${fmt(lldpeKpi.current)}¢`} sub={lldpeKpi.date} accent={RESIN_COLORS.LLDPE}>
            {lldpeKpi.change != null && <ChangeChip value={lldpeKpi.change} suffix="¢" />}
          </KpiCard>
          <KpiCard title="LLDPE YTD" accent={RESIN_COLORS.LLDPE}
            main={lldpeKpi.ytdChangePct != null ? `${lldpeKpi.ytdChangePct >= 0 ? '+' : ''}${fmt(lldpeKpi.ytdChangePct)}%` : '—'}
            sub={lldpeKpi.ytdHigh != null ? `H: ${fmt(lldpeKpi.ytdHigh)}¢  ·  L: ${fmt(lldpeKpi.ytdLow)}¢` : 'No YTD data'} />
        </>}
      </div>

      {/* Charts */}
      <ResinChartPanel
        title={`HDPE — ${(grades.HDPE || []).find((g) => g.id === selectedHDPE)?.name || ''} (¢/lb)`}
        history={hdpeHistory} color={RESIN_COLORS.HDPE} loading={!!histLoading[selectedHDPE]} tabColor={tabColor} />
      <ResinChartPanel
        title={`LLDPE — ${(grades.LLDPE || []).find((g) => g.id === selectedLLDPE)?.name || ''} (¢/lb)`}
        history={lldpeHistory} color={RESIN_COLORS.LLDPE} loading={!!histLoading[selectedLLDPE]} tabColor={tabColor} />

      <NewsPanel commodity="plastics" tabColor={tabColor} />
      <TabFooter source="Source: Plastics News · North America commodity thermoplastics · V2 (mid-range volume) pricing · ¢/lb" fetchedAt={fetchedAt} />
    </div>
  );
}

function ResinChartPanel({ title, history, color, loading, tabColor }) {
  const [range, setRange] = useState('2y');

  const filtered = useMemo(() => {
    if (!history.length) return [];
    const now = new Date();
    const cutoff = (y) => { const d = new Date(now); d.setFullYear(d.getFullYear() - y); return d.toISOString().split('T')[0]; };
    if (range === 'ytd') return history.filter((d) => d.date >= `${now.getFullYear()}-01-01`);
    if (range === '1y')  return history.filter((d) => d.date >= cutoff(1));
    if (range === '2y')  return history.filter((d) => d.date >= cutoff(2));
    if (range === '5y')  return history.filter((d) => d.date >= cutoff(5));
    return history;
  }, [history, range]);

  const yDomain = useMemo(() => {
    const vals = filtered.map((d) => d.avg).filter(Boolean);
    if (!vals.length) return ['auto', 'auto'];
    const min = Math.min(...vals); const max = Math.max(...vals);
    const pad = (max - min) * 0.1 || 5;
    return [Math.floor(min - pad), Math.ceil(max + pad)];
  }, [filtered]);

  const xFmt = (val) => {
    if (!val) return '';
    const d = new Date(val + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <RangeButtons range={range} setRange={setRange} tabColor={tabColor} />
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: color, borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={filtered} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" />
            <XAxis dataKey="date" tickFormatter={xFmt} tick={{ fill: '#94a3b8', fontSize: 11 }}
              interval={Math.max(0, Math.floor(filtered.length / 8) - 1)} stroke="#2a2a32" />
            <YAxis domain={yDomain} tick={{ fill: '#94a3b8', fontSize: 11 }} stroke="#2a2a32"
              tickFormatter={(v) => `${fmt(v, 0)}¢`} width={55} />
            <Tooltip content={<ChartTooltip unit="¢/lb" />} />
            <Line type="linear" dataKey="avg" name="Price" stroke={color} dot={false} strokeWidth={2}
              activeDot={{ r: 4, fill: color }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState('hrc');
  const tab = TABS.find((t) => t.key === activeTab);

  return (
    <div className="min-h-screen bg-[#0f0f11] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">
            <span style={{ color: tab?.color }}>Commodity</span> Monitor
          </h1>
          <p className="text-xs text-slate-400 mt-1">{tab?.subtitle}</p>
        </div>

        {/* Tab Bar — pill/segmented style */}
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#13131a] border border-[#2a2a32] rounded-2xl">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 whitespace-nowrap ${
                activeTab === t.key ? 'text-black' : 'text-slate-400 hover:text-slate-100 hover:bg-[#1f1f2a]'
              }`}
              style={activeTab === t.key ? {
                backgroundColor: t.color,
                boxShadow: `0 0 14px ${t.color}55`,
              } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'oil' && <OilTab tabColor={tab.color} />}

        {activeTab === 'hrc' && (
          <SingleTab commodity="hrc" tabColor={tab.color} unit="USD/T"
            footerSource="Source: Yahoo Finance (HRC=F) · U.S. Midwest HRC Steel (CRU) Index Futures · USD/T" />
        )}

        {activeTab === 'aluminum' && (
          <SingleTab commodity="aluminum" tabColor={tab.color} unit="USD/cwt"
            footerSource="Source: Yahoo Finance (ALI=F) · CME Micro Aluminum futures · USD/cwt" />
        )}

        {activeTab === 'ss' && (
          <SingleTab commodity="ss" tabColor={tab.color} unit="USD"
            footerSource="Source: Yahoo Finance (VALE) · Vale S.A. NYSE · world's largest nickel producer"
            proxyNote="Stainless steel has no direct futures market. Vale S.A. (VALE) — the world's largest nickel producer — is used as the leading indicator for SS alloy surcharge pressure. Nickel drives ~30–40% of 304/316 SS mill cost; when VALE rises, expect surcharge increases from your SS suppliers. Base carbon steel cost is tracked separately in the HRC Steel tab." />
        )}

        {activeTab === 'plastics' && <PlasticsTab tabColor={tab.color} />}

      </div>
    </div>
  );
}
