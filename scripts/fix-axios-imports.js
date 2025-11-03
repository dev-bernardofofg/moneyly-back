/**
 * Script para substituir imports do axios-instance nos hooks gerados
 * Converte o caminho do backend para o caminho do frontend
 */

const fs = require("fs");
const path = require("path");

const hooksDir = path.join(__dirname, "../src/generated/hooks");

// Função para processar arquivos recursivamente
function processDirectory(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      let content = fs.readFileSync(filePath, "utf8");

      // Substituir o import do axios-instance
      // Captura diferentes padrões: ../../../lib/axios-instance, ./src/lib/axios-instance, etc.
      const newImport = `from '@/app/(utils)/axios-instance'`;
      let modified = false;

      // Padrão que captura qualquer caminho relativo que termine em /lib/axios-instance ou /src/lib/axios-instance
      // Exemplos: ../../../lib/axios-instance, ../../lib/axios-instance, ./src/lib/axios-instance
      const axiosImportPattern =
        /from\s+['"]((?:\.\.?\/)+)(?:src\/)?lib\/axios-instance['"]/g;

      if (axiosImportPattern.test(content)) {
        content = content.replace(axiosImportPattern, newImport);
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(filePath, content, "utf8");
        console.log(
          `✅ Fixed imports in: ${path.relative(process.cwd(), filePath)}`
        );
      }
    }
  });
}

// Executar o script
if (fs.existsSync(hooksDir)) {
  console.log("🔧 Fixing axios-instance imports in generated hooks...");
  processDirectory(hooksDir);
  console.log("✅ Done!");
} else {
  console.log("⚠️  Hooks directory not found. Run 'pnpm api:generate' first.");
}
