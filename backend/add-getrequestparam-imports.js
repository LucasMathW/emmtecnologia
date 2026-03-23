const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(process.argv[2] || "src");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (["node_modules", "dist", ".git"].includes(entry.name)) continue;

    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function getImportPath(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/src/");
  if (idx === -1) return "../helpers/getRequestParam";

  const relativeInsideSrc = normalized.slice(idx + 5); // after /src/
  const depth = relativeInsideSrc.split("/").length - 1;

  return "../".repeat(depth) + "helpers/getRequestParam";
}

function alreadyHasImport(content) {
  return /import\s+\{\s*getRequestParam\s*\}\s+from\s+["'][^"']+getRequestParam["']\s*;/.test(
    content
  );
}

function usesGetRequestParam(content) {
  return /\bgetRequestParam\s*\(/.test(content);
}

function insertImport(content, importLine) {
  const lines = content.split("\n");

  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s+/.test(lines[i])) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, importLine);
    return lines.join("\n");
  }

  return `${importLine}\n${content}`;
}

let updated = 0;

for (const file of walk(ROOT_DIR)) {
  const original = fs.readFileSync(file, "utf8");

  if (!usesGetRequestParam(original)) continue;
  if (alreadyHasImport(original)) continue;

  const importPath = getImportPath(file);
  const importLine = `import { getRequestParam } from "${importPath}";`;

  const updatedContent = insertImport(original, importLine);
  fs.writeFileSync(file, updatedContent, "utf8");

  console.log(`Import added: ${file}`);
  updated++;
}

console.log(`\nDone. Files updated: ${updated}`);
