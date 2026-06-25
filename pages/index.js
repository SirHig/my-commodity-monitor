import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ─── Tab Config ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'dashboard', label: 'Dashboard',      color: '#64748b', subtitle: 'All commodities · Executive summary' },
  { key: 'hrc',       label: 'HRC Steel',      color: '#ef4444', subtitle: 'Hot-Rolled Coil Futures · USD/T · Yahoo Finance (HRC=F)' },
  { key: 'plastics',  label: 'Plastics',        color: '#a78bfa', subtitle: 'HDPE & LLDPE · ¢/lb · Source: Plastics News' },
  { key: 'aluminum',  label: 'Aluminum',        color: '#94a3b8', subtitle: 'CME Aluminum Futures · USD/lb · Yahoo Finance (ALI=F)' },
  { key: 'ss',        label: 'Stainless Steel', color: '#06b6d4', subtitle: 'Vale S.A. (VALE) · Nickel Proxy · Yahoo Finance' },
  { key: 'oil',       label: 'Oil',             color: '#f59e0b', subtitle: 'WTI & Brent Crude · USD/bbl · Yahoo Finance (CL=F, BZ=F)' },
  { key: 'natgas',    label: 'Nat Gas',         color: '#34d399', subtitle: 'Henry Hub Natural Gas · USD/MMBtu · Yahoo Finance (NG=F)' },
  { key: 'packaging', label: 'Packaging',       color: '#84cc16', subtitle: 'Corrugated & Paper · PKG & IP equity proxies · Yahoo Finance' },
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

function applyLightTheme(doc, el) {
  const style = doc.createElement('style');
  style.textContent = `
    [class*="bg-[#0f0f11]"] { background-color: #ffffff !important; }
    [class*="bg-[#1a1a1f]"] { background-color: #f8fafc !important; }
    [class*="bg-[#2a2a32]"] { background-color: #e2e8f0 !important; }
    [class*="bg-[#13131a]"] { background-color: #f1f5f9 !important; }
    [class*="bg-[#3a3a44]"] { background-color: #cbd5e1 !important; }
    [class*="text-white"]    { color: #0f172a   !important; }
    [class*="text-slate-100"]{ color: #1e293b   !important; }
    [class*="text-slate-200"]{ color: #334155   !important; }
    [class*="text-slate-300"]{ color: #475569   !important; }
    [class*="text-slate-400"]{ color: #64748b   !important; }
    [class*="text-slate-500"]{ color: #94a3b8   !important; }
    [class*="text-slate-600"]{ color: #94a3b8   !important; }
    [class*="border-[#2a2a32]"]     { border-color: #e2e8f0 !important; }
    [class*="divide-[#2a2a32]"] > * { border-color: #e2e8f0 !important; }
  `;
  doc.head.appendChild(style);
  el.querySelectorAll('text').forEach((node) => {
    const f = node.getAttribute('fill') || node.style.fill || '';
    if (f === '#94a3b8' || f === 'rgb(148, 163, 184)') {
      node.setAttribute('fill', '#475569'); node.style.fill = '#475569';
    } else if (f === '#ffffff' || f === 'rgb(255, 255, 255)' || f === 'rgb(255,255,255)') {
      node.setAttribute('fill', '#0f172a'); node.style.fill = '#0f172a';
    }
  });
  el.querySelectorAll(
    '.recharts-cartesian-grid line, .recharts-cartesian-axis-line, .recharts-cartesian-axis-tick-line'
  ).forEach((node) => { node.style.stroke = '#e2e8f0'; });
}

