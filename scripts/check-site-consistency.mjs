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

const htmlFiles = fs.readdirSync(root).filter((name) => name.endsWith(".html") && name !== "404.html" && !/^google[a-z0-9_-]+\.html$/i.test(name));
const failures = [];

for (const file of htmlFiles) {
  const full = path.join(root, file);
  const html = fs.readFileSync(full, "utf8");

  if (!/<link\s+rel=["']canonical["'][^>]+href=["']https:\/\/sportenvo\.com\//i.test(html)) {
    failures.push([file, "missing canonical"]);
  }

  if (!/<meta\s+name=["']description["'][^>]+content=["'][^"']{40,}["']/i.test(html)) {
    failures.push([file, "missing/short meta description"]);
  }

  const h1Count = (html.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) failures.push([file, `expected 1 H1, found ${h1Count}`]);

  const navMatch = html.match(/<nav\s+class=["'][^"']*primary-nav[^"']*["'][\s\S]*?<\/nav>/i);
  if (!navMatch) {
    failures.push([file, "missing primary navigation"]);
  } else if (!["404.html"].includes(file)) {
    for (const href of requiredNav) {
      const re = new RegExp(`href=["']\\/?${href.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&")}["']`, "i");
      if (!re.test(navMatch[0])) failures.push([file, `navigation missing ${href}`]);
    }
  }
}

if (failures.length) {
  console.error("\nSPORTENVO consistency check failed:\n");
  for (const [file, reason] of failures) console.error(`- ${file}: ${reason}`);
  console.error(`\n${failures.length} issue(s) found across ${htmlFiles.length} HTML files.\n`);
  process.exitCode = 1;
} else {
  console.log(`SPORTENVO consistency check passed for ${htmlFiles.length} HTML files.`);
}
