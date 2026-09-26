#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredNav = [
  "panoramic.html",
  "super-panoramic.html",
  "classic-padel-court.html",
  "mobile.html",
  "electric-tent-padel-court.html",
  "roof.html",
  "force-hx.html",
  "modular-foundation.html",
  "solutions.html",
  "projects.html",
  "insights.html",
  "about.html"
];

function walkHtml(dir, base = "") {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    const rel = path.posix.join(base, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(full, rel));
    else if (
      entry.isFile() &&
      entry.name.endsWith(".html") &&
      entry.name !== "404.html" &&
      !/^google[a-z0-9_-]+\.html$/i.test(entry.name)
    ) out.push(rel);
  }
  return out;
}

const htmlFiles = walkHtml(root).sort();
const htmlSet = new Set(htmlFiles);
const failures = [];

const forbiddenPublicPatterns = [
  [/\bAnti Hurricane\b/g, "legacy FORCE-HX naming"],
  [/Explore FORCE-HX span aria-hidden/g, "malformed FORCE-HX link markup"],
  [/MOQ:\s*1 set/gi, "unverified fixed MOQ"],
  [/Lead time:\s*35[–-]40 days/gi, "unverified fixed lead time"],
  [/projectQuoteForm/g, "legacy project form anchor/id"],
  [/10\+ Years Export Experience/gi, "unverified export-experience metric"],
  [/10,000 m²/gi, "unverified factory-area metric"],
  [/50\+ Export Markets/gi, "unverified export-market metric"],
  [/100\+ Factory Employees/gi, "unverified employee metric"],
  [/5,000\+ Cooperative Clients/gi, "unverified cooperative-client metric"]
];

function resolveInternalHtml(fromFile, rawHref) {
  if (!rawHref) return null;
  const href = rawHref.trim();
  if (
    href.startsWith("#") ||
    /^(?:mailto:|tel:|javascript:|data:)/i.test(href) ||
    /^https?:\/\//i.test(href) ||
    href.startsWith("//")
  ) return null;

  const clean = href.split("#")[0].split("?")[0];
  if (!clean) return null;

  if (clean === "/") return "index.html";
  if (clean.endsWith("/")) {
    const base = clean.startsWith("/")
      ? clean.slice(1)
      : path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), clean));
    return path.posix.join(base, "index.html");
  }
  if (!clean.toLowerCase().endsWith(".html")) return null;

  return clean.startsWith("/")
    ? path.posix.normalize(clean.slice(1))
    : path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), clean));
}

for (const file of htmlFiles) {
  const full = path.join(root, ...file.split("/"));
  const html = fs.readFileSync(full, "utf8");
  const noindex = /<meta\s+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);

  if (!noindex && !/<link\s+rel=["']canonical["'][^>]+href=["']https:\/\/sportenvo\.com\//i.test(html)) {
    failures.push([file, "missing canonical"]);
  }

  const metaTag = html.match(/<meta\s+name=["']description["'][^>]*>/i)?.[0] || "";
  const metaContent = (
    metaTag.match(/content="([^"]+)"/i)?.[1] ||
    metaTag.match(/content='([^']+)'/i)?.[1] ||
    ""
  ).trim();
  if (metaContent.length < 40) failures.push([file, "missing/short meta description"]);

  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) failures.push([file, `expected 1 H1, found ${h1Count}`]);

  for (const [pattern, reason] of forbiddenPublicPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(html)) failures.push([file, reason]);
  }

  const navMatch = html.match(/<nav\s+class=["'][^"']*primary-nav[^"']*["'][\s\S]*?<\/nav>/i);
  if (!navMatch) {
    failures.push([file, "missing primary navigation"]);
  } else {
    for (const href of requiredNav) {
      const re = new RegExp(`href=["']\\/?${href.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&")}["']`, "i");
      if (!re.test(navMatch[0])) failures.push([file, `navigation missing ${href}`]);
    }
  }

  const seenTargets = new Set();
  for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
    const target = resolveInternalHtml(file, match[1]);
    if (!target || seenTargets.has(target)) continue;
    seenTargets.add(target);
    if (!htmlSet.has(target) && !fs.existsSync(path.join(root, ...target.split("/")))) {
      failures.push([file, `broken internal link -> ${target}`]);
    }
  }
}

if (failures.length) {
  console.error("\nSPORTENVO consistency check failed:\n");
  for (const [file, reason] of failures) console.error(`- ${file}: ${reason}`);
  console.error(`\n${failures.length} issue(s) found across ${htmlFiles.length} HTML files.\n`);
  process.exitCode = 1;
} else {
  console.log(`SPORTENVO consistency check passed for ${htmlFiles.length} HTML files, including nested pages and internal HTML links.`);
}
