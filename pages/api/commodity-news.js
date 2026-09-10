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
    { label: 'PP', url: 'https://news.google.com/rss/search?q=polypropylene+PP+resin+price&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Propylene', url: 'https://news.google.com/rss/search?q=%22polymer+grade+propylene%22&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Plastics Market', url: 'https://news.google.com/rss/search?q=plastic+resin+price+market&hl=en-US&gl=US&ceid=US:en' },
  ],
  natgas: [
    { label: 'Natural Gas', url: 'https://news.google.com/rss/search?q=natural+gas+price+Henry+Hub&hl=en-US&gl=US&ceid=US:en' },
    { label: 'LNG Market', url: 'https://news.google.com/rss/search?q=LNG+natural+gas+market&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Energy Supply', url: 'https://news.google.com/rss/search?q=natural+gas+supply+demand+EIA&hl=en-US&gl=US&ceid=US:en' },
  ],
  packaging: [
    { label: 'Corrugated', url: 'https://news.google.com/rss/search?q=corrugated+box+packaging+price&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Containerboard', url: 'https://news.google.com/rss/search?q=containerboard+linerboard+price+market&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Paper & Pulp', url: 'https://news.google.com/rss/search?q=paper+pulp+packaging+price+market&hl=en-US&gl=US&ceid=US:en' },
  ],
  diesel: [
    { label: 'Diesel', url: 'https://news.google.com/rss/search?q=diesel+fuel+price+ULSD&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Freight', url: 'https://news.google.com/rss/search?q=trucking+freight+rates+fuel+surcharge&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Distillate Supply', url: 'https://news.google.com/rss/search?q=distillate+inventories+refining+crack+spread&hl=en-US&gl=US&ceid=US:en' },
  ],
  lumber: [
    { label: 'Lumber', url: 'https://news.google.com/rss/search?q=lumber+prices+futures&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Softwood Duties', url: 'https://news.google.com/rss/search?q=softwood+lumber+tariff+duties+Canada&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Housing Demand', url: 'https://news.google.com/rss/search?q=housing+starts+homebuilder+lumber+demand&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Sawmills', url: 'https://news.google.com/rss/search?q=sawmill+curtailment+lumber+supply&hl=en-US&gl=US&ceid=US:en' },
  ],
  coatings: [
    { label: 'Powder Coating', url: 'https://news.google.com/rss/search?q=powder+coating+price+raw+material&hl=en-US&gl=US&ceid=US:en' },
    { label: 'TiO2', url: 'https://news.google.com/rss/search?q=titanium+dioxide+TiO2+price+market&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Resins', url: 'https://news.google.com/rss/search?q=epoxy+polyester+resin+price+coatings&hl=en-US&gl=US&ceid=US:en' },
    { label: 'Coatings Market', url: 'https://news.google.com/rss/search?q=industrial+coatings+paint+price+increase&hl=en-US&gl=US&ceid=US:en' },
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

    return res.status(200).json({ news: all.slice(0, 30), fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('commodity-news error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
