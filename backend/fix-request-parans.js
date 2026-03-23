const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(process.argv[2] || "src");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === ".git"
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (
      entry.isFile() &&
      (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx"))
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function ensureImport(content) {
  if (
    content.includes(`from "../helpers/getRequestParam"`) ||
    content.includes(`from "../../helpers/getRequestParam"`) ||
    content.includes(`from "../../../helpers/getRequestParam"`) ||
    content.includes(`from "./helpers/getRequestParam"`)
  ) {
    return content;
  }

  // tenta inferir profundidade mais comum em src/controllers e src/services
  if (content.includes('from "../')) {
    if (
      content.includes("src/controllers/") ||
      content.includes("src/services/")
    ) {
      return (
        `import { getRequestParam } from "../helpers/getRequestParam";\n` +
        content
      );
    }
  }

  return (
    `import { getRequestParam } from "../helpers/getRequestParam";\n` + content
  );
}

function inferImportPath(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  const srcIndex = normalized.lastIndexOf("/src/");
  if (srcIndex === -1) return "../helpers/getRequestParam";

  const relativeFromSrc = normalized.slice(srcIndex + 5); // after /src/
  const depth = relativeFromSrc.split("/").length - 1;
  if (depth <= 0) return "./helpers/getRequestParam";

  return "../".repeat(depth) + "helpers/getRequestParam";
}

function ensureCorrectImport(content, filePath) {
  if (content.includes("getRequestParam")) {
    return content;
  }

  const importPath = inferImportPath(filePath);
  return `import { getRequestParam } from "${importPath}";\n` + content;
}

function transform(content) {
  let changed = false;

  // const { id } = req.params;
  content = content.replace(
    /const\s*\{\s*([A-Za-z_$][\w$]*)\s*\}\s*=\s*req\.params\s*;/g,
    (_, paramName) => {
      changed = true;
      return `const ${paramName} = getRequestParam(req.params.${paramName}, "${paramName}");`;
    }
  );

  // const { id: chatId } = req.params;
  content = content.replace(
    /const\s*\{\s*([A-Za-z_$][\w$]*)\s*:\s*([A-Za-z_$][\w$]*)\s*\}\s*=\s*req\.params\s*;/g,
    (_, originalName, aliasName) => {
      changed = true;
      return `const ${aliasName} = getRequestParam(req.params.${originalName}, "${originalName}");`;
    }
  );

  // let { id } = req.params;
  content = content.replace(
    /let\s*\{\s*([A-Za-z_$][\w$]*)\s*\}\s*=\s*req\.params\s*;/g,
    (_, paramName) => {
      changed = true;
      return `let ${paramName} = getRequestParam(req.params.${paramName}, "${paramName}");`;
    }
  );

  // let { id: chatId } = req.params;
  content = content.replace(
    /let\s*\{\s*([A-Za-z_$][\w$]*)\s*:\s*([A-Za-z_$][\w$]*)\s*\}\s*=\s*req\.params\s*;/g,
    (_, originalName, aliasName) => {
      changed = true;
      return `let ${aliasName} = getRequestParam(req.params.${originalName}, "${originalName}");`;
    }
  );

  return { content, changed };
}

const files = walk(ROOT_DIR);
let updated = 0;

for (const file of files) {
  const original = fs.readFileSync(file, "utf8");
  const { content: transformed, changed } = transform(original);

  if (!changed) continue;

  const withImport = ensureCorrectImport(transformed, file);

  fs.writeFileSync(file, withImport, "utf8");
  updated++;
  console.log(`Updated: ${file}`);
}

console.log(`\nDone. Files updated: ${updated}`);
