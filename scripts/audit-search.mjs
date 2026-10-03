import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const site = "https://sportenvo.com";
const args = process.argv.slice(2);
const reportPath = args.includes("--report") ? args[args.indexOf("--report") + 1] : null;
const failures = [];
const warnings = [];

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
    .map((match) => [match[1].toLowerCase(), match[2] ?? match[3]]));
}
const decode = (text) => (text || "").replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (entity) => {
  const named = { "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">" };
  return named[entity.toLowerCase()] || String.fromCodePoint(parseInt(entity.slice(entity[2].toLowerCase() === "x" ? 3 : 2, -1), entity[2].toLowerCase() === "x" ? 16 : 10));
});

async function walk(dir, prefix = "") {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const file = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path.join(dir, entry.name), file));
    else if (entry.name.endsWith(".html") && !/^google[\w-]+\.html$/.test(entry.name)) files.push(file);
  }
  return files.sort();
}

const pages = new Map();
const titles = new Map();
const canonicals = new Map();
for (const file of await walk(root)) {
  const html = await readFile(path.join(root, file), "utf8");
  const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => attributes(match[0]));
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => attributes(match[0]));
  const canonical = links.filter((link) => link.rel === "canonical");
  const noindex = meta.some((tag) => /^(robots|googlebot)$/i.test(tag.name || "") && /\bnoindex\b/i.test(tag.content || ""));
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const description = meta.find((tag) => tag.name === "description")?.content;
  const expected = `${site}/${file === "index.html" ? "" : file.replace(/index\.html$/, "")}`;
  const page = { file, url: expected, canonical: canonical[0]?.href, noindex, title, description, links: [], schemas: [], depth: null };
  pages.set(expected, page);
  if (!noindex) {
    if (canonical.length !== 1 || page.canonical !== expected) failures.push(`${file}: expected one self canonical (${expected})`);
    if (!title) failures.push(`${file}: missing title`);
    else if (titles.has(title)) failures.push(`${file}: duplicate title with ${titles.get(title)}`);
    else titles.set(title, file);
    if (!description) failures.push(`${file}: missing description`);
    if (canonicals.has(page.canonical)) failures.push(`${file}: duplicate canonical with ${canonicals.get(page.canonical)}`);
    else canonicals.set(page.canonical, file);
    for (const [key, value] of [["og:title", title], ["og:description", description], ["og:url", expected]]) {
      const found = meta.filter((tag) => tag.property === key);
      if (found.length !== 1 || decode(found[0]?.content) !== decode(value)) warnings.push(`${file}: missing or inconsistent ${key}`);
    }
    const image = meta.find((tag) => tag.property === "og:image")?.content;
    if (!image || !/^https:\/\//.test(image)) warnings.push(`${file}: missing absolute og:image`);
    if (!meta.some((tag) => tag.name === "twitter:card" && tag.content === "summary_large_image")) warnings.push(`${file}: missing large Twitter card`);
  }
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attributes(match[0]).href;
    if (!href) continue;
    try {
      const destination = new URL(href, expected);
      if (destination.origin !== site) continue;
      destination.search = "";
      destination.hash = "";
      if (destination.pathname === "/index.html") destination.pathname = "/";
      page.links.push(destination.href);
    } catch { failures.push(`${file}: invalid link ${href}`); }
  }
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (attributes(match[0].slice(0, match[0].indexOf(">") + 1)).type !== "application/ld+json") continue;
    try {
      const data = JSON.parse(match[1]);
      const nodes = Array.isArray(data) ? data : data["@graph"] || [data];
      page.schemas.push(...nodes.map((node) => node["@type"]).flat().filter(Boolean));
    } catch { failures.push(`${file}: invalid JSON-LD`); }
  }
  if (!noindex && page.schemas.length === 0) failures.push(`${file}: missing structured data`);
}

const xml = await readFile(path.join(root, "sitemap.xml"), "utf8");
const sitemap = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g)]
  .map((match) => ({ url: match[1], lastmod: match[2].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] }));
const sitemapUrls = new Set();
for (const entry of sitemap) {
  if (sitemapUrls.has(entry.url)) failures.push(`sitemap: duplicate ${entry.url}`);
  sitemapUrls.add(entry.url);
  const page = pages.get(entry.url);
  if (!page) failures.push(`sitemap: missing local page ${entry.url}`);
  else if (page.noindex) failures.push(`sitemap: noindex page ${entry.url}`);
  else if (page.canonical !== entry.url) failures.push(`sitemap: noncanonical URL ${entry.url}`);
  if (entry.lastmod && (!/^\d{4}-\d{2}-\d{2}$/.test(entry.lastmod) || entry.lastmod > new Date().toISOString().slice(0, 10))) failures.push(`sitemap: invalid or future lastmod ${entry.url}`);
}
for (const page of pages.values()) {
  if (!page.noindex && !sitemapUrls.has(page.url)) failures.push(`${page.file}: missing from sitemap`);
}

const queue = [{ url: `${site}/`, depth: 0 }];
while (queue.length) {
  const { url, depth } = queue.shift();
  const page = pages.get(url);
  if (!page || page.depth !== null || page.noindex) continue;
  page.depth = depth;
  for (const target of page.links) queue.push({ url: target, depth: depth + 1 });
}
for (const page of pages.values()) {
  if (page.noindex) continue;
  if (page.depth === null) failures.push(`${page.file}: unreachable from homepage`);
  else if (page.depth > 3) warnings.push(`${page.file}: ${page.depth} clicks from homepage`);
}

const report = {
  generatedAt: new Date().toISOString(),
  site,
  scope: "Local publishable HTML; this does not measure Google/Bing indexing or traffic.",
  summary: { htmlPages: pages.size, indexablePages: [...pages.values()].filter((page) => !page.noindex).length, sitemapUrls: sitemapUrls.size, failures: failures.length, warnings: warnings.length },
  failures, warnings,
  pages: [...pages.values()].map(({ links, ...page }) => ({ ...page, internalLinks: new Set(links).size }))
};
if (reportPath) await writeFile(path.resolve(reportPath), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary));
for (const failure of failures) console.error(`ERROR ${failure}`);
for (const warning of warnings) console.warn(`WARN ${warning}`);
if (failures.length || (args.includes("--strict") && warnings.length)) process.exitCode = 1;
