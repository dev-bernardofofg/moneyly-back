/**
 * Testes de integração para endpoints de transações
 */

import request from "supertest";
import { app } from "../../src/server";

describe("Transaction Endpoints", () => {
  let authToken: string;
  let categoryId: string;
  let transactionId: string;

  // Setup: Criar usuário e obter token
  beforeAll(async () => {
    const userData = {
      name: "Test User Transactions",
      email: `transactions${Date.now()}@test.com`,
      password: "password123",
    };

    const signUpResponse = await request(app)
      .post("/auth/sign-up")
      .send(userData);

    authToken = signUpResponse.body.data.accessToken;

    // Criar uma categoria para usar nas transações
    const categoryResponse = await request(app)
      .post("/categories/create")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ name: `Test Category ${Date.now()}` });

    categoryId = categoryResponse.body.data.id;
  });

  describe("POST /transactions/create", () => {
    it("deve criar uma transação de despesa com sucesso", async () => {
      const transactionData = {
        type: "expense",
        title: "Almoço no restaurante",
        amount: 45.5,
        category: categoryId,
        description: "Almoço de domingo",
        date: new Date().toISOString(),
      };

      const response = await request(app)
        .post("/transactions/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data.type).toBe("expense");
      expect(response.body.data.title).toBe(transactionData.title);
      expect(response.body.data.categoryId).toBe(categoryId);

      // Salvar ID para testes posteriores
      transactionId = response.body.data.id;
    });

    it("deve criar uma transação de receita com sucesso", async () => {
      const transactionData = {
        type: "income",
        title: "Salário",
        amount: 5000,
        category: categoryId,
        description: "Salário mensal",
        date: new Date().toISOString(),
      };

      const response = await request(app)
        .post("/transactions/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data.type).toBe("income");
      expect(response.body.data.amount).toBe("5000");
    });

    it("deve rejeitar transação sem autenticação", async () => {
      const transactionData = {
        type: "expense",
        title: "Teste",
        amount: 100,
        category: categoryId,
        description: "Descrição",
      };

      await request(app)
        .post("/transactions/create")
        .send(transactionData)
        .expect(401);
    });

    it("deve validar campos obrigatórios", async () => {
      const response = await request(app)
        .post("/transactions/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          // Faltando campos obrigatórios
          type: "expense",
        })
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
    });

    it("deve validar tipo de transação", async () => {
      const transactionData = {
        type: "invalid-type",
        title: "Teste",
        amount: 100,
        category: categoryId,
        description: "Descrição",
      };

      await request(app)
        .post("/transactions/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send(transactionData)
        .expect(400);
    });

    it("deve rejeitar categoria inválida", async () => {
      const transactionData = {
        type: "expense",
        title: "Teste",
        amount: 100,
        category: "invalid-category-id",
        description: "Descrição",
      };

      const response = await request(app)
        .post("/transactions/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send(transactionData);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty("success", false);
    });
  });

  describe("POST /transactions/", () => {
    it("deve retornar lista de transações do usuário", async () => {
      const response = await request(app)
        .post("/transactions/")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("pagination");
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it("deve aplicar paginação corretamente", async () => {
      const response = await request(app)
        .post("/transactions/")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          page: 1,
          limit: 5,
        })
        .expect(200);

      expect(response.body.data.pagination).toHaveProperty("page", 1);
      expect(response.body.data.pagination).toHaveProperty("limit", 5);
      expect(response.body.data.data.length).toBeLessThanOrEqual(5);
    });

    it("deve filtrar por período quando fornecido", async () => {
      const startDate = new Date("2024-01-01").toISOString();
      const endDate = new Date("2024-01-31").toISOString();

      const response = await request(app)
        .post("/transactions/")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          page: 1,
          limit: 10,
          startDate,
          endDate,
        })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("PUT /transactions/:id", () => {
    it("deve atualizar uma transação com sucesso", async () => {
      const updateData = {
        title: "Almoço Atualizado",
        amount: 60,
        description: "Descrição atualizada",
      };

      const response = await request(app)
        .put(`/transactions/${transactionId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.amount).toBe(updateData.amount.toString());
    });

    it("deve permitir atualização parcial", async () => {
      const updateData = {
        title: "Apenas título atualizado",
      };

      const response = await request(app)
        .put(`/transactions/${transactionId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.title).toBe(updateData.title);
    });

    it("deve rejeitar atualização de transação inexistente", async () => {
      const updateData = {
        title: "Teste",
      };

      await request(app)
        .put("/transactions/invalid-id-999")
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });

    it("deve rejeitar atualização sem autenticação", async () => {
      const updateData = {
        title: "Teste",
      };

      await request(app)
        .put(`/transactions/${transactionId}`)
        .send(updateData)
        .expect(401);
    });
  });

  describe("GET /transactions/summary", () => {
    it("deve retornar resumo de transações", async () => {
      const response = await request(app)
        .get("/transactions/summary")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("totalIncome");
      expect(response.body.data).toHaveProperty("totalExpenses");
      expect(response.body.data).toHaveProperty("balance");
    });

    it("deve rejeitar sem autenticação", async () => {
      await request(app).get("/transactions/summary").expect(401);
    });
  });

  describe("GET /transactions/summary-by-month", () => {
    it("deve retornar resumo mensal", async () => {
      const response = await request(app)
        .get("/transactions/summary-by-month")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("GET /transactions/summary-current-period", () => {
    it("deve retornar resumo do período atual", async () => {
      const response = await request(app)
        .get("/transactions/summary-current-period")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("totalIncome");
      expect(response.body.data).toHaveProperty("totalExpenses");
    });
  });

  describe("DELETE /transactions/:id", () => {
    it("deve deletar uma transação com sucesso", async () => {
      // Criar uma transação para deletar
      const transactionData = {
        type: "expense",
        title: "Transação para deletar",
        amount: 50,
        category: categoryId,
        description: "Será deletada",
      };

      const createResponse = await request(app)
        .post("/transactions/create")
        .set("Authorization", `Bearer ${authToken}`)
        .send(transactionData);

      const idToDelete = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/transactions/${idToDelete}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });

    it("deve rejeitar deleção de transação inexistente", async () => {
      await request(app)
        .delete("/transactions/invalid-id-999")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });

    it("deve rejeitar deleção sem autenticação", async () => {
      await request(app).delete(`/transactions/${transactionId}`).expect(401);
    });

    it("não deve permitir deletar transação de outro usuário", async () => {
      // Criar outro usuário
      const otherUserData = {
        name: "Other User",
        email: `other${Date.now()}@test.com`,
        password: "password123",
      };

      const otherUserResponse = await request(app)
        .post("/auth/sign-up")
        .send(otherUserData);

      const otherToken = otherUserResponse.body.data.token;

      // Tentar deletar transação do primeiro usuário
      const response = await request(app)
        .delete(`/transactions/${transactionId}`)
        .set("Authorization", `Bearer ${otherToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty("success", false);
    });
  });
});
