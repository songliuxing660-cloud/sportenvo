#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const canonicalProductNames = [
  "Panoramic Padel Court",
  "Super Panoramic Padel Court",
  "Classic Padel Court",
  "Mobile Padel Court",
  "Padel Court with Electric Tent",
  "Padel Court with Roof",
  "Anti-Hurricane Padel Court — FORCE-HX Series",
  "Modular Foundation Base"
];

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

const canonicalIdentityFiles = ["index.html", "about.html"];
const deprecatedOfficialProductLabels = ["Padel Court Modular Foundation Base"];

const htmlFiles = walkHtml(root).sort();
const htmlSet = new Set(htmlFiles);
const failures = [];
const validatedImageAssets = new Map();

function hasValidImageSignature(filePath) {
  const ext = path.posix.extname(filePath).toLowerCase();
  if (![".webp", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".avif"].includes(ext)) return true;

  const full = path.join(root, ...filePath.split("/"));
  let buf;
  try {
    buf = fs.readFileSync(full);
  } catch {
    return false;
  }
  if (!buf.length) return false;

  if (ext === ".webp") {
    return buf.length >= 12 &&
      buf.toString("ascii", 0, 4) === "RIFF" &&
      buf.toString("ascii", 8, 12) === "WEBP";
  }
  if (ext === ".jpg" || ext === ".jpeg") {
    return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (ext === ".png") {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return buf.length >= 8 && sig.every((b, i) => buf[i] === b);
  }
  if (ext === ".gif") {
    const head = buf.toString("ascii", 0, 6);
    return head === "GIF87a" || head === "GIF89a";
  }
  if (ext === ".svg") {
    const head = buf.toString("utf8", 0, Math.min(buf.length, 512)).replace(/^\uFEFF/, "").trimStart();
    return head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"));
  }
  if (ext === ".avif") {
    if (buf.length < 16) return false;
    const box = buf.toString("ascii", 4, 12);
    const brands = buf.toString("ascii", 8, Math.min(buf.length, 64));
    return box === "ftypavif" || brands.includes("avif") || brands.includes("avis");
  }
  return true;
}

const forbiddenPublicPatterns = [
  [/\bAnti Hurricane\b/g, "legacy FORCE-HX naming"],
  [/Explore FORCE-HX span aria-hidden/g, "malformed FORCE-HX link markup"],
  [/MOQ:\s*1 set/gi, "unverified fixed MOQ"],
  [/Lead time:\s*35[–-]40 days/gi, "unverified fixed lead time"],
  [/projectQuoteForm/g, "legacy project form anchor/id"],
];

function cleanInternalRef(rawRef) {
  if (!rawRef) return null;
  const ref = rawRef.trim();
  if (
    ref.startsWith("#") ||
    /^(?:mailto:|tel:|javascript:|data:|blob:)/i.test(ref) ||
    /^https?:\/\//i.test(ref) ||
    ref.startsWith("//")
  ) return null;
  const clean = ref.split("#")[0].split("?")[0].trim();
  return clean || null;
}

function resolveInternalAsset(fromFile, rawRef) {
  const clean = cleanInternalRef(rawRef);
  if (!clean || clean === "/" || clean.endsWith("/")) return null;

  const ext = path.posix.extname(clean).toLowerCase();
  if (!ext || ext === ".html" || ext === ".htm") return null;

  const target = clean.startsWith("/")
    ? path.posix.normalize(clean.slice(1))
    : path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), clean));

  if (!target || target.startsWith("../")) return null;
  return target;
}

function resolveInternalHtml(fromFile, rawHref) {
  const clean = cleanInternalRef(rawHref);
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

for (const identityFile of canonicalIdentityFiles) {
  const identity = fs.readFileSync(path.join(root, identityFile), "utf8");
  for (const productName of canonicalProductNames) {
    if (!identity.includes(productName)) failures.push([identityFile, `canonical product name missing -> ${productName}`]);
  }
  for (const deprecatedLabel of deprecatedOfficialProductLabels) {
    if (identity.includes(deprecatedLabel)) failures.push([identityFile, `deprecated official product naming -> ${deprecatedLabel}`]);
  }
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

  const seenAssets = new Set();
  const rawAssetRefs = [];

  for (const match of html.matchAll(/(?:src|poster)=["']([^"']+)["']/gi)) {
    rawAssetRefs.push(match[1]);
  }
  for (const match of html.matchAll(/href=["']([^"']+)["']/gi)) {
    rawAssetRefs.push(match[1]);
  }
  for (const match of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
    for (const candidate of match[1].split(",")) {
      const ref = candidate.trim().split(/\s+/)[0];
      if (ref) rawAssetRefs.push(ref);
    }
  }

  for (const rawRef of rawAssetRefs) {
    const target = resolveInternalAsset(file, rawRef);
    if (!target || seenAssets.has(target)) continue;
    seenAssets.add(target);
    const targetPath = path.join(root, ...target.split("/"));
    if (!fs.existsSync(targetPath)) {
      failures.push([file, `missing internal asset -> ${target}`]);
      continue;
    }

    const ext = path.posix.extname(target).toLowerCase();
    if ([".webp", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".avif"].includes(ext)) {
      let valid = validatedImageAssets.get(target);
      if (valid === undefined) {
        valid = hasValidImageSignature(target);
        validatedImageAssets.set(target, valid);
      }
      if (!valid) failures.push([file, `invalid image file -> ${target}`]);
    }
  }
}

if (failures.length) {
  console.error("\nSPORTENVO consistency check failed:\n");
  for (const [file, reason] of failures) console.error(`- ${file}: ${reason}`);
  console.error(`\n${failures.length} issue(s) found across ${htmlFiles.length} HTML files.\n`);
  process.exitCode = 1;
} else {
  console.log(`SPORTENVO consistency check passed for ${htmlFiles.length} HTML files, including nested pages, internal HTML links, local asset references and ${validatedImageAssets.size} referenced image file signatures.`);
}
