import { eq } from "drizzle-orm";
import { UserCategoryPreferencesRepository } from "../repositories/user-category-preferences.repository";
import { db } from "./index";
import { categories } from "./schema";

// Categorias globais padrão
export const globalCategories = [
  // Receitas
  { name: "Salário" },
  { name: "Freelance" },
  { name: "Investimentos" },
  { name: "Presentes" },
  { name: "Outros" },

  // Despesas
  { name: "Alimentação" },
  { name: "Transporte" },
  { name: "Moradia" },
  { name: "Saúde" },
  { name: "Educação" },
  { name: "Lazer" },
  { name: "Vestuário" },
  { name: "Contas" },
  { name: "Compras" },
  { name: "Emergências" },
];

// Função para criar categorias globais (executar apenas uma vez)
export async function createGlobalCategories() {
  try {
    // Verificar se já existem categorias globais
    const existingCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.isGlobal, true));

    if (existingCategories.length > 0) {
      console.log(
        `ℹ️ Já existem ${existingCategories.length} categorias globais. Pulando criação.`
      );
      return existingCategories;
    }

    const categoriesToInsert = globalCategories.map((category) => ({
      ...category,
      isGlobal: true,
      userId: null, // Categorias globais não têm userId
    }));

    const insertedCategories = await db
      .insert(categories)
      .values(categoriesToInsert)
      .returning();

    console.log(`✅ Criadas ${insertedCategories.length} categorias globais`);
    return insertedCategories;
  } catch (error) {
    console.error("❌ Erro ao criar categorias globais:", error);
    throw error;
  }
}

// Função para criar preferências padrão para um usuário
export async function createDefaultPreferencesForUser(userId: string) {
  try {
    // Buscar todas as categorias globais
    let globalCategoriesData = await db
      .select()
      .from(categories)
      .where(eq(categories.isGlobal, true));

    // Se não existirem categorias globais, criar elas primeiro
    if (globalCategoriesData.length === 0) {
      console.log(
        "⚠️ Nenhuma categoria global encontrada. Criando categorias globais..."
      );
      try {
        await createGlobalCategories();
        // Buscar novamente após criar
        globalCategoriesData = await db
          .select()
          .from(categories)
          .where(eq(categories.isGlobal, true));
      } catch (error) {
        console.error(
          "❌ Erro ao criar categorias globais automaticamente:",
          error
        );
        // Se ainda não tiver categorias, retornar vazio
        if (globalCategoriesData.length === 0) {
          console.log(
            "⚠️ Não foi possível criar categorias globais. Usuário criado sem categorias padrão."
          );
          return [];
        }
      }
    }

    const categoryIds = globalCategoriesData.map((cat) => cat.id);
    const preferences =
      await UserCategoryPreferencesRepository.createDefaultPreferencesForUser(
        userId,
        categoryIds
      );

    console.log(
      `✅ Criadas ${preferences.length} preferências padrão para o usuário ${userId}`
    );
    return preferences;
  } catch (error) {
    console.error("❌ Erro ao criar preferências padrão:", error);
    throw error;
  }
}

// Função para obter categorias globais (sem userId para referência)
export function getGlobalCategories() {
  return globalCategories;
}
