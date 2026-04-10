import { SITE_URL } from "./ssrShared";
import { TERMS } from "./glossary";
import { INDICATORS } from "./indicators";

export function generateSitemapIndex(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${SITE_URL}/sitemap-glossary.xml</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-indicators.xml</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${SITE_URL}/sitemap-pages.xml</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
  </sitemap>
</sitemapindex>`;
}

export function generateGlossarySitemap(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/learn</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
${TERMS.map(t => `  <url>
    <loc>${SITE_URL}/learn/${t.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join("\n")}
</urlset>`;
}

export function generateIndicatorsSitemap(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/indicators</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
${INDICATORS.map(i => `  <url>
    <loc>${SITE_URL}/indicators/${i.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join("\n")}
</urlset>`;
}

export function generatePagesSitemap(): string {
  const today = new Date().toISOString().slice(0, 10);
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

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${SITE_URL}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("\n")}
</urlset>`;
}

export function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml

User-agent: Googlebot
Allow: /learn/
Allow: /indicators/
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
