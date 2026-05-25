import { eq } from 'drizzle-orm';
import { logger } from '../lib/logger';
import { userCategoryPreferencesRepository } from '../repositories/user-category-preferences.repository';
import { db } from './index';
import { categories } from './schema';

// Categorias globais padrão
export const globalCategories = [
  // Receitas
  { name: 'Salário' },
  { name: 'Freelance' },
  { name: 'Investimentos' },
  { name: 'Presentes' },
  { name: 'Outros' },

  // Despesas
  { name: 'Alimentação' },
  { name: 'Transporte' },
  { name: 'Moradia' },
  { name: 'Saúde' },
  { name: 'Educação' },
  { name: 'Lazer' },
  { name: 'Vestuário' },
  { name: 'Contas' },
  { name: 'Compras' },
  { name: 'Emergências' },
];

export async function createGlobalCategories() {
  try {
    const existingCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.isGlobal, true));

    if (existingCategories.length > 0) {
      logger.info('Categorias globais já existem, pulando criação', {
        count: existingCategories.length,
      });
      return existingCategories;
    }

    const categoriesToInsert = globalCategories.map((category) => ({
      ...category,
      isGlobal: true,
      userId: null,
    }));

    const insertedCategories = await db.insert(categories).values(categoriesToInsert).returning();

    logger.info('Categorias globais criadas', { count: insertedCategories.length });
    return insertedCategories;
  } catch (error) {
    logger.error('Erro ao criar categorias globais', error as Error);
    throw error;
  }
}

export async function createDefaultPreferencesForUser(userId: string) {
  try {
    let globalCategoriesData = await db
      .select()
      .from(categories)
      .where(eq(categories.isGlobal, true));

    if (globalCategoriesData.length === 0) {
      logger.warn('Nenhuma categoria global encontrada, criando agora');
      try {
        await createGlobalCategories();
        globalCategoriesData = await db
          .select()
          .from(categories)
          .where(eq(categories.isGlobal, true));
      } catch (error) {
        logger.error('Falha ao criar categorias globais automaticamente', error as Error);
        if (globalCategoriesData.length === 0) {
          logger.warn('Usuário criado sem categorias padrão', { userId });
          return [];
        }
      }
    }

    const categoryIds = globalCategoriesData.map((cat) => cat.id);
    const preferences = await userCategoryPreferencesRepository.createDefaultPreferencesForUser(
      userId,
      categoryIds
    );

    logger.info('Preferências padrão criadas', { userId, count: preferences.length });
    return preferences;
  } catch (error) {
    logger.error('Erro ao criar preferências padrão', error as Error, { userId });
    throw error;
  }
}

export function getGlobalCategories() {
  return globalCategories;
}
