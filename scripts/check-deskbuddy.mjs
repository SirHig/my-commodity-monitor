// Usage: node scripts/check-deskbuddy.mjs <base-url>
// e.g.   node scripts/check-deskbuddy.mjs http://localhost:3123
const base = process.argv[2] || 'https://my-commodity-monitor.netlify.app';
const res = await fetch(`${base}/api/deskbuddy`);
const text = await res.text();
const fail = (msg) => { console.error(`FAIL: ${msg}`); process.exit(1); };

if (res.status !== 200) fail(`status ${res.status}`);
const bytes = Buffer.byteLength(text);
if (bytes >= 4096) fail(`payload ${bytes} bytes (limit 4096)`);
const body = JSON.parse(text);
if (body.v !== 1) fail('v !== 1');
if (Number.isNaN(Date.parse(body.asOf))) fail('asOf not ISO');
const ids = body.items.map((i) => i.id).join(',');
if (ids !== 'wti,brent,aluminum,nickel,hrc,hdpe,lldpe') fail(`ids ${ids}`);
for (const it of body.items) {
  if (!it.name || !it.unit) fail(`${it.id} missing name/unit`);
  if (it.error === true) { console.warn(`WARN: ${it.id} is error item`); continue; }
  for (const k of ['price', 'chg', 'pct']) if (typeof it[k] !== 'number') fail(`${it.id}.${k} not number`);
  if (!Array.isArray(it.spark) || it.spark.length < 2) fail(`${it.id}.spark too short`);
}
const cdn = res.headers.get('netlify-cdn-cache-control');
console.log(`OK: ${bytes} bytes, ${body.items.length} items, netlify-cdn-cache-control=${cdn}`);
