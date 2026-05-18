/**
 * Extract inline <svg>...</svg> blocks from theme/sections/*.liquid into
 * section-svg-exports/*.svg + manifest.json (run from repo root):
 *
 *   node scripts/extract-section-svgs.mjs
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..");
const SECTIONS_DIR = path.join(REPO_ROOT, "theme", "sections");
const OUT_DIR = path.join(REPO_ROOT, "section-svg-exports");

/** Classes used only for layout/size — prefer a more specific sibling class for filenames */
const GENERIC_CLASS_SKIP = new Set([
  "ps-icon-image",
  "ps-u-visually-hidden",
  "ps-mobile-pages-arrow",
  "sr-only",
  "visually-hidden",
]);

function slug(s) {
  const t = String(s || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return (t || "svg").slice(0, 80);
}

function findSvgBlocks(content) {
  const blocks = [];
  let searchPos = 0;
  while (searchPos < content.length) {
    const rel = content.slice(searchPos).search(/<svg\b/i);
    if (rel < 0) break;
    const start = searchPos + rel;
    const lineStart = content.slice(0, start).split("\n").length;

    let j = start + 4;
    let quote = null;
    while (j < content.length) {
      const c = content[j];
      if (quote) {
        if (c === quote) quote = null;
        j++;
        continue;
      }
      if (c === '"' || c === "'") {
        quote = c;
        j++;
        continue;
      }
      if (c === ">") {
        j++;
        break;
      }
      j++;
    }
    const openTagEnd = j;
    if (j >= content.length) break;

    let depth = 1;
    let pos = openTagEnd;
    let endClose = -1;
    while (depth > 0 && pos < content.length) {
      const slice = content.slice(pos);
      const mOpen = /<svg\b/i.exec(slice);
      const mClose = /<\/svg>/i.exec(slice);
      const idxOpen = mOpen ? mOpen.index : Infinity;
      const idxClose = mClose ? mClose.index : Infinity;
      if (!mClose) break;
      if (idxOpen < idxClose) {
        depth++;
        pos += idxOpen + mOpen[0].length;
      } else {
        depth--;
        pos += idxClose + mClose[0].length;
        if (depth === 0) endClose = pos;
      }
    }
    if (endClose < 0) {
      searchPos = openTagEnd;
      continue;
    }

    const full = content.slice(start, endClose);
    const lineEnd = content.slice(0, endClose).split("\n").length;
    const openTag = content.slice(start, openTagEnd);
    blocks.push({ full, openTag, lineStart, lineEnd });
    searchPos = endClose;
  }
  return blocks;
}

function pickNameClass(openTag) {
  const m = openTag.match(/\bclass\s*=\s*["']([^"']*)["']/i);
  const classes = m ? m[1].trim().split(/\s+/).filter(Boolean) : [];
  const specific = [...classes].reverse().find((c) => !GENERIC_CLASS_SKIP.has(c));
  return { classes, nameClass: specific || classes[0] || "" };
}

function main() {
  if (!fs.existsSync(SECTIONS_DIR)) {
    console.error("Missing:", SECTIONS_DIR);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs
    .readdirSync(SECTIONS_DIR)
    .filter((f) => f.endsWith(".liquid"))
    .sort();

  const manifest = [];
  const usedNames = new Set();

  for (const file of files) {
    const abs = path.join(SECTIONS_DIR, file);
    const content = fs.readFileSync(abs, "utf8");
    const sectionBase = path.basename(file, ".liquid");
    const blocks = findSvgBlocks(content);

    blocks.forEach((b, idx) => {
      const { classes, nameClass } = pickNameClass(b.openTag);
      const basePart = nameClass ? slug(nameClass) : "inline-svg";
      let filename = `${slug(sectionBase)}--${basePart}-l${b.lineStart}.svg`;
      let n = 2;
      while (usedNames.has(filename)) {
        filename = `${slug(sectionBase)}--${basePart}-l${b.lineStart}-n${n}.svg`;
        n++;
      }
      usedNames.add(filename);

      const sha256 = crypto.createHash("sha256").update(b.full).digest("hex");
      const outPath = path.join(OUT_DIR, filename);
      fs.writeFileSync(outPath, b.full, "utf8");

      manifest.push({
        sourceFile: path.relative(REPO_ROOT, abs).replace(/\\/g, "/"),
        startLine: b.lineStart,
        endLine: b.lineEnd,
        outputFilename: filename,
        classes,
        nameClass: nameClass || null,
        sha256,
        bytes: Buffer.byteLength(b.full, "utf8"),
      });
    });
  }

  fs.writeFileSync(
    path.join(OUT_DIR, "manifest.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), count: manifest.length, items: manifest }, null, 2),
    "utf8"
  );

  console.log("Wrote", manifest.length, "SVG(s) to", path.relative(REPO_ROOT, OUT_DIR));
}

main();
