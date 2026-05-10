import { and, count, eq, isNull, or } from "drizzle-orm";
import { db } from "../db";
import { categories as categoriesTable, userCategoryPreferences, type Category, type NewCategory } from "../db/schema";
import { PaginationHelper, type PaginationQuery, type PaginationResult } from "../helpers/pagination";
import type { ICategoryRepository } from "./interfaces/ICategoryRepository";
import { userCategoryPreferencesRepository } from "./user-category-preferences.repository";

export const categoryRepository = {
  async create(data: NewCategory): Promise<Category | undefined> {
    const [category] = await db.insert(categoriesTable).values(data).returning();
    return category;
  },

  async findByUserId(userId: string): Promise<Category[]> {
    const personal = await db.select().from(categoriesTable).where(eq(categoriesTable.userId, userId));

    const global = await db
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
        and(eq(categoriesTable.id, userCategoryPreferences.categoryId), eq(userCategoryPreferences.userId, userId))
      )
      .where(
        and(
          eq(categoriesTable.isGlobal, true),
          or(isNull(userCategoryPreferences.categoryId), eq(userCategoryPreferences.isVisible, true))
        )
      );

    return [...personal, ...global];
  },

  async findByUserIdPaginated(userId: string, pagination: PaginationQuery): Promise<PaginationResult<Category>> {
    const personalCountResult = await db
      .select({ value: count() })
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId));
    const personalCount = personalCountResult[0]?.value ?? 0;

    const globalCountResult = await db
      .select({ value: count() })
      .from(categoriesTable)
      .leftJoin(
        userCategoryPreferences,
        and(eq(categoriesTable.id, userCategoryPreferences.categoryId), eq(userCategoryPreferences.userId, userId))
      )
      .where(
        and(
          eq(categoriesTable.isGlobal, true),
          or(isNull(userCategoryPreferences.categoryId), eq(userCategoryPreferences.isVisible, true))
        )
      );
    const globalCount = globalCountResult[0]?.value ?? 0;

    const total = personalCount + globalCount;

    const personalCategories = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.userId, userId))
      .limit(pagination.limit)
      .offset(pagination.offset);

    const remainingLimit = pagination.limit - personalCategories.length;
    const remainingOffset = Math.max(0, pagination.offset - personalCount);

    let globalCategories: Category[] = [];
    if (remainingLimit > 0) {
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
          and(eq(categoriesTable.id, userCategoryPreferences.categoryId), eq(userCategoryPreferences.userId, userId))
        )
        .where(
          and(
            eq(categoriesTable.isGlobal, true),
            or(isNull(userCategoryPreferences.categoryId), eq(userCategoryPreferences.isVisible, true))
          )
        )
        .limit(remainingLimit)
        .offset(remainingOffset);
    }

    const page = Math.floor(pagination.offset / pagination.limit) + 1;
    return PaginationHelper.createPaginationResult([...personalCategories, ...globalCategories], total, page, pagination.limit);
  },

  async findByName(name: string): Promise<Category | null> {
    const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.name, name));
    return category ?? null;
  },

  async findByNameAndUserId(name: string, userId: string): Promise<Category | null> {
    const [category] = await db
      .select()
      .from(categoriesTable)
      .where(and(eq(categoriesTable.name, name), eq(categoriesTable.userId, userId)));
    return category ?? null;
  },

  async findByIdAndUserId(id: string, userId: string): Promise<Category | null> {
    const [personal] = await db
      .select()
      .from(categoriesTable)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)));
    if (personal) return personal;

    const [global] = await db
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
        and(eq(categoriesTable.id, userCategoryPreferences.categoryId), eq(userCategoryPreferences.userId, userId))
      )
      .where(
        and(
          eq(categoriesTable.id, id),
          eq(categoriesTable.isGlobal, true),
          or(isNull(userCategoryPreferences.categoryId), eq(userCategoryPreferences.isVisible, true))
        )
      );
    return global ?? null;
  },

  async update(id: string, data: NewCategory): Promise<Category | undefined> {
    const [category] = await db.update(categoriesTable).set(data).where(eq(categoriesTable.id, id)).returning();
    return category;
  },

  async delete(id: string, userId: string): Promise<Category[]> {
    return db
      .delete(categoriesTable)
      .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)))
      .returning();
  },

  async findGlobalCategories(): Promise<Category[]> {
    return db.select().from(categoriesTable).where(eq(categoriesTable.isGlobal, true));
  },

  async createGlobalCategory(name: string): Promise<Category | undefined> {
    const [category] = await db
      .insert(categoriesTable)
      .values({ name, isGlobal: true, userId: null })
      .returning();
    return category;
  },

  async hideGlobalCategoryForUser(userId: string, categoryId: string): Promise<unknown> {
    const [category] = await db
      .select()
      .from(categoriesTable)
      .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.isGlobal, true)));
    if (!category) throw new Error("Categoria não encontrada ou não é global");

    const existing = await userCategoryPreferencesRepository.findByUserIdAndCategoryId(userId, categoryId);
    if (existing) {
      return userCategoryPreferencesRepository.updateVisibility(userId, categoryId, false);
    }
    return userCategoryPreferencesRepository.create({ userId, categoryId, isVisible: false });
  },

  async showGlobalCategoryForUser(userId: string, categoryId: string): Promise<{ message: string }> {
    const [category] = await db
      .select()
      .from(categoriesTable)
      .where(and(eq(categoriesTable.id, categoryId), eq(categoriesTable.isGlobal, true)));
    if (!category) throw new Error("Categoria não encontrada ou não é global");

    const existing = await userCategoryPreferencesRepository.findByUserIdAndCategoryId(userId, categoryId);
    if (existing) {
      await userCategoryPreferencesRepository.delete(userId, categoryId);
      return { message: "Preferência removida, categoria agora visível" };
    }
    return { message: "Categoria já estava visível" };
  },
} satisfies ICategoryRepository;

export type { ICategoryRepository };
