import { connectDB, disconnectDB } from "../db";
import { createGlobalCategories } from "../db/seed";

async function handleSeedCategories() {
  try {
    console.log("🔄 Conectando ao banco de dados...");
    await connectDB();

    console.log("🌱 Restaurando categorias globais...");
    const categories = await createGlobalCategories();

    console.log(`✅ Restauradas ${categories.length} categorias globais:`);
    categories.forEach((cat) => {
      console.log(`  - ${cat.name}`);
    });
  } catch (error) {
    console.error("❌ Erro ao restaurar categorias:", error);
  } finally {
    await disconnectDB();
  }
}

handleSeedCategories();
