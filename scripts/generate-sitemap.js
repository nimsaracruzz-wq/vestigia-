import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = "https://thevestigia.com";

// 1. Static React Router Routes
const STATIC_ROUTES = [
  { url: "/", priority: "1.0", changefreq: "daily" },
  { url: "/shop", priority: "0.9", changefreq: "daily" },
  { url: "/lookbook", priority: "0.8", changefreq: "weekly" },
  { url: "/journal", priority: "0.8", changefreq: "daily" },
  { url: "/about", priority: "0.8", changefreq: "monthly" },
  { url: "/story", priority: "0.7", changefreq: "monthly" },
  { url: "/contact", priority: "0.7", changefreq: "monthly" },
  { url: "/faq", priority: "0.7", changefreq: "monthly" },
  { url: "/refund-policy", priority: "0.5", changefreq: "monthly" },
  { url: "/privacy-policy", priority: "0.5", changefreq: "monthly" },
  { url: "/terms-of-service", priority: "0.5", changefreq: "monthly" },
  { url: "/shipping-policy", priority: "0.5", changefreq: "monthly" },
];

async function generateSitemap() {
  console.log("🚀 Generating SEO-optimized sitemap.xml and robots.txt...");

  const dbPath = path.resolve(__dirname, "../backend/dev.db");
  let products = [];
  let journalArticles = [];
  let categories = [];

  // Try fetching dynamic data from Prisma SQLite DB
  try {
    const { PrismaClient } = await import("../backend/node_modules/@prisma/client/index.js");
    const { PrismaBetterSqlite3 } = await import("../backend/node_modules/@prisma/adapter-better-sqlite3/dist/index.js");
    const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
    const prisma = new PrismaClient({ adapter });

    products = await prisma.product.findMany();
    journalArticles = await prisma.journalArticle.findMany();

    const uniqueCategories = new Set(products.map((p) => p.category).filter(Boolean));
    categories = Array.from(uniqueCategories);

    await prisma.$disconnect();
    console.log(`✅ Loaded ${products.length} products, ${journalArticles.length} journal articles, and ${categories.length} categories from Prisma DB.`);
  } catch (err) {
    console.warn("⚠️ Could not fetch from SQLite DB directly, using fallback defaults:", err.message);
  }

  const today = new Date().toISOString().split("T")[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n`;
  xml += `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n\n`;

  // Add Static Routes
  STATIC_ROUTES.forEach((route) => {
    xml += `  <url>\n`;
    xml += `    <loc>${SITE_URL}${route.url}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += `  </url>\n`;
  });

  // Add Categories
  categories.forEach((cat) => {
    const catUrl = `${SITE_URL}/shop?category=${encodeURIComponent(cat)}`;
    xml += `  <url>\n`;
    xml += `    <loc>${catUrl}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  });

  // Add Products
  products.forEach((p) => {
    const prodUrl = `${SITE_URL}/product/${p.id}`;
    xml += `  <url>\n`;
    xml += `    <loc>${prodUrl}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    if (p.image) {
      const imgUrl = p.image.startsWith("http") ? p.image : `${SITE_URL}${p.image}`;
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${imgUrl}</image:loc>\n`;
      if (p.name) {
        xml += `      <image:title>${escapeXml(p.name)}</image:title>\n`;
      }
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  });

  // Add Journal Articles
  journalArticles.forEach((art) => {
    const artUrl = `${SITE_URL}/journal`;
    xml += `  <url>\n`;
    xml += `    <loc>${artUrl}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    if (art.image) {
      const imgUrl = art.image.startsWith("http") ? art.image : `${SITE_URL}${art.image}`;
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${imgUrl}</image:loc>\n`;
      if (art.title) {
        xml += `      <image:title>${escapeXml(art.title)}</image:title>\n`;
      }
      xml += `    </image:image>\n`;
    }
    xml += `  </url>\n`;
  });

  xml += `</urlset>\n`;

  // Ensure public directory exists
  const publicDir = path.resolve(__dirname, "../public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapPath = path.join(publicDir, "sitemap.xml");
  fs.writeFileSync(sitemapPath, xml, "utf8");
  console.log(`✨ Successfully generated sitemap.xml at: ${sitemapPath}`);

  // Generate robots.txt
  const robotsContent = `# VESTIGIA® Official Robots.txt
# https://thevestigia.com

User-agent: *
Allow: /
Allow: /images/
Allow: /uploads/
Disallow: /admin/
Disallow: /checkout/
Disallow: /account/
Disallow: /activate/
Disallow: /api/
Disallow: /*?*search=
Disallow: /*?*sort=

# AI Search Engine Authorization (GEO / AEO)
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Google-Extended
Allow: /

# Sitemap Location
Sitemap: ${SITE_URL}/sitemap.xml
`;

  const robotsPath = path.join(publicDir, "robots.txt");
  fs.writeFileSync(robotsPath, robotsContent, "utf8");
  console.log(`✨ Successfully generated robots.txt at: ${robotsPath}`);
}

function escapeXml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

generateSitemap().catch(console.error);