async function downloadPanel(ref, title, theme = 'dark') {
  if (!ref.current) return;
  const html2canvas = (await import('html2canvas')).default;
  const isLight = theme === 'light';
  const canvas = await html2canvas(ref.current, {
    backgroundColor: isLight ? '#f8fafc' : '#1a1a1f',
    scale: 2,
    useCORS: true,
    logging: false,
    onclone: isLight ? (doc, el) => applyLightTheme(doc, el) : undefined,
  });
  const date = new Date().toISOString().split('T')[0];
  const slug = title.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
  const link = document.createElement('a');
  link.download = `${slug}_${theme}_${date}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function DownloadButton({ panelRef, title, tabColor }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handle = async (theme) => {
    setOpen(false);
    setBusy(theme);
    await downloadPanel(panelRef, title, theme);
    setBusy(null);
  };

  const DownIcon = () => (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 1v7M3 5l3 3 3-3M1 10h10" />
    </svg>
  );
  const ChevronIcon = () => (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3.5l3 3 3-3" />
    </svg>
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => !busy && setOpen((o) => !o)}
        disabled={!!busy}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 select-none"
        style={{ backgroundColor: '#2a2a32', color: busy ? '#64748b' : tabColor }}
      >
        {busy ? (
          <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <DownIcon />
        )}
        {busy ? `Saving ${busy}…` : 'Download'}
        {!busy && <ChevronIcon />}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] bg-[#1a1a1f] border border-[#2a2a32] rounded-xl shadow-2xl overflow-hidden">
          <button onClick={() => handle('dark')}
            className="w-full px-4 py-2.5 text-xs font-medium text-left text-slate-200 hover:bg-[#2a2a32] flex items-center gap-2.5 transition-colors">
            <span>🌙</span> Dark background
          </button>
          <div className="h-px bg-[#2a2a32]" />
          <button onClick={() => handle('light')}
            className="w-full px-4 py-2.5 text-xs font-medium text-left text-slate-200 hover:bg-[#2a2a32] flex items-center gap-2.5 transition-colors">
            <span>☀️</span> Light background
          </button>
        </div>
      )}
    </div>
  );
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

// ─── Supplier Prices ──────────────────────────────────────────────────────────

function useSupplierPrices() {
  const [prices, setPrices] = useState({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lsi_supplier_prices');
      if (stored) setPrices(JSON.parse(stored));
    } catch {}
  }, []);

  const setPrice = useCallback((key, value) => {
    setPrices((prev) => {
      const parsed = value === '' || value === null ? null : parseFloat(value);
      const updated = { ...prev, [key]: isNaN(parsed) ? null : parsed };
      try { localStorage.setItem('lsi_supplier_prices', JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  return [prices, setPrice];
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function ChangeChip({ value, suffix = '%', decimals = 2 }) {
  if (value == null || isNaN(value)) return null;
  const pos = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-semibold px-1.5 py-0.5 rounded ${pos ? 'text-red-400' : 'text-emerald-400'}`}>
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

