const NEWS_FEEDS = {
  oil: [
    { label: 'WTI', url: 'https://news.google.com/rss/search?q=WTI+crude+oil+price&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Brent', url: 'https://news.google.com/rss/search?q=Brent+crude+oil+price&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Energy Market', url: 'https://news.google.com/rss/search?q=crude+oil+market+OPEC+price&hl=en-US&gl=US&ceid=US:en' },
  ],
  aluminum: [
    { label: 'Aluminum', url: 'https://news.google.com/rss/search?q=aluminum+price+market&hl=en-US&gl=US&ceid=US:en' },
    { label: 'LME Metals', url: 'https://news.google.com/rss/search?q=LME+aluminum+aluminium+price&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Tariffs & Trade', url: 'https://news.google.com/rss/search?q=aluminum+tariff+trade+supply&hl=en-US&gl=US&ceid=US:en' },
  ],
  ss: [
    { label: 'Stainless Steel', url: 'https://news.google.com/rss/search?q=stainless+steel+price+market&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Nickel', url: 'https://news.google.com/rss/search?q=nickel+price+LME+market&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Alloy Surcharges', url: 'https://news.google.com/rss/search?q=stainless+steel+surcharge+alloy&hl=en-US&gl=US&ceid=US:en' },
  ],
  hrc: [
    { label: 'HRC Steel', url: 'https://news.google.com/rss/search?q=HRC+hot+rolled+coil+steel+price&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Steel Market', url: 'https://news.google.com/rss/search?q=steel+market+futures+price&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Tariffs & Trade', url: 'https://news.google.com/rss/search?q=steel+tariff+trade+section+232&hl=en-US&gl=US&ceid=US:en' },
  ],
  plastics: [
    { label: 'HDPE', url: 'https://news.google.com/rss/search?q=HDPE+resin+price&hl=en-US&gl=US&ceid=US:en' },
    { label: 'LLDPE', url: 'https://news.google.com/rss/search?q=LLDPE+resin+price&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Plastics Market', url: 'https://news.google.com/rss/search?q=plastic+resin+price+market&hl=en-US&gl=US&ceid=US:en' },
  ],
};

function parseItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(block) ||
                   /<title>(.*?)<\/title>/.exec(block) || [])[1] || '';
    const link  = (/<link>(.*?)<\/link>/.exec(block) ||
                   /<link rel="alternate" href="(.*?)"/.exec(block) || [])[1] || '';
    const pubDate = (/<pubDate>(.*?)<\/pubDate>/.exec(block) || [])[1] || '';
    const source = (/<source[^>]*>(.*?)<\/source>/.exec(block) || [])[1] || '';
    const cleanTitle = title.replace(/ - [^-]+$/, '').trim();
    if (cleanTitle && link) {
      items.push({
        title: cleanTitle,
        link,
        source: source.trim(),
        pubDate: pubDate ? new Date(pubDate).toISOString() : null,
      });
    }
  }
  return items;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { commodity } = req.query;
  const feeds = NEWS_FEEDS[commodity];
  if (!feeds) return res.status(400).json({ error: `Unknown commodity: ${commodity}` });

  try {
    const results = await Promise.allSettled(
      feeds.map((f) =>
        fetch(f.url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
          .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
          .then((xml) => ({ label: f.label, items: parseItems(xml) }))
      )
    );

    const seen = new Set();
    const all = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        for (const item of r.value.items) {
          if (!seen.has(item.link)) {
            seen.add(item.link);
            all.push({ ...item, feed: r.value.label });
          }
        }
      }
    }
    all.sort((a, b) => {
      if (!a.pubDate) return 1;
      if (!b.pubDate) return -1;
      return b.pubDate.localeCompare(a.pubDate);
    });

    return res.status(200).json({ news: all.slice(0, 20), fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('commodity-news error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
