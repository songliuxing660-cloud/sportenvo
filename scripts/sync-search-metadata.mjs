import { readFile, writeFile, readdir, access } from "node:fs/promises";
import path from "node:path";
import { contentFingerprint, withoutFingerprint } from "./content-fingerprint.mjs";

const site = "https://sportenvo.com";
const write = process.argv.includes("--write");
const modified = [];
const decode = (text) => text.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (entity) => {
  const named = { "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">" };
  if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
  return String.fromCodePoint(parseInt(entity.slice(entity[2].toLowerCase() === "x" ? 3 : 2, -1), entity[2].toLowerCase() === "x" ? 16 : 10));
});
const escape = (text) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((match) => [match[1].toLowerCase(), decode(match[2] ?? match[3])]));

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

for (const file of await walk(process.cwd())) {
  const original = await readFile(file, "utf8");
  const lineEnding = original.includes("\r\n") ? "\r\n" : "\n";
  let html = withoutFingerprint(original);
  if (file === "insights.html") {
    html = html.replace("<h1>Clear decisions.<br>Better project briefs.</h1>", "<h1>Padel court guides.<br>Better project decisions.</h1>");
    const guideLinks = new Map();
    for (const match of html.matchAll(/<a\b[^>]*class="[^"]*ed-guide[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)) {
      const opening = match[0].slice(0, match[0].indexOf(">") + 1);
      const href = attrs(opening).href;
      const name = decode(match[1].match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() || "");
      if (!href || !name || /^(?:https?:|#)/.test(href)) continue;
      if (!/(?:guide|cost|dimensions|vs-|profitability|business-plan|site-selection|how-many|how-to-|specifications|rfq|without-roof|indoor-padel|convert-tennis)/.test(href)) continue;
      guideLinks.set(new URL(href, `${site}/insights.html`).href, name);
    }
    html = html.replace(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi, (tag, json) => {
      const data = JSON.parse(json);
      if (data["@type"] !== "CollectionPage" || !data.mainEntity) return tag;
      data.mainEntity.itemListElement = [...guideLinks].map(([url, name], index) => ({ "@type": "ListItem", position: index + 1, name, url }));
      data.mainEntity.numberOfItems = guideLinks.size;
      return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
    });
  }
  const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => attrs(match[0]));
  const noindex = meta.some((tag) => tag.name === "robots" && /\bnoindex\b/i.test(tag.content || ""));
  if (!noindex) {
    const title = decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "");
    const description = meta.find((tag) => tag.name === "description")?.content;
    const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => attrs(match[0])).find((tag) => tag.rel === "canonical")?.href;
    if (!title || !description || !canonical) throw new Error(`${file}: missing source metadata`);
    let image = meta.find((tag) => tag.property === "og:image")?.content;
    if (!image) {
      const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || "";
      const src = [...main.matchAll(/<img\b[^>]*>/gi)].map((match) => attrs(match[0]).src).find(Boolean);
      image = new URL(src || "/assets/images/home-hero.webp", canonical).href;
    } else image = new URL(image, canonical).href;
    const imageUrl = new URL(image);
    if (imageUrl.origin === site) await access(path.join(process.cwd(), decodeURIComponent(imageUrl.pathname).slice(1)));
    const values = {
      "og:type": /(?:guide|cost|dimensions|^project-|vs-|profitability|business-plan|site-selection|how-many|how-to-|specifications)/.test(file) ? "article" : "website",
      "og:title": title,
      "og:description": description,
      "og:url": canonical,
      "og:image": image,
      "twitter:card": "summary_large_image",
      "twitter:title": title,
      "twitter:description": description,
      "twitter:image": image
    };
    for (const [key, value] of Object.entries(values)) {
      const attribute = key.startsWith("og:") ? "property" : "name";
      const replacement = `<meta ${attribute}="${key}" content="${escape(value)}">`;
      let seen = false;
      html = html.replace(/<meta\b[^>]*>/gi, (tag) => {
        if (attrs(tag)[attribute] !== key) return tag;
        if (seen) return "";
        seen = true;
        return replacement;
      });
      if (!seen) html = html.replace(/<\/head>/i, `${replacement}\n</head>`);
    }
  }
  // Both legacy and current layouts must capture the campaign before their CTA handlers run.
  if (/src=["'][^"']*assets\/site(?:-v2)?\.js/.test(html) && !html.includes("/assets/lead-attribution.js")) {
    html = html.replace(/<script\b[^>]*src=["'][^"']*assets\/site(?:-v2)?\.js[^"']*["'][^>]*>/i, (tag) => `<script src="/assets/lead-attribution.js?v=20261003"></script>\n${tag}`);
  }
  html = html.replace(/(assets\/lead-attribution\.js)\?[^"'\s>]+/g, "$1?v=20261009-traffic1");
  html = html.replace(/(assets\/inquiry-context\.js)\?[^"'\s>]+/g, "$1?v=20261009-inquiry3");
  html = html.replace(/(assets\/site(?:-v2)?\.js)\?[^"'\s>]+/g, "$1?v=20261009-procurement1");
  html = html.replace(/(assets\/sportenvo-conversion-v7\.js)\?[^"'\s>]+/g, "$1?v=20261007-confirmed1");
  html = html.replace(/<\/head>/i, `<meta name="sportenvo-content-sha256" content="${contentFingerprint(html)}">${lineEnding}</head>`);
  if (html === original) continue;
  modified.push(file);
  if (write) await writeFile(file, html);
}
console.log(`${write ? "Updated" : "Would update"} ${modified.length} pages.`);
console.log(modified.join("\n"));
