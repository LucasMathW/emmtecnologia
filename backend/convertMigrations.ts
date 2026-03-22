import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const migrationsToConvert = [
  "20260115200637-create-message-apis",
  "20260130031809-message_reactions",
  "20260201064930-add-fromJid-to-message-reactions",
  "20260208212048-add-slug-to-companies",
  "20260210051829-unique_message_user_reaction",
  "20260217034258-add-transcribed-column-to-message",
  "20260219181225-add-presence-in-column-in-ticket-table",
  "20260219230401-add-last-message-type-to-tickets",
  "20260309043134-add-domain-in-companies-table"
];

const distDir = join(__dirname, "dist", "database", "migrations");
const srcDir = join(__dirname, "src", "database", "migrations");

// Garantir que a pasta src/migrations existe
if (!existsSync(srcDir)) {
  mkdirSync(srcDir, { recursive: true });
}

console.log("Convertendo migrations do Sequelize (JS → TS)...\n");

migrationsToConvert.forEach(migrationName => {
  const jsFile = `${migrationName}.js`;
  const tsFile = `${migrationName}.ts`;
  const jsPath = join(distDir, jsFile);
  const tsPath = join(srcDir, tsFile);

  if (!existsSync(jsPath)) {
    console.log(`❌ Arquivo não encontrado: ${jsFile}`);
    return;
  }

  if (existsSync(tsPath)) {
    console.log(`✓ Já existe: ${tsFile}`);
    return;
  }

  const jsContent = readFileSync(jsPath, "utf8");

  // Converter migration do Sequelize
  const tsContent = convertSequelizeMigration(jsContent, migrationName);

  writeFileSync(tsPath, tsContent);
  console.log(`✅ Convertido: ${jsFile} → ${tsFile}`);
});

console.log("\n🎉 Conversão concluída!");

function convertSequelizeMigration(
  jsContent: string,
  migrationName: string
): string {
  // Remover "use strict" e exports do CommonJS
  let tsContent = jsContent
    .replace(/^"use strict";\s*\n/, "")
    .replace(
      /Object\.defineProperty\(exports, "__esModule", {\s*value:\s*true\s*}\);\s*\n/,
      ""
    )
    .replace(
      /const sequelize_1 = require\("sequelize"\);/g,
      'import { QueryInterface, DataTypes } from "sequelize";'
    )
    .replace(/module\.exports = /g, "export default ")
    .replace(/sequelize_1\./g, "");

  // Verificar se já tem os imports
  if (!tsContent.includes("import { QueryInterface")) {
    tsContent = `import { QueryInterface, DataTypes } from "sequelize";

${tsContent}`;
  }

  return tsContent;
}
