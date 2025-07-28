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
    const globalCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.isGlobal, true));

    if (globalCategories.length === 0) {
      console.log(
        "⚠️ Nenhuma categoria global encontrada. Execute createGlobalCategories primeiro."
      );
      return [];
    }

    const categoryIds = globalCategories.map((cat) => cat.id);
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
