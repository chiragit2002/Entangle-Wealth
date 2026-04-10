import { SITE_URL } from "./ssrShared";
import { TERMS } from "./glossary";
import { INDICATORS } from "./indicators";
import { STRATEGIES } from "./strategies";
import { PATTERNS } from "./patterns";
import { SECTORS } from "./sectors";
import { COMPARISONS } from "./comparisons";

export function generateSitemapIndex(): string {
  const today = new Date().toISOString().slice(0, 10);
  const sitemaps = [
    "sitemap-glossary.xml",
    "sitemap-indicators.xml",
    "sitemap-strategies.xml",
    "sitemap-patterns.xml",
    "sitemap-sectors.xml",
    "sitemap-comparisons.xml",
    "sitemap-pages.xml",
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(s => `  <sitemap>
    <loc>${SITE_URL}/${s}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`).join("\n")}
</sitemapindex>`;
}

function urlset(urls: { loc: string; freq: string; priority: string }[]): string {
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
}

export function generateGlossarySitemap(): string {
  return urlset([
    { loc: `${SITE_URL}/learn`, freq: "weekly", priority: "0.8" },
    ...TERMS.map(t => ({ loc: `${SITE_URL}/learn/${t.slug}`, freq: "monthly", priority: "0.6" })),
  ]);
}

export function generateIndicatorsSitemap(): string {
  return urlset([
    { loc: `${SITE_URL}/indicators`, freq: "weekly", priority: "0.8" },
    ...INDICATORS.map(i => ({ loc: `${SITE_URL}/indicators/${i.slug}`, freq: "monthly", priority: "0.7" })),
  ]);
}

export function generateStrategiesSitemap(): string {
  return urlset([
    { loc: `${SITE_URL}/strategies`, freq: "weekly", priority: "0.8" },
    ...STRATEGIES.map(s => ({ loc: `${SITE_URL}/strategies/${s.slug}`, freq: "monthly", priority: "0.7" })),
  ]);
}

export function generatePatternsSitemap(): string {
  return urlset([
    { loc: `${SITE_URL}/patterns`, freq: "weekly", priority: "0.8" },
    ...PATTERNS.map(p => ({ loc: `${SITE_URL}/patterns/${p.slug}`, freq: "monthly", priority: "0.7" })),
  ]);
}

export function generateSectorsSitemap(): string {
  return urlset([
    { loc: `${SITE_URL}/sectors`, freq: "weekly", priority: "0.8" },
    ...SECTORS.map(s => ({ loc: `${SITE_URL}/sectors/${s.slug}`, freq: "monthly", priority: "0.7" })),
  ]);
}

export function generateComparisonsSitemap(): string {
  return urlset([
    { loc: `${SITE_URL}/compare`, freq: "weekly", priority: "0.8" },
    ...COMPARISONS.map(c => ({ loc: `${SITE_URL}/compare/${c.slug}`, freq: "monthly", priority: "0.7" })),
  ]);
}

export function generatePagesSitemap(): string {
  const pages = [
    { path: "/", priority: "1.0", freq: "daily" },
    { path: "/dashboard", priority: "0.7", freq: "daily" },
    { path: "/technical", priority: "0.8", freq: "daily" },
    { path: "/stocks", priority: "0.7", freq: "daily" },
    { path: "/research", priority: "0.7", freq: "daily" },
    { path: "/screener", priority: "0.7", freq: "daily" },
    { path: "/market-overview", priority: "0.7", freq: "daily" },
    { path: "/terminal", priority: "0.6", freq: "weekly" },
    { path: "/time-machine", priority: "0.6", freq: "weekly" },
    { path: "/sector-flow", priority: "0.6", freq: "weekly" },
    { path: "/volatility", priority: "0.6", freq: "weekly" },
    { path: "/pricing", priority: "0.5", freq: "monthly" },
    { path: "/about", priority: "0.4", freq: "monthly" },
    { path: "/terms", priority: "0.3", freq: "yearly" },
    { path: "/privacy", priority: "0.3", freq: "yearly" },
  ];
  return urlset(pages.map(p => ({ loc: `${SITE_URL}${p.path}`, freq: p.freq, priority: p.priority })));
}

export function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml

User-agent: Googlebot
Allow: /learn/
Allow: /indicators/
Allow: /strategies/
Allow: /patterns/
Allow: /sectors/
Allow: /compare/
Disallow: /api/
Disallow: /sign-in
Disallow: /sign-up
Disallow: /profile

User-agent: *
Disallow: /api/
Disallow: /sign-in
Disallow: /sign-up
Disallow: /profile
`;
}
