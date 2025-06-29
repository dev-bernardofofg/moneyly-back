import { db } from "./index";
import { categories } from "./schema";

// Categorias padrão para novos usuários
export const defaultCategories = [
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

// Função para criar categorias padrão para um usuário
export async function createDefaultCategoriesForUser(userId: string) {
  try {
    const categoriesToInsert = defaultCategories.map((category) => ({
      ...category,
      userId,
    }));

    const insertedCategories = await db
      .insert(categories)
      .values(categoriesToInsert)
      .returning();

    console.log(
      `✅ Criadas ${insertedCategories.length} categorias padrão para o usuário ${userId}`
    );
    return insertedCategories;
  } catch (error) {
    console.error("❌ Erro ao criar categorias padrão:", error);
    throw error;
  }
}

// Função para obter categorias padrão (sem userId para referência)
export function getDefaultCategories() {
  return defaultCategories;
}
