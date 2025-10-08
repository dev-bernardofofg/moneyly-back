/**
 * Testes unitários para pagination helper
 */

import { PaginationHelper } from "../../../src/helpers/pagination";

describe("PaginationHelper", () => {
  describe("validateAndParse", () => {
    it("deve usar valores padrão quando nenhum parâmetro é fornecido", () => {
      const result = PaginationHelper.validateAndParse({});

      expect(result).toEqual({
        offset: 0, // (1 - 1) * 10
        limit: 10,
      });
    });

    it("deve calcular offset corretamente para página 1", () => {
      const result = PaginationHelper.validateAndParse({ page: 1, limit: 10 });

      expect(result).toEqual({
        offset: 0,
        limit: 10,
      });
    });

    it("deve calcular offset corretamente para página 2", () => {
      const result = PaginationHelper.validateAndParse({ page: 2, limit: 10 });

      expect(result).toEqual({
        offset: 10, // (2 - 1) * 10
        limit: 10,
      });
    });

    it("deve calcular offset corretamente para página 3", () => {
      const result = PaginationHelper.validateAndParse({ page: 3, limit: 20 });

      expect(result).toEqual({
        offset: 40, // (3 - 1) * 20
        limit: 20,
      });
    });

    it("deve limitar limit ao máximo permitido (100)", () => {
      const result = PaginationHelper.validateAndParse({
        page: 1,
        limit: 200,
      });

      expect(result.limit).toBe(100);
    });

    it("deve garantir que page seja pelo menos 1", () => {
      const result = PaginationHelper.validateAndParse({
        page: 0,
        limit: 10,
      });

      expect(result.offset).toBe(0); // Página 1
    });

    it("deve garantir que page seja pelo menos 1 mesmo com valor negativo", () => {
      const result = PaginationHelper.validateAndParse({
        page: -5,
        limit: 10,
      });

      expect(result.offset).toBe(0); // Página 1
    });

    it("deve garantir que limit seja pelo menos 1", () => {
      const result = PaginationHelper.validateAndParse({
        page: 1,
        limit: 0,
      });

      // limit 0 é tratado como falsy, então usa DEFAULT_LIMIT (10)
      expect(result.limit).toBe(10);
    });

    it("deve garantir que limit seja pelo menos 1 mesmo com valor negativo", () => {
      const result = PaginationHelper.validateAndParse({
        page: 1,
        limit: -10,
      });

      expect(result.limit).toBe(1);
    });

    it("deve lidar com valores string convertendo para número", () => {
      const result = PaginationHelper.validateAndParse({
        page: "3" as any,
        limit: "25" as any,
      });

      expect(result).toEqual({
        offset: 50, // (3 - 1) * 25
        limit: 25,
      });
    });
  });

  describe("createPaginationResult", () => {
    it("deve criar resultado de paginação com primeira página", () => {
      const data = [1, 2, 3, 4, 5];
      const total = 50;
      const page = 1;
      const limit = 10;

      const result = PaginationHelper.createPaginationResult(
        data,
        total,
        page,
        limit
      );

      expect(result).toEqual({
        data: [1, 2, 3, 4, 5],
        pagination: {
          page: 1,
          limit: 10,
          total: 50,
          totalPages: 5, // Math.ceil(50 / 10)
          hasNext: true, // page 1 < 5 pages
          hasPrev: false, // page 1 = first page
        },
      });
    });

    it("deve criar resultado de paginação com página intermediária", () => {
      const data = [11, 12, 13, 14, 15];
      const total = 50;
      const page = 2;
      const limit = 10;

      const result = PaginationHelper.createPaginationResult(
        data,
        total,
        page,
        limit
      );

      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 50,
        totalPages: 5,
        hasNext: true, // page 2 < 5 pages
        hasPrev: true, // page 2 > 1
      });
    });

    it("deve criar resultado de paginação com última página", () => {
      const data = [41, 42, 43, 44, 45];
      const total = 50;
      const page = 5;
      const limit: number = 10;

      const result = PaginationHelper.createPaginationResult(
        data,
        total,
        page,
        limit
      );

      expect(result.pagination).toEqual({
        page: 5,
        limit: 10,
        total: 50,
        totalPages: 5,
        hasNext: false, // page 5 = last page
        hasPrev: true, // page 5 > 1
      });
    });

    it("deve calcular totalPages corretamente quando total não é múltiplo de limit", () => {
      const data = [1, 2, 3];
      const total = 23;
      const page = 1;
      const limit = 10;

      const result = PaginationHelper.createPaginationResult(
        data,
        total,
        page,
        limit
      );

      expect(result.pagination.totalPages).toBe(3); // Math.ceil(23 / 10)
    });

    it("deve lidar com resultado vazio", () => {
      const data: number[] = [];
      const total = 0;
      const page = 1;
      const limit = 10;

      const result = PaginationHelper.createPaginationResult(
        data,
        total,
        page,
        limit
      );

      expect(result).toEqual({
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0, // Math.ceil(0 / 10)
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it("deve lidar com objetos complexos no data", () => {
      const data = [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ];
      const total = 20;
      const page = 1;
      const limit = 10;

      const result = PaginationHelper.createPaginationResult(
        data,
        total,
        page,
        limit
      );

      expect(result.data).toEqual(data);
      expect(result.pagination.total).toBe(20);
    });
  });

  describe("Constantes", () => {
    it("deve ter DEFAULT_PAGE igual a 1", () => {
      expect(PaginationHelper.DEFAULT_PAGE).toBe(1);
    });

    it("deve ter DEFAULT_LIMIT igual a 10", () => {
      expect(PaginationHelper.DEFAULT_LIMIT).toBe(10);
    });

    it("deve ter MAX_LIMIT igual a 100", () => {
      expect(PaginationHelper.MAX_LIMIT).toBe(100);
    });
  });
});
