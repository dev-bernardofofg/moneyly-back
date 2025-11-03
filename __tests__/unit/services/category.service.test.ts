/**
 * Testes unitários para CategoryService
 */

import { CategoryRepository } from "../../../src/repositories/categories.repository";
import {
  createCategoryService,
  deleteCategoryService,
  getCategoriesService,
  updateCategoryService,
} from "../../../src/services/category.service";
import {
  validateCategoryExists,
  validateCategoryExistsByUserId,
  validateCategoryIsNotGlobal,
  validateCategoryNameIsNotInUse,
  validateHideGlobalCategory,
} from "../../../src/validations/category.validation";
import { validatePagination } from "../../../src/validations/pagination.validation";

// Mock dos módulos
jest.mock("../../../src/repositories/categories.repository");
jest.mock("../../../src/validations/category.validation");
jest.mock("../../../src/validations/pagination.validation");

describe("CategoryService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createCategoryService", () => {
    const mockUserId = "user-123";
    const mockCategoryName = "Alimentação";

    const mockCreatedCategory = {
      id: "cat-123",
      name: mockCategoryName,
      userId: mockUserId,
      icon: null,
      color: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("deve criar uma categoria com sucesso", async () => {
      (validateCategoryExists as jest.Mock).mockResolvedValue(undefined);
      (CategoryRepository.create as jest.Mock).mockResolvedValue(
        mockCreatedCategory
      );

      const result = await createCategoryService(mockCategoryName, mockUserId);

      expect(validateCategoryExists).toHaveBeenCalledWith(mockCategoryName);
      expect(CategoryRepository.create).toHaveBeenCalledWith({
        name: mockCategoryName,
        userId: mockUserId,
      });
      expect(result).toEqual(mockCreatedCategory);
    });

    it("deve validar se categoria já existe antes de criar", async () => {
      (validateCategoryExists as jest.Mock).mockRejectedValue(
        new Error("Categoria já existe")
      );

      await expect(
        createCategoryService(mockCategoryName, mockUserId)
      ).rejects.toThrow("Categoria já existe");

      expect(CategoryRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("getCategoriesService", () => {
    const mockUserId = "user-123";
    const mockCategories = [
      { id: "cat-1", name: "Alimentação", userId: mockUserId },
      { id: "cat-2", name: "Transporte", userId: mockUserId },
      { id: "cat-3", name: "Lazer", userId: mockUserId },
    ];

    it("deve retornar categorias com paginação", async () => {
      const pagination = { page: 1, limit: 10 };
      const mockPaginatedResult = {
        data: mockCategories,
        pagination: {
          page: 1,
          limit: 10,
          total: 3,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      (validatePagination as jest.Mock).mockResolvedValue(pagination);
      (CategoryRepository.findByUserIdPaginated as jest.Mock).mockResolvedValue(
        mockPaginatedResult
      );

      const result = await getCategoriesService(mockUserId, pagination);

      expect(validatePagination).toHaveBeenCalledWith(1, 10);
      expect(CategoryRepository.findByUserIdPaginated).toHaveBeenCalledWith(
        mockUserId,
        pagination
      );
      expect(result).toEqual(mockPaginatedResult);
    });

    it("deve retornar todas as categorias sem paginação quando não especificada", async () => {
      (validatePagination as jest.Mock).mockResolvedValue(null);
      (CategoryRepository.findByUserId as jest.Mock).mockResolvedValue(
        mockCategories
      );

      const result = await getCategoriesService(mockUserId, {});

      expect(CategoryRepository.findByUserId).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual({
        data: mockCategories,
        pagination: {
          page: 1,
          limit: 3,
          total: 3,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it("deve retornar estrutura vazia quando usuário não tem categorias", async () => {
      (validatePagination as jest.Mock).mockResolvedValue(null);
      (CategoryRepository.findByUserId as jest.Mock).mockResolvedValue([]);

      const result = await getCategoriesService(mockUserId, {});

      expect(result).toEqual({
        data: [],
        pagination: {
          page: 1,
          limit: 0,
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it("deve lidar com paginação de múltiplas páginas", async () => {
      const pagination = { page: 2, limit: 10 };
      const mockPaginatedResult = {
        data: mockCategories.slice(0, 2),
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: true,
        },
      };

      (validatePagination as jest.Mock).mockResolvedValue(pagination);
      (CategoryRepository.findByUserIdPaginated as jest.Mock).mockResolvedValue(
        mockPaginatedResult
      );

      const result = await getCategoriesService(mockUserId, pagination);

      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.hasPrev).toBe(true);
      expect(result.pagination.page).toBe(2);
    });
  });

  describe("updateCategoryService", () => {
    const mockUserId = "user-123";
    const mockCategoryId = "cat-123";
    const mockNewName = "Alimentação Atualizada";

    const mockUpdatedCategory = {
      id: mockCategoryId,
      name: mockNewName,
      userId: mockUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("deve atualizar uma categoria com sucesso", async () => {
      (validateCategoryExistsByUserId as jest.Mock).mockResolvedValue(
        undefined
      );
      (validateCategoryExists as jest.Mock).mockResolvedValue(undefined);
      (validateCategoryIsNotGlobal as jest.Mock).mockResolvedValue(undefined);
      (validateCategoryNameIsNotInUse as jest.Mock).mockResolvedValue(
        undefined
      );
      (CategoryRepository.update as jest.Mock).mockResolvedValue(
        mockUpdatedCategory
      );

      const result = await updateCategoryService(
        mockCategoryId,
        mockNewName,
        mockUserId
      );

      expect(validateCategoryExistsByUserId).toHaveBeenCalledWith(
        mockCategoryId,
        mockUserId
      );
      expect(validateCategoryExists).toHaveBeenCalledWith(mockNewName);
      expect(validateCategoryIsNotGlobal).toHaveBeenCalledWith(
        mockCategoryId,
        mockUserId
      );
      expect(validateCategoryNameIsNotInUse).toHaveBeenCalledWith(
        mockNewName,
        mockUserId
      );
      expect(CategoryRepository.update).toHaveBeenCalledWith(mockCategoryId, {
        name: mockNewName,
        userId: mockUserId,
      });
      expect(result).toEqual(mockUpdatedCategory);
    });

    it("deve lançar erro quando categoria não existe", async () => {
      (validateCategoryExistsByUserId as jest.Mock).mockRejectedValue(
        new Error("Categoria não encontrada")
      );

      await expect(
        updateCategoryService(mockCategoryId, mockNewName, mockUserId)
      ).rejects.toThrow("Categoria não encontrada");

      expect(CategoryRepository.update).not.toHaveBeenCalled();
    });

    it("deve lançar erro quando tentar atualizar categoria global", async () => {
      (validateCategoryExistsByUserId as jest.Mock).mockResolvedValue(
        undefined
      );
      (validateCategoryExists as jest.Mock).mockResolvedValue(undefined);
      (validateCategoryIsNotGlobal as jest.Mock).mockRejectedValue(
        new Error("Não é possível atualizar categoria global")
      );

      await expect(
        updateCategoryService(mockCategoryId, mockNewName, mockUserId)
      ).rejects.toThrow("Não é possível atualizar categoria global");

      expect(CategoryRepository.update).not.toHaveBeenCalled();
    });

    it("deve lançar erro quando novo nome já está em uso", async () => {
      (validateCategoryExistsByUserId as jest.Mock).mockResolvedValue(
        undefined
      );
      (validateCategoryExists as jest.Mock).mockResolvedValue(undefined);
      (validateCategoryIsNotGlobal as jest.Mock).mockResolvedValue(undefined);
      (validateCategoryNameIsNotInUse as jest.Mock).mockRejectedValue(
        new Error("Nome já está em uso")
      );

      await expect(
        updateCategoryService(mockCategoryId, mockNewName, mockUserId)
      ).rejects.toThrow("Nome já está em uso");

      expect(CategoryRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteCategoryService", () => {
    const mockUserId = "user-123";
    const mockCategoryId = "cat-123";

    it("deve deletar uma categoria com sucesso", async () => {
      (validateCategoryExistsByUserId as jest.Mock).mockResolvedValue(
        undefined
      );
      (validateHideGlobalCategory as jest.Mock).mockResolvedValue(undefined);
      (CategoryRepository.delete as jest.Mock).mockResolvedValue(true);

      const result = await deleteCategoryService(mockCategoryId, mockUserId);

      expect(validateCategoryExistsByUserId).toHaveBeenCalledWith(
        mockCategoryId,
        mockUserId
      );
      expect(validateHideGlobalCategory).toHaveBeenCalledWith(
        mockCategoryId,
        mockUserId
      );
      expect(CategoryRepository.delete).toHaveBeenCalledWith(
        mockCategoryId,
        mockUserId
      );
      expect(result).toBe(true);
    });

    it("deve lançar erro quando categoria não existe", async () => {
      (validateCategoryExistsByUserId as jest.Mock).mockRejectedValue(
        new Error("Categoria não encontrada")
      );

      await expect(
        deleteCategoryService(mockCategoryId, mockUserId)
      ).rejects.toThrow("Categoria não encontrada");

      expect(CategoryRepository.delete).not.toHaveBeenCalled();
    });

    it("deve lançar erro quando tentar deletar categoria global", async () => {
      (validateCategoryExistsByUserId as jest.Mock).mockResolvedValue(
        undefined
      );
      (validateHideGlobalCategory as jest.Mock).mockRejectedValue(
        new Error("Não é possível deletar categoria global")
      );

      await expect(
        deleteCategoryService(mockCategoryId, mockUserId)
      ).rejects.toThrow("Não é possível deletar categoria global");

      expect(CategoryRepository.delete).not.toHaveBeenCalled();
    });

    it("deve permitir apenas ocultar categoria global", async () => {
      const globalCategoryId = "global-cat-123";
      (validateCategoryExistsByUserId as jest.Mock).mockResolvedValue(
        undefined
      );
      (validateHideGlobalCategory as jest.Mock).mockResolvedValue(undefined);
      (CategoryRepository.delete as jest.Mock).mockResolvedValue(true);

      const result = await deleteCategoryService(globalCategoryId, mockUserId);

      expect(validateHideGlobalCategory).toHaveBeenCalledWith(
        globalCategoryId,
        mockUserId
      );
      expect(result).toBe(true);
    });
  });
});


