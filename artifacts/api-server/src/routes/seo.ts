import { Router, type IRouter } from "express";
import { getTermHtml, getGlossaryIndexHtml } from "../seo/glossary";
import { getIndicatorHtml, getIndicatorIndexHtml } from "../seo/indicators";
import {
  generateSitemapIndex,
  generateGlossarySitemap,
  generateIndicatorsSitemap,
  generatePagesSitemap,
  generateRobotsTxt,
} from "../seo/sitemap";

const router: IRouter = Router();

const CACHE_STATIC = "public, max-age=86400";
const CACHE_INDEX = "public, max-age=3600, stale-while-revalidate=86400";
const HTML_CT = "text/html; charset=utf-8";
const XML_CT = "application/xml; charset=utf-8";
const TXT_CT = "text/plain; charset=utf-8";

router.get("/learn", (_req, res) => {
  res.setHeader("Cache-Control", CACHE_INDEX);
  res.setHeader("Content-Type", HTML_CT);
  res.send(getGlossaryIndexHtml());
});

router.get("/learn/:slug", (req, res) => {
  const html = getTermHtml(req.params.slug);
  if (!html) {
    res.status(404).setHeader("Content-Type", HTML_CT).send(get404Html("Term not found", "/learn"));
    return;
  }
  res.setHeader("Cache-Control", CACHE_STATIC);
  res.setHeader("Content-Type", HTML_CT);
  res.send(html);
});

router.get("/indicators", (_req, res) => {
  res.setHeader("Cache-Control", CACHE_INDEX);
  res.setHeader("Content-Type", HTML_CT);
  res.send(getIndicatorIndexHtml());
});

router.get("/indicators/:slug", (req, res) => {
  const html = getIndicatorHtml(req.params.slug);
  if (!html) {
    res.status(404).setHeader("Content-Type", HTML_CT).send(get404Html("Indicator not found", "/indicators"));
    return;
  }
  res.setHeader("Cache-Control", CACHE_STATIC);
  res.setHeader("Content-Type", HTML_CT);
  res.send(html);
});

router.get("/sitemap.xml", (_req, res) => {
  res.setHeader("Content-Type", XML_CT);
  res.setHeader("Cache-Control", CACHE_INDEX);
  res.send(generateSitemapIndex());
});

router.get("/sitemap-glossary.xml", (_req, res) => {
  res.setHeader("Content-Type", XML_CT);
  res.setHeader("Cache-Control", CACHE_INDEX);
  res.send(generateGlossarySitemap());
});

router.get("/sitemap-indicators.xml", (_req, res) => {
  res.setHeader("Content-Type", XML_CT);
  res.setHeader("Cache-Control", CACHE_INDEX);
  res.send(generateIndicatorsSitemap());
});

router.get("/sitemap-pages.xml", (_req, res) => {
  res.setHeader("Content-Type", XML_CT);
  res.setHeader("Cache-Control", CACHE_INDEX);
  res.send(generatePagesSitemap());
});

router.get("/robots.txt", (_req, res) => {
  res.setHeader("Content-Type", TXT_CT);
  res.setHeader("Cache-Control", CACHE_INDEX);
  res.send(generateRobotsTxt());
});

function get404Html(message: string, backUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Not Found | EntangleWealth</title>
  <meta name="robots" content="noindex" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    body { font-family: 'Inter', sans-serif; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .wrap { text-align: center; }
    h1 { font-size: 48px; font-weight: 800; margin-bottom: 12px; }
    p { color: rgba(255,255,255,0.5); margin-bottom: 24px; }
    a { color: #00D4FF; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>404</h1>
    <p>${message}</p>
    <a href="${backUrl}">Go Back</a>
  </div>
</body>
</html>`;
}

export default router;