function ChartPanel({ title, data, lines, tabColor, useMonthlyFor, unit = '', tickPrefix = '$', yDecimals = 0 }) {
  const [range, setRange] = useState('ytd');
  const panelRef = useRef(null);

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
    <div ref={panelRef} className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <div className="flex items-center gap-2">
          <RangeButtons range={range} setRange={setRange} tabColor={tabColor} />
          <DownloadButton panelRef={panelRef} title={title} tabColor={tabColor} />
        </div>
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
            tickFormatter={(v) => `${tickPrefix}${fmt(v, yDecimals)}`}
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

// ─── Supplier Price Panel ─────────────────────────────────────────────────────

function SupplierPriceRow({ label, unit, tickPrefix = '', marketPrice, value, onSave }) {
  const [inputVal, setInputVal] = useState(value != null ? String(value) : '');

  useEffect(() => {
    setInputVal(value != null ? String(value) : '');
  }, [value]);

  const delta = value != null && marketPrice != null
    ? ((value - marketPrice) / marketPrice) * 100
    : null;

  const save = () => onSave(inputVal);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs font-semibold text-slate-300 w-20 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          step="any"
          placeholder="—"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          className="w-24 bg-[#0f0f11] border border-[#2a2a32] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-slate-500 font-mono"
        />
        <span className="text-xs text-slate-500">{unit}</span>
      </div>
      {marketPrice != null && (
        <span className="text-xs text-slate-500">
          mkt: <span className="font-mono text-slate-300">{tickPrefix}{fmt(marketPrice)}</span>
        </span>
      )}
      {delta != null && (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          delta > 0 ? 'text-red-400 bg-red-950/60' : 'text-emerald-400 bg-emerald-950/60'
        }`}>
          {delta > 0 ? '+' : ''}{fmt(delta)}% vs mkt
        </span>
      )}
    </div>
  );
}

function SupplierPricePanel({ items, prices, onSetPrice }) {
  return (
    <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Contracted Price</p>
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <SupplierPriceRow
            key={item.key}
            {...item}
            value={prices[item.key] ?? null}
            onSave={(v) => onSetPrice(item.key, v)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── News Panel ───────────────────────────────────────────────────────────────

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

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

const DASHBOARD_SECTIONS = [
  {
    label: 'Metals',
    items: [
      { key: 'hrc',      label: 'HRC Steel',      color: '#ef4444', unit: 'USD/T',     tickPrefix: '$', yDecimals: 0, supplierKey: 'hrc' },
      { key: 'aluminum', label: 'Aluminum',        color: '#94a3b8', unit: 'USD/lb',    tickPrefix: '$', yDecimals: 4, supplierKey: 'aluminum' },
      { key: 'ss',       label: 'Stainless (proxy)', color: '#06b6d4', unit: 'USD',    tickPrefix: '$', yDecimals: 2, supplierKey: null },
    ],
  },
  {
    label: 'Energy',
    items: [
      { key: 'oil',    label: 'WTI Crude',     color: '#f59e0b', unit: 'USD/bbl',   tickPrefix: '$', yDecimals: 2, supplierKey: 'oil' },
      { key: 'natgas', label: 'Natural Gas',   color: '#34d399', unit: 'USD/MMBtu', tickPrefix: '$', yDecimals: 3, supplierKey: 'natgas' },
    ],
  },
  {
    label: 'Plastics',
    items: [
      { key: 'hdpe',  label: 'HDPE',  color: '#f59e0b', unit: '¢/lb', tickPrefix: '', yDecimals: 2, supplierKey: 'plastics_hdpe',  isPlastics: true },
      { key: 'lldpe', label: 'LLDPE', color: '#a78bfa', unit: '¢/lb', tickPrefix: '', yDecimals: 2, supplierKey: 'plastics_lldpe', isPlastics: true },
    ],
  },
  {
    label: 'Packaging',
    items: [
      { key: 'pkg', label: 'Corrugated (PKG)', color: '#84cc16', unit: 'USD', tickPrefix: '$', yDecimals: 2, supplierKey: null },
      { key: 'ip',  label: 'Paper (IP)',       color: '#60a5fa', unit: 'USD', tickPrefix: '$', yDecimals: 2, supplierKey: null },
    ],
  },
];

// Inline SVG sparkline built from an array of closing prices
function DashboardSparkline({ points }) {
  if (!points || points.length < 2) return <span style={{ color: '#334155' }}>—</span>;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 64, h = 24;
  const path = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  // Buyer perspective: price trend up = costs rising = red; down = green
  const trend = points[points.length - 1] - points[0];
  const stroke = trend > 0 ? '#f87171' : '#34d399';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ display: 'block' }}>
      <path d={path} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
}

function DashboardTab({ supplierPrices, onTabSwitch }) {
  const [allData, setAllData] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState(null);

  useEffect(() => {
    const yfKeys = ['oil', 'hrc', 'aluminum', 'ss', 'natgas', 'pkg', 'ip'];
    Promise.allSettled([
      ...yfKeys.map((k) =>
        fetch(`/api/commodity-data?commodity=${k}`)
          .then((r) => r.json())
          .then((d) => [k, d])
      ),
      fetch('/api/plastics-data')
        .then((r) => r.json())
        .then((d) => ['plastics', d]),
      fetch('/api/plastics-data?gradeId=33609')
        .then((r) => r.json())
        .then((d) => ['plasticsHistHdpe', d]),
      fetch('/api/plastics-data?gradeId=33592')
        .then((r) => r.json())
        .then((d) => ['plasticsHistLldpe', d]),
    ]).then((results) => {
      const data = {};
      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          const [key, val] = r.value;
          data[key] = val;
        }
      });
      setAllData(data);
      setFetchedAt(new Date().toISOString());
      setLoading(false);
    });
  }, []);

  const getRowData = (item) => {
    if (item.isPlastics) {
      const grades = allData.plastics?.grades;
      if (!grades) return null;
      const resinKey = item.key === 'hdpe' ? 'HDPE' : 'LLDPE';
      const headlineId = item.key === 'hdpe' ? 33609 : 33592;
      const list = grades[resinKey] || [];
      const grade = list.find((g) => g.id === headlineId) || list[0];
      if (!grade || grade.current == null) return null;
      const prev = grade.current - (grade.change || 0);
      const dayChangePct = prev > 0 ? ((grade.change || 0) / prev) * 100 : null;
      const hist = (item.key === 'hdpe' ? allData.plasticsHistHdpe : allData.plasticsHistLldpe)?.history || [];
      const ytd = hist.filter((d) => d.date >= `${new Date().getFullYear()}-01-01`);
      const ytdChangePct = ytd.length > 1 && ytd[0].avg > 0
        ? ((grade.current - ytd[0].avg) / ytd[0].avg) * 100 : null;
      const sparkPoints = ytd.slice(-30).map((d) => d.avg);
      return {
        price: grade.current, date: grade.date, dayChangePct, ytdChangePct,
        sparkPoints: sparkPoints.length >= 2 ? sparkPoints : null,
      };
    }

    const instruments = allData[item.key]?.instruments;
    if (!instruments?.length) return null;
    const inst = item.key === 'oil'
      ? instruments.find((i) => i.ticker === 'CL=F') || instruments[0]
      : instruments[0];
    const kpi = buildKpi(inst?.daily);
    if (!kpi) return null;
    const now = new Date();
    const ytdDaily = (inst.daily || []).filter((d) => d.date >= `${now.getFullYear()}-01-01`);
    const sparkPoints = ytdDaily.slice(-30).map((d) => d.close);
    return {
      price: kpi.last?.close,
      date: kpi.last?.date,
      dayChangePct: kpi.dayChangePct,
      ytdChangePct: kpi.ytdChangePct,
      sparkPoints: sparkPoints.length >= 2 ? sparkPoints : null,
    };
  };

  if (loading) return <Spinner color="#64748b" />;

  // Pre-compute all row data for bottom panels
  const allRows = DASHBOARD_SECTIONS.flatMap((s) =>
    s.items.map((item) => {
      const rowData = getRowData(item);
      const supplierPrice = item.supplierKey ? (supplierPrices[item.supplierKey] ?? null) : null;
      const delta = supplierPrice != null && rowData?.price != null
        ? ((supplierPrice - rowData.price) / rowData.price) * 100 : null;
      return { item, rowData, supplierPrice, delta };
    })
  );
  const contractedRows = allRows.filter((r) => r.delta != null);
  const aboveMkt       = contractedRows.filter((r) => r.delta > 0);

  const HDR = { fontSize: 9, color: '#475569', letterSpacing: '0.18em', fontWeight: 700,
    textTransform: 'uppercase', padding: '6px 0', paddingRight: 14,
    borderBottom: '1px solid #334155', whiteSpace: 'nowrap' };

  // PN publishes a weekly sheet; surface its date so a flat price still reads as current
  const plasticsSheetDate = (allData.plastics?.grades?.HDPE || []).find((g) => g.date)?.date;

  const priceStr = (item, price) =>
    price != null
      ? `${item.tickPrefix}${fmt(price, item.yDecimals)}${item.unit.includes('¢') ? '¢' : ''}`
      : '—';

  return (
    <div className="space-y-6" style={{ fontFamily: "ui-monospace, 'Cascadia Code', Consolas, monospace" }}>

      {/* ── Header ── */}
      <div className="flex items-baseline justify-between border-b border-[#2a2a32] pb-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest">Landscape Structures Inc.</p>
          <h1 className="text-lg font-bold text-slate-100 mt-1">Supply Chain Commodity Briefing</h1>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-xs text-slate-400">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          {fetchedAt && (
            <p className="text-xs text-slate-600 mt-0.5">
              Fetched {new Date(fetchedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      {/* ── Briefing Table ── */}
      <div className="overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ ...HDR, textAlign: 'left' }}>Commodity</th>
              <th style={{ ...HDR, textAlign: 'right' }}>Price</th>
              <th style={{ ...HDR, textAlign: 'right' }}>Unit</th>
              <th style={{ ...HDR, textAlign: 'right' }}>Day Δ</th>
              <th style={{ ...HDR, textAlign: 'right' }}>YTD Δ</th>
              <th style={{ ...HDR, textAlign: 'center' }}>Trend</th>
              <th style={{ ...HDR, textAlign: 'right' }}>Contract</th>
              <th style={{ ...HDR, textAlign: 'right', paddingRight: 0 }}>vs Mkt</th>
            </tr>
          </thead>
          <tbody>
            {DASHBOARD_SECTIONS.map((section) => (
              <Fragment key={section.label}>
                {/* Section header row */}
                <tr>
                  <td colSpan={8} style={{ paddingTop: 18, paddingBottom: 5 }}>
                    <span style={{ color: '#475569', fontSize: 9, letterSpacing: '0.25em', fontWeight: 700, textTransform: 'uppercase' }}>
                      {section.label}
                      {section.label === 'Plastics' && plasticsSheetDate ? ` · week of ${plasticsSheetDate}` : ''}
                    </span>
                  </td>
                </tr>

                {section.items.map((item) => {
                  const rowData = getRowData(item);
                  const supplierPrice = item.supplierKey ? (supplierPrices[item.supplierKey] ?? null) : null;
                  const delta = supplierPrice != null && rowData?.price != null
                    ? ((supplierPrice - rowData.price) / rowData.price) * 100 : null;
                  const CELL = { borderBottom: '1px solid #1a1a22', padding: '9px 14px 9px 0' };

                  return (
                    <tr key={item.key}>
                      {/* Name */}
                      <td style={{ ...CELL, paddingLeft: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, flexShrink: 0, display: 'inline-block' }} />
                          <span style={{ color: '#e2e8f0' }}>{item.label}</span>
                        </div>
                      </td>
                      {/* Price */}
                      <td style={{ ...CELL, textAlign: 'right', color: item.color, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        {priceStr(item, rowData?.price)}
                      </td>
                      {/* Unit */}
                      <td style={{ ...CELL, textAlign: 'right', color: '#475569' }}>{item.unit}</td>
                      {/* Day Δ */}
                      <td style={{ ...CELL, textAlign: 'right' }}>
                        {rowData?.dayChangePct != null
                          ? <ChangeChip value={rowData.dayChangePct} />
                          : <span style={{ color: '#334155' }}>—</span>}
                      </td>
                      {/* YTD Δ */}
                      <td style={{ ...CELL, textAlign: 'right' }}>
                        {rowData?.ytdChangePct != null
                          ? <ChangeChip value={rowData.ytdChangePct} />
                          : <span style={{ color: '#334155' }}>—</span>}
                      </td>
                      {/* Trend sparkline */}
                      <td style={{ ...CELL, textAlign: 'center', padding: '7px 14px 7px 0' }}>
                        <DashboardSparkline points={rowData?.sparkPoints} />
                      </td>
                      {/* Contracted price */}
                      <td style={{ ...CELL, textAlign: 'right', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                        {supplierPrice != null
                          ? priceStr(item, supplierPrice)
                          : item.supplierKey
                            ? <button
                                onClick={() => onTabSwitch(item.key === 'hdpe' || item.key === 'lldpe' ? 'plastics' : item.key)}
                                style={{ color: '#334155', fontSize: 11, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                              >+ add</button>
                            : <span style={{ color: '#334155' }}>—</span>}
                      </td>
                      {/* vs Market delta */}
                      <td style={{ ...CELL, textAlign: 'right', paddingRight: 0 }}>
                        {delta != null ? (
                          <span style={{
                            fontSize: 11, fontWeight: 700,
                            color: delta > 0 ? '#f87171' : '#34d399',
                            background: delta > 0 ? 'rgba(127,29,29,0.35)' : 'rgba(6,78,59,0.35)',
                            padding: '2px 6px', borderRadius: 4,
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {delta > 0 ? '+' : ''}{fmt(delta)}%
                          </span>
                        ) : <span style={{ color: '#334155' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Bottom panels ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Above-market contracts */}
        <div className="border border-[#2a2a32] rounded-lg p-4">
          <p style={{ color: '#475569', fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>
            ⚠ Above-Market Contracts
          </p>
          {aboveMkt.length === 0 ? (
            <p style={{ color: '#334155', fontSize: 11 }}>All contracted prices are at or below market.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {aboveMkt.map((r) => (
                <li key={r.item.key} style={{ fontSize: 11, padding: '3px 0', color: '#94a3b8' }}>
                  · {r.item.label}:{' '}
                  <span style={{ color: '#f87171', fontWeight: 700 }}>+{fmt(r.delta)}% above market</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Full contract position */}
        <div className="border border-[#2a2a32] rounded-lg p-4">
          <p style={{ color: '#475569', fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>
            Contract Position
          </p>
          {contractedRows.length === 0 ? (
            <p style={{ color: '#334155', fontSize: 11 }}>
              No contracted prices entered.{' '}
              <button onClick={() => onTabSwitch('hrc')} style={{ color: '#64748b', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', fontSize: 11 }}>
                Add via commodity tabs.
              </button>
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {contractedRows.map((r) => (
                <li key={r.item.key} style={{ fontSize: 11, padding: '3px 0' }}>
                  <span style={{ color: '#94a3b8' }}>· {r.item.label}: </span>
                  <span style={{ color: r.delta > 0 ? '#f87171' : '#34d399', fontWeight: 700 }}>
                    {r.delta > 0 ? '+' : ''}{fmt(r.delta)}% {r.delta > 0 ? 'above' : 'below'} market
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <footer className="border-t border-[#2a2a32] pt-3 pb-1 text-xs text-slate-700 flex flex-wrap justify-between gap-2">
        <span>Metals & Energy: Yahoo Finance · Plastics: Plastics News · Contracted: LSI purchasing records</span>
      </footer>
    </div>
  );
}

// ─── Tab: HRC Steel (with LSI price overlay) ─────────────────────────────────

const LSI_HRC_COLOR = '#f97316'; // orange — distinct from market red

function mergeWithLSIPrices(marketData, lsiHistory) {
  if (!marketData?.length || !lsiHistory?.length) return marketData || [];
  const sorted = [...lsiHistory].sort((a, b) => a.date.localeCompare(b.date));
  let lsiIdx = 0;
  let currentPrice = null;
  return marketData.map((point) => {
    while (lsiIdx < sorted.length && sorted[lsiIdx].date <= point.date) {
      currentPrice = sorted[lsiIdx].price;
      lsiIdx++;
    }
    return { ...point, lsiPrice: currentPrice };
  });
}

function HRCTab({ tabColor, supplierPrices, onSetPrice }) {
  const [instrument, setInstrument] = useState(null);
  const [lsiHistory, setLsiHistory] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [fetchedAt, setFetchedAt]   = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/commodity-data?commodity=hrc').then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetch('/lsi-hrc-history.json').then((r) => r.json()).catch(() => []),
    ])
      .then(([{ instruments, fetchedAt: fa }, lsi]) => {
        setInstrument(instruments?.[0] || null);
        setLsiHistory(lsi || []);
        setFetchedAt(fa);
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const kpi = useMemo(() => buildKpi(instrument?.daily), [instrument]);

  const mergedDaily   = useMemo(() => mergeWithLSIPrices(instrument?.daily,   lsiHistory), [instrument, lsiHistory]);
  const mergedMonthly = useMemo(() => mergeWithLSIPrices(instrument?.monthly, lsiHistory), [instrument, lsiHistory]);

  const latestLSI = lsiHistory.length ? lsiHistory[lsiHistory.length - 1] : null;
  const lsiVsMarket = latestLSI && kpi?.last?.close
    ? ((latestLSI.price - kpi.last.close) / kpi.last.close) * 100
    : null;

  if (loading) return <Spinner color={tabColor} />;
  if (error)   return <ErrorCard message={error} />;
  if (!instrument || !kpi) return <p className="text-slate-400 py-10 text-center">No data available.</p>;

  const pctOf5YHigh = kpi.fiveYrHigh ? (kpi.last?.close / kpi.fiveYrHigh) * 100 : null;

  return (
    <div className="space-y-6">
      <SupplierPricePanel
        items={[{ key: 'hrc', label: 'HRC Steel (USD/T)', unit: 'USD/T', tickPrefix: '$', marketPrice: kpi.last?.close }]}
        prices={supplierPrices}
        onSetPrice={onSetPrice}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="HRC Steel — Current" main={`$${fmt(kpi.last?.close, 0)}`} sub={fmtDate(kpi.last?.date)} accent={tabColor}>
          <ChangeChip value={kpi.dayChangePct} />
        </KpiCard>
        <KpiCard title="Day Change"
          main={kpi.dayChange != null ? `${kpi.dayChange >= 0 ? '+' : ''}$${fmt(Math.abs(kpi.dayChange), 0)}` : '—'}
          sub="USD/T" accent={tabColor}>
          <ChangeChip value={kpi.dayChangePct} />
        </KpiCard>
        <KpiCard title="YTD"
          main={kpi.ytdChangePct != null ? `${kpi.ytdChangePct >= 0 ? '+' : ''}${fmt(kpi.ytdChangePct)}%` : '—'}
          sub={kpi.ytdHigh != null ? `H: $${fmt(kpi.ytdHigh, 0)}  ·  L: $${fmt(kpi.ytdLow, 0)}` : 'No YTD data'}
          accent={tabColor} />
        {latestLSI ? (
          <KpiCard title="LSI vs Market"
            main={lsiVsMarket != null ? `${lsiVsMarket >= 0 ? '+' : ''}${fmt(lsiVsMarket)}%` : '—'}
            sub={`LSI: $${fmt(latestLSI.price, 0)}  ·  ${fmtDate(latestLSI.date)}`}
            accent={lsiVsMarket != null ? (lsiVsMarket <= 0 ? '#34d399' : '#f87171') : '#64748b'} />
        ) : (
          <KpiCard title="5-Year High"
            main={kpi.fiveYrHigh != null ? `$${fmt(kpi.fiveYrHigh, 0)}` : '—'}
            sub={pctOf5YHigh != null ? `Current at ${fmt(pctOf5YHigh, 0)}% of 5Y high` : ''} accent="#64748b" />
        )}
      </div>

      <ChartPanel
        title="HRC Steel — Market vs LSI Contracted (USD/T)"
        data={mergedDaily}
        lines={[
          { dataKey: 'close',    name: 'HRC Market',       color: tabColor },
          { dataKey: 'lsiPrice', name: 'LSI Contracted',   color: LSI_HRC_COLOR },
        ]}
        tabColor={tabColor}
        useMonthlyFor={mergedMonthly}
        yDecimals={0}
      />

      <NewsPanel commodity="hrc" tabColor={tabColor} />
      <TabFooter source="Source: Yahoo Finance (HRC=F) · U.S. Midwest HRC Steel (CRU) Index Futures · USD/T · LSI contracted prices overlaid" fetchedAt={fetchedAt} />
    </div>
  );
}

// ─── Tab: Oil ─────────────────────────────────────────────────────────────────

function OilTab({ tabColor, supplierPrices, onSetPrice }) {
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
      <SupplierPricePanel
        items={[{ key: 'oil', label: 'WTI (USD/bbl)', unit: 'USD/bbl', tickPrefix: '$', marketPrice: wtiKpi?.last?.close }]}
        prices={supplierPrices}
        onSetPrice={onSetPrice}
      />
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

// ─── Tab: Single Instrument (HRC, Aluminum, SS, NatGas) ──────────────────────

function SingleTab({ commodity, tabColor, unit, footerSource, proxyNote, tickPrefix = '$', yDecimals = 0, supplierPrices, onSetPrice, supplierLabel }) {
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
      {supplierLabel && (
        <SupplierPricePanel
          items={[{ key: commodity, label: supplierLabel, unit, tickPrefix, marketPrice: kpi.last?.close }]}
          prices={supplierPrices}
          onSetPrice={onSetPrice}
        />
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
          sub={kpi.ytdHigh != null ? `H: ${tickPrefix}${fmt(kpi.ytdHigh, yDecimals)}  ·  L: ${tickPrefix}${fmt(kpi.ytdLow, yDecimals)}` : 'No YTD data'}
          accent={tabColor} />
        <KpiCard title="5-Year High"
          main={kpi.fiveYrHigh != null ? `${tickPrefix}${fmt(kpi.fiveYrHigh, yDecimals)}` : '—'}
          sub={pctOf5YHigh != null ? `Current at ${fmt(pctOf5YHigh, 0)}% of 5Y high` : ''} accent="#64748b" />
      </div>
      <ChartPanel title={`${instrument.name} (${unit})`} data={instrument.daily}
        lines={[{ dataKey: 'close', name: instrument.name, color: tabColor }]}
        tabColor={tabColor} useMonthlyFor={instrument.monthly}
        tickPrefix={tickPrefix} yDecimals={yDecimals} />
      <NewsPanel commodity={commodity} tabColor={tabColor} />
      <TabFooter source={footerSource} fetchedAt={fetchedAt} />
    </div>
  );
}

// ─── Tab: Plastics ────────────────────────────────────────────────────────────

const RESIN_COLORS = { HDPE: '#f59e0b', LLDPE: '#a78bfa' };

function PlasticsTab({ tabColor, supplierPrices, onSetPrice }) {
  const [grades, setGrades]           = useState({ HDPE: [], LLDPE: [] });
  const [headlines, setHeadlines]     = useState({ HDPE: 33609, LLDPE: 33592 });
  const [fetchedAt, setFetchedAt]     = useState(null);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError]             = useState(null);

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

      {/* Supplier price panel */}
      <SupplierPricePanel
        items={[
          { key: 'plastics_hdpe',  label: 'HDPE (¢/lb)',  unit: '¢/lb', tickPrefix: '', marketPrice: hdpeKpi?.current  ?? null },
          { key: 'plastics_lldpe', label: 'LLDPE (¢/lb)', unit: '¢/lb', tickPrefix: '', marketPrice: lldpeKpi?.current ?? null },
        ]}
        prices={supplierPrices}
        onSetPrice={onSetPrice}
      />

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
  const panelRef = useRef(null);

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
    <div ref={panelRef} className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <div className="flex items-center gap-2">
          <RangeButtons range={range} setRange={setRange} tabColor={tabColor} />
          <DownloadButton panelRef={panelRef} title={title} tabColor={tabColor} />
        </div>
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

// ─── Tab: Packaging (Corrugated & Paper) ─────────────────────────────────────

const PKG_COLOR = '#84cc16';
const IP_COLOR  = '#60a5fa';

function PackagingTab({ tabColor }) {
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [fetchedAt, setFetchedAt]     = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/commodity-data?commodity=pkg').then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
      fetch('/api/commodity-data?commodity=ip').then((r)  => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
    ])
      .then(([pkgData, ipData]) => {
        const pkg = pkgData.instruments?.[0];
        const ip  = ipData.instruments?.[0];
        setInstruments([
          pkg ? { ...pkg, color: PKG_COLOR } : null,
          ip  ? { ...ip,  color: IP_COLOR  } : null,
        ].filter(Boolean));
        setFetchedAt(pkgData.fetchedAt || new Date().toISOString());
        setLoading(false);
      })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const merge = (a, b, keyA, keyB) => {
    if (!a?.length || !b?.length) return [];
    const mapA = Object.fromEntries(a.map((d) => [d.date, d.close]));
    const mapB = Object.fromEntries(b.map((d) => [d.date, d.close]));
    const dates = [...new Set([...a.map((d) => d.date), ...b.map((d) => d.date)])].sort();
    return dates.map((date) => ({ date, [keyA]: mapA[date] ?? null, [keyB]: mapB[date] ?? null }));
  };

  const [pkg, ip] = instruments;
  const pkgKpi = useMemo(() => buildKpi(pkg?.daily), [pkg]);
  const ipKpi  = useMemo(() => buildKpi(ip?.daily),  [ip]);

  const combinedDaily   = useMemo(() => merge(pkg?.daily,   ip?.daily,   'pkg', 'ip'), [pkg, ip]);
  const combinedMonthly = useMemo(() => merge(pkg?.monthly, ip?.monthly, 'pkg', 'ip'), [pkg, ip]);

  if (loading) return <Spinner color={tabColor} />;
  if (error)   return <ErrorCard message={error} />;

  return (
    <div className="space-y-6">
      <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl px-4 py-3 flex items-start gap-3">
        <span style={{ color: tabColor }} className="text-base mt-0.5 shrink-0">ℹ</span>
        <p className="text-xs text-slate-400 leading-relaxed">
          No direct futures market exists for corrugated or paper. <strong style={{ color: PKG_COLOR }}>Packaging Corporation of America (PKG)</strong> — one of the largest North American containerboard and corrugated box producers — is used as the leading indicator for corrugated pricing pressure. <strong style={{ color: IP_COLOR }}>International Paper (IP)</strong> covers the broader paper and industrial packaging market. When these equities rise, expect upward pressure on box and packaging contracts from your suppliers.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {pkgKpi && <>
          <KpiCard title="PKG — Current" main={`$${fmt(pkgKpi.last?.close)}`} sub={fmtDate(pkgKpi.last?.date)} accent={PKG_COLOR}>
            <ChangeChip value={pkgKpi.dayChangePct} />
          </KpiCard>
          <KpiCard title="PKG YTD" accent={PKG_COLOR}
            main={pkgKpi.ytdChangePct != null ? `${pkgKpi.ytdChangePct >= 0 ? '+' : ''}${fmt(pkgKpi.ytdChangePct)}%` : '—'}
            sub={pkgKpi.ytdHigh != null ? `H: $${fmt(pkgKpi.ytdHigh)}  ·  L: $${fmt(pkgKpi.ytdLow)}` : 'No YTD data'} />
        </>}
        {ipKpi && <>
          <KpiCard title="IP — Current" main={`$${fmt(ipKpi.last?.close)}`} sub={fmtDate(ipKpi.last?.date)} accent={IP_COLOR}>
            <ChangeChip value={ipKpi.dayChangePct} />
          </KpiCard>
          <KpiCard title="IP YTD" accent={IP_COLOR}
            main={ipKpi.ytdChangePct != null ? `${ipKpi.ytdChangePct >= 0 ? '+' : ''}${fmt(ipKpi.ytdChangePct)}%` : '—'}
            sub={ipKpi.ytdHigh != null ? `H: $${fmt(ipKpi.ytdHigh)}  ·  L: $${fmt(ipKpi.ytdLow)}` : 'No YTD data'} />
        </>}
      </div>

      <ChartPanel
        title="Corrugated & Paper Proxies — PKG & IP (USD)"
        data={combinedDaily}
        lines={[
          { dataKey: 'pkg', name: 'PKG (Corrugated)', color: PKG_COLOR },
          { dataKey: 'ip',  name: 'IP (Paper)',       color: IP_COLOR  },
        ]}
        tabColor={tabColor}
        useMonthlyFor={combinedMonthly}
        yDecimals={2}
      />

      <NewsPanel commodity="packaging" tabColor={tabColor} />
      <TabFooter source="Source: Yahoo Finance (PKG, IP) · Equity proxies for corrugated and paper pricing pressure · USD" fetchedAt={fetchedAt} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [supplierPrices, setSupplierPrice] = useSupplierPrices();
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

        {/* Tab Bar */}
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
        {activeTab === 'dashboard' && (
          <DashboardTab supplierPrices={supplierPrices} onTabSwitch={setActiveTab} />
        )}

        {activeTab === 'oil' && (
          <OilTab tabColor={tab.color} supplierPrices={supplierPrices} onSetPrice={setSupplierPrice} />
        )}

        {activeTab === 'hrc' && (
          <HRCTab tabColor={tab.color} supplierPrices={supplierPrices} onSetPrice={setSupplierPrice} />
        )}

        {activeTab === 'aluminum' && (
          <SingleTab commodity="aluminum" tabColor={tab.color} unit="USD/lb"
            footerSource="Source: Yahoo Finance (ALI=F) · CME Micro Aluminum futures · USD/lb (÷2204.62 from USD/MT)"
            yDecimals={4}
            supplierPrices={supplierPrices} onSetPrice={setSupplierPrice}
            supplierLabel="Aluminum (USD/lb)" />
        )}

        {activeTab === 'ss' && (
          <SingleTab commodity="ss" tabColor={tab.color} unit="USD"
            footerSource="Source: Yahoo Finance (VALE) · Vale S.A. NYSE · world's largest nickel producer"
            proxyNote="Stainless steel has no direct futures market. Vale S.A. (VALE) — the world's largest nickel producer — is used as the leading indicator for SS alloy surcharge pressure. Nickel drives ~30–40% of 304/316 SS mill cost; when VALE rises, expect surcharge increases from your SS suppliers. Base carbon steel cost is tracked separately in the HRC Steel tab." />
        )}

        {activeTab === 'plastics' && (
          <PlasticsTab tabColor={tab.color} supplierPrices={supplierPrices} onSetPrice={setSupplierPrice} />
        )}

        {activeTab === 'natgas' && (
          <SingleTab commodity="natgas" tabColor={tab.color} unit="USD/MMBtu"
            footerSource="Source: Yahoo Finance (NG=F) · Henry Hub Natural Gas · Front-month continuous futures · USD/MMBtu"
            yDecimals={3}
            supplierPrices={supplierPrices} onSetPrice={setSupplierPrice}
            supplierLabel="Nat Gas (USD/MMBtu)" />
        )}

        {activeTab === 'packaging' && (
          <PackagingTab tabColor={tab.color} />
        )}

      </div>
    </div>
  );
}
