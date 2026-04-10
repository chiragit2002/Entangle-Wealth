const SITE_URL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : "https://entanglewealth.com";

const FRONTEND_BASE = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}`
  : "https://entanglewealth.com";

export { SITE_URL, FRONTEND_BASE };

export interface SsrShellOpts {
  title: string;
  description: string;
  canonical: string;
  schemaJson?: string;
  body: string;
  ogImage?: string;
  breadcrumbs?: { name: string; url: string }[];
}

function headerHtml(): string {
  return `
  <header style="position:sticky;top:0;z-index:50;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;background:rgba(0,0,0,0.85);backdrop-filter:blur(20px);border-bottom:1px solid rgba(255,255,255,0.06);">
    <a href="${FRONTEND_BASE}/" style="display:flex;align-items:center;gap:10px;text-decoration:none;">
      <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#00D4FF,#0099cc);display:flex;align-items:center;justify-content:center;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
      </div>
      <span style="font-size:18px;font-weight:700;color:#fff;">Entangle<span style="color:#00D4FF;">Wealth</span></span>
    </a>
    <nav style="display:flex;gap:20px;align-items:center;">
      <a href="${FRONTEND_BASE}/dashboard" style="color:rgba(255,255,255,0.6);text-decoration:none;font-size:13px;font-weight:500;">Dashboard</a>
      <a href="${FRONTEND_BASE}/technical" style="color:rgba(255,255,255,0.6);text-decoration:none;font-size:13px;font-weight:500;">Analysis</a>
      <a href="${FRONTEND_BASE}/research" style="color:rgba(255,255,255,0.6);text-decoration:none;font-size:13px;font-weight:500;">Research</a>
      <a href="/learn" style="color:#00D4FF;text-decoration:none;font-size:13px;font-weight:600;">Learn</a>
      <a href="/indicators" style="color:#00D4FF;text-decoration:none;font-size:13px;font-weight:600;">Indicators</a>
      <a href="/strategies" style="color:#00D4FF;text-decoration:none;font-size:13px;font-weight:600;">Strategies</a>
      <a href="/patterns" style="color:#00D4FF;text-decoration:none;font-size:13px;font-weight:600;">Patterns</a>
    </nav>
  </header>`;
}

function footerHtml(): string {
  return `
  <footer style="border-top:1px solid rgba(255,255,255,0.1);background:#000;padding:48px 24px 24px;">
    <div style="max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;gap:40px;justify-content:space-between;">
      <div style="max-width:320px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          <span style="font-size:18px;font-weight:700;color:#fff;">Entangle<span style="color:#00D4FF;">Wealth</span></span>
        </div>
        <p style="color:rgba(255,255,255,0.4);font-size:13px;line-height:1.6;">Trade Smarter. Live Better. Feed Your Family. Professional-grade alerts and analysis for the everyday investor.</p>
      </div>
      <div>
        <h4 style="color:#fff;font-size:13px;font-weight:600;margin-bottom:12px;">Platform</h4>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <a href="${FRONTEND_BASE}/dashboard" style="color:rgba(255,255,255,0.4);text-decoration:none;font-size:13px;">Dashboard</a>
          <a href="${FRONTEND_BASE}/stocks" style="color:rgba(255,255,255,0.4);text-decoration:none;font-size:13px;">Stock Explorer</a>
          <a href="${FRONTEND_BASE}/technical" style="color:rgba(255,255,255,0.4);text-decoration:none;font-size:13px;">Technical Analysis</a>
          <a href="${FRONTEND_BASE}/terminal" style="color:rgba(255,255,255,0.4);text-decoration:none;font-size:13px;">Terminal</a>
        </div>
      </div>
      <div>
        <h4 style="color:#fff;font-size:13px;font-weight:600;margin-bottom:12px;">Learn</h4>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <a href="/learn" style="color:rgba(255,255,255,0.4);text-decoration:none;font-size:13px;">Financial Glossary</a>
          <a href="/indicators" style="color:rgba(255,255,255,0.4);text-decoration:none;font-size:13px;">Technical Indicators</a>
          <a href="/strategies" style="color:rgba(255,255,255,0.4);text-decoration:none;font-size:13px;">Trading Strategies</a>
          <a href="/patterns" style="color:rgba(255,255,255,0.4);text-decoration:none;font-size:13px;">Chart Patterns</a>
          <a href="/sectors" style="color:rgba(255,255,255,0.4);text-decoration:none;font-size:13px;">Sector Analysis</a>
          <a href="/compare" style="color:rgba(255,255,255,0.4);text-decoration:none;font-size:13px;">Stock Comparisons</a>
        </div>
      </div>
      <div>
        <h4 style="color:#fff;font-size:13px;font-weight:600;margin-bottom:12px;">Legal</h4>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <a href="${FRONTEND_BASE}/terms" style="color:rgba(255,255,255,0.4);text-decoration:none;font-size:13px;">Terms of Use</a>
          <a href="${FRONTEND_BASE}/privacy" style="color:rgba(255,255,255,0.4);text-decoration:none;font-size:13px;">Privacy Policy</a>
        </div>
      </div>
    </div>
    <div style="max-width:1200px;margin:32px auto 0;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);">
      <p style="color:rgba(255,255,255,0.2);font-size:11px;line-height:1.6;text-align:justify;">EntangleWealth is not a registered investment advisor, broker-dealer, or financial planner. The information provided is for educational purposes only. Past performance does not guarantee future results. Trading stocks and options involves substantial risk of loss.</p>
      <p style="color:rgba(255,255,255,0.15);font-size:11px;margin-top:12px;text-align:center;">&copy; ${new Date().getFullYear()} EntangleWealth LLC. All rights reserved.</p>
    </div>
  </footer>`;
}

function breadcrumbHtml(crumbs: { name: string; url: string }[]): string {
  if (!crumbs.length) return "";
  return `
  <nav aria-label="Breadcrumb" style="max-width:1200px;margin:0 auto;padding:16px 24px 0;">
    <ol style="list-style:none;display:flex;gap:8px;align-items:center;padding:0;margin:0;" itemscope itemtype="https://schema.org/BreadcrumbList">
      ${crumbs.map((c, i) => `
        <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem" style="display:flex;align-items:center;gap:8px;">
          ${i > 0 ? '<span style="color:rgba(255,255,255,0.2);font-size:12px;">/</span>' : ""}
          <a itemprop="item" href="${c.url}" style="color:${i === crumbs.length - 1 ? "#00D4FF" : "rgba(255,255,255,0.4)"};text-decoration:none;font-size:12px;font-family:'Inter',sans-serif;">
            <span itemprop="name">${c.name}</span>
          </a>
          <meta itemprop="position" content="${i + 1}" />
        </li>
      `).join("")}
    </ol>
  </nav>`;
}

export function ssrHtmlShell(opts: SsrShellOpts): string {
  const ogImg = opts.ogImage || `${SITE_URL}/og-default.png`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(opts.title)}</title>
  <meta name="description" content="${escHtml(opts.description)}" />
  <link rel="canonical" href="${opts.canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escHtml(opts.title)}" />
  <meta property="og:description" content="${escHtml(opts.description)}" />
  <meta property="og:url" content="${opts.canonical}" />
  <meta property="og:image" content="${ogImg}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escHtml(opts.title)}" />
  <meta name="twitter:description" content="${escHtml(opts.description)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
  ${opts.schemaJson ? `<script type="application/ld+json">${opts.schemaJson}</script>` : ""}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: #000; color: #fff; -webkit-font-smoothing: antialiased; }
    a { color: #00D4FF; }
    a:hover { opacity: 0.85; }
    .glass-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; }
    .glass-card:hover { border-color: rgba(0,212,255,0.15); }
    .tag { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace; }
    .tag-cyan { background: rgba(0,212,255,0.1); color: #00D4FF; }
    .tag-gold { background: rgba(255,215,0,0.1); color: #FFD700; }
    .tag-green { background: rgba(0,230,118,0.1); color: #00e676; }
    .tag-purple { background: rgba(168,85,247,0.1); color: #a855f7; }
    .tag-red { background: rgba(255,51,102,0.1); color: #ff3366; }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
    .hero-section { padding: 48px 24px 32px; text-align: center; }
    .hero-section h1 { font-size: clamp(28px, 4vw, 42px); font-weight: 800; line-height: 1.2; margin-bottom: 12px; }
    .hero-section p { color: rgba(255,255,255,0.5); font-size: 15px; max-width: 600px; margin: 0 auto; line-height: 1.6; }
    .grid-2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
    .grid-3 { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .cta-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, #00D4FF, #0099cc); color: #000; font-weight: 700; font-size: 14px; border-radius: 10px; text-decoration: none; transition: transform 0.2s; }
    .cta-btn:hover { transform: translateY(-1px); opacity: 1; }
    @media (max-width: 768px) {
      .grid-2, .grid-3 { grid-template-columns: 1fr; }
      header nav { display: none; }
    }
  </style>
</head>
<body>
  ${headerHtml()}
  <main>
    ${opts.breadcrumbs ? breadcrumbHtml(opts.breadcrumbs) : ""}
    ${opts.body}
  </main>
  ${footerHtml()}
</body>
</html>`;
}

export function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
