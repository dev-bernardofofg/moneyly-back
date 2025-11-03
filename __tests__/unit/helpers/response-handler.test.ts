/**
 * Testes unitários para ResponseHandler
 */

import { ResponseHandler } from "../../../src/helpers/response-handler";

describe("ResponseHandler", () => {
  let mockRes: any;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("success", () => {
    it("deve retornar resposta de sucesso com dados", () => {
      const data = { id: "1", name: "Test" };
      ResponseHandler.success(mockRes, data);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        data,
      });
    });

    it("deve incluir mensagem quando fornecida", () => {
      const data = { id: "1" };
      const message = "Operação realizada com sucesso";

      ResponseHandler.success(mockRes, data, message);

      expect(mockRes.json).toHaveBeenCalledWith({
        data,
        message,
      });
    });

    it("deve aceitar status code customizado", () => {
      ResponseHandler.success(mockRes, {}, undefined, 201);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe("error", () => {
    it("deve retornar resposta de erro", () => {
      const error = "Erro ao processar";
      ResponseHandler.error(mockRes, error);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error,
      });
    });

    it("deve incluir detalhes quando fornecidos", () => {
      const error = "Validação falhou";
      const details = { field: "email", message: "Email inválido" };

      ResponseHandler.error(mockRes, error, details);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error,
        details,
      });
    });
  });

  describe("created", () => {
    it("deve retornar status 201", () => {
      ResponseHandler.created(mockRes, { id: "1" });
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe("notFound", () => {
    it("deve retornar status 404", () => {
      ResponseHandler.notFound(mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Recurso não encontrado",
      });
    });
  });

  describe("unauthorized", () => {
    it("deve retornar status 401", () => {
      ResponseHandler.unauthorized(mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe("forbidden", () => {
    it("deve retornar status 403", () => {
      ResponseHandler.forbidden(mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe("serverError", () => {
    it("deve retornar status 500", () => {
      ResponseHandler.serverError(mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe("paginated", () => {
    it("deve retornar resposta paginada", () => {
      const data = [{ id: "1" }, { id: "2" }];
      const pagination = {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      };

      ResponseHandler.paginated(mockRes, data, pagination);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data,
        pagination: {
          ...pagination,
          hasNext: false,
          hasPrev: false,
        },
      });
    });
  });
});
