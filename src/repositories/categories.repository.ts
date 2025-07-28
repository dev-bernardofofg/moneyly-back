import { and, count, eq, isNull, or } from "drizzle-orm";
import { db } from "../db";
import {
  categories as categoriesTable,
  userCategoryPreferences,
  type NewCategory,
} from "../db/schema";
import {
  PaginationHelper,
  PaginationQuery,
  PaginationResult,
} from "../helpers/pagination";
import { UserCategoryPreferencesRepository } from "./user-category-preferences.repository";

export class CategoryRepository {
  static async create(categoryData: NewCategory) {
    const [category] = await db
      .insert(categoriesTable)
      .values(categoryData)
      .returning();
    return category;
  }

  static async findByUserId(userId: string) {
    // Buscar categorias pessoais do usuário
    const personalCategories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId));

    // Buscar categorias globais que o usuário pode ver
    // Lógica: se não há preferência = visível, se há preferência = verificar isVisible
    const globalCategories = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        isGlobal: categoriesTable.isGlobal,
        createdAt: categoriesTable.createdAt,
        updatedAt: categoriesTable.updatedAt,
        userId: categoriesTable.userId,
      })
      .from(categoriesTable)
      .leftJoin(
        userCategoryPreferences,
        and(
          eq(categoriesTable.id, userCategoryPreferences.categoryId),
          eq(userCategoryPreferences.userId, userId)
        )
      )
      .where(
        and(
          eq(categoriesTable.isGlobal, true),
          or(
            isNull(userCategoryPreferences.categoryId), // Não há preferência = visível
            eq(userCategoryPreferences.isVisible, true) // Há preferência e é visível
          )
        )
      );

    return [...personalCategories, ...globalCategories];
  }

  static async findByUserIdPaginated(
    userId: string,
    pagination: PaginationQuery
  ): Promise<PaginationResult<typeof categoriesTable.$inferSelect>> {
    // Contar categorias pessoais
    const [{ value: personalCount }] = await db
      .select({ value: count() })
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId));

    // Contar categorias globais visíveis (otimizado)
    const [{ value: globalCount }] = await db
      .select({ value: count() })
      .from(categoriesTable)
      .leftJoin(
        userCategoryPreferences,
        and(
          eq(categoriesTable.id, userCategoryPreferences.categoryId),
          eq(userCategoryPreferences.userId, userId)
        )
      )
      .where(
        and(
          eq(categoriesTable.isGlobal, true),
          or(
            isNull(userCategoryPreferences.categoryId), // Não há preferência = visível
            eq(userCategoryPreferences.isVisible, true) // Há preferência e é visível
          )
        )
      );

    const total = personalCount + globalCount;

    // Buscar categorias pessoais
    const personalCategories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId))
      .limit(pagination.limit)
      .offset(pagination.offset);

    // Se ainda há espaço para mais categorias, buscar globais
    const remainingLimit = pagination.limit - personalCategories.length;
    const remainingOffset = Math.max(0, pagination.offset - personalCount);

    let globalCategories: (typeof categoriesTable.$inferSelect)[] = [];
    if (remainingLimit > 0 && remainingOffset >= 0) {
      globalCategories = await db
        .select({
          id: categoriesTable.id,
          name: categoriesTable.name,
          isGlobal: categoriesTable.isGlobal,
          createdAt: categoriesTable.createdAt,
          updatedAt: categoriesTable.updatedAt,
          userId: categoriesTable.userId,
        })
        .from(categoriesTable)
        .leftJoin(
          userCategoryPreferences,
          and(
            eq(categoriesTable.id, userCategoryPreferences.categoryId),
            eq(userCategoryPreferences.userId, userId)
          )
        )
        .where(
          and(
            eq(categoriesTable.isGlobal, true),
            or(
              isNull(userCategoryPreferences.categoryId), // Não há preferência = visível
              eq(userCategoryPreferences.isVisible, true) // Há preferência e é visível
            )
          )
        )
        .limit(remainingLimit)
        .offset(remainingOffset);
    }

    const categories = [...personalCategories, ...globalCategories];
    const page = Math.floor(pagination.offset / pagination.limit) + 1;

    return PaginationHelper.createPaginationResult(
      categories,
      total,
      page,
      pagination.limit
    );
  }

  static async findByName(name: string) {
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.name, name));
    return categories[0] || null;
  }

  static async findByNameAndUserId(name: string, userId: string) {
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(
        and(eq(categoriesTable.name, name), eq(categoriesTable.userId, userId))
      );
    return categories[0] || null;
  }

  static async findByIdAndUserId(id: string, userId: string) {
    // Buscar categoria pessoal
    const personalCategory = await db
      .select()
      .from(categoriesTable)
      .where(
        and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId))
      );

    if (personalCategory[0]) {
      return personalCategory[0];
    }

    // Buscar categoria global que o usuário pode ver (otimizado)
    const globalCategory = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        isGlobal: categoriesTable.isGlobal,
        createdAt: categoriesTable.createdAt,
        updatedAt: categoriesTable.updatedAt,
        userId: categoriesTable.userId,
      })
      .from(categoriesTable)
      .leftJoin(
        userCategoryPreferences,
        and(
          eq(categoriesTable.id, userCategoryPreferences.categoryId),
          eq(userCategoryPreferences.userId, userId)
        )
      )
      .where(
        and(
          eq(categoriesTable.id, id),
          eq(categoriesTable.isGlobal, true),
          or(
            isNull(userCategoryPreferences.categoryId), // Não há preferência = visível
            eq(userCategoryPreferences.isVisible, true) // Há preferência e é visível
          )
        )
      );

    return globalCategory[0] || null;
  }

  static async update(id: string, categoryData: NewCategory) {
    const [category] = await db
      .update(categoriesTable)
      .set(categoryData)
      .where(eq(categoriesTable.id, id))
      .returning();
    return category;
  }

  static async delete(id: string, userId: string) {
    const category = await db
      .delete(categoriesTable)
      .where(
        and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId))
      )
      .returning();
    return category;
  }

  // Novos métodos para categorias globais
  static async findGlobalCategories() {
    const categories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.isGlobal, true));
    return categories;
  }

  static async createGlobalCategory(name: string) {
    const [category] = await db
      .insert(categoriesTable)
      .values({
        name,
        isGlobal: true,
        userId: null, // Categorias globais não têm userId
      })
      .returning();
    return category;
  }

  static async hideGlobalCategoryForUser(userId: string, categoryId: string) {
    // Verificar se a categoria é global
    const category = await db
      .select()
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.id, categoryId),
          eq(categoriesTable.isGlobal, true)
        )
      );

    if (!category[0]) {
      throw new Error("Categoria não encontrada ou não é global");
    }

    // Criar ou atualizar preferência para ocultar
    const existingPreference =
      await UserCategoryPreferencesRepository.findByUserIdAndCategoryId(
        userId,
        categoryId
      );

    if (existingPreference) {
      return await UserCategoryPreferencesRepository.updateVisibility(
        userId,
        categoryId,
        false
      );
    } else {
      return await UserCategoryPreferencesRepository.create({
        userId,
        categoryId,
        isVisible: false,
      });
    }
  }

  static async showGlobalCategoryForUser(userId: string, categoryId: string) {
    // Verificar se a categoria é global
    const category = await db
      .select()
      .from(categoriesTable)
      .where(
        and(
          eq(categoriesTable.id, categoryId),
          eq(categoriesTable.isGlobal, true)
        )
      );

    if (!category[0]) {
      throw new Error("Categoria não encontrada ou não é global");
    }

    // Se há preferência, remover (volta ao padrão = visível)
    const existingPreference =
      await UserCategoryPreferencesRepository.findByUserIdAndCategoryId(
        userId,
        categoryId
      );

    if (existingPreference) {
      await UserCategoryPreferencesRepository.delete(userId, categoryId);
      return { message: "Preferência removida, categoria agora visível" };
    } else {
      return { message: "Categoria já estava visível" };
    }
  }
}
