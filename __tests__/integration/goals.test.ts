/**
 * Testes de integração para endpoints de goals
 */

import request from "supertest";
import { app } from "../../src/server";

describe("Goal Endpoints", () => {
  let authToken: string;
  let goalId: string;

  // Setup: Criar usuário e obter token
  beforeAll(async () => {
    const userData = {
      name: "Test User Goals",
      email: `goals${Date.now()}@test.com`,
      password: "password123",
    };

    const signUpResponse = await request(app)
      .post("/auth/sign-up")
      .send(userData);

    authToken = signUpResponse.body.data.accessToken;
  });

  describe("POST /goals/", () => {
    it("deve criar uma meta com sucesso", async () => {
      const goalData = {
        title: "Viagem para Europa",
        description: "Férias de verão 2025",
        targetAmount: 10000,
        targetDate: "2025-06-30",
      };

      const response = await request(app)
        .post("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(goalData)
        .expect(201);

      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data.title).toBe(goalData.title);
      expect(response.body.data.description).toBe(goalData.description);
      expect(response.body.data.targetAmount).toBe(
        goalData.targetAmount.toString()
      );

      // Salvar ID para testes posteriores
      goalId = response.body.data.id;
    });

    it("deve criar meta sem descrição", async () => {
      const goalData = {
        title: "Emergência",
        targetAmount: 5000,
        targetDate: "2025-12-31",
      };

      const response = await request(app)
        .post("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(goalData)
        .expect(201);

      expect(response.body).toHaveProperty("data");
      expect(response.body.data.title).toBe(goalData.title);
    });

    it("deve rejeitar criação sem autenticação", async () => {
      const goalData = {
        title: "Teste",
        targetAmount: 5000,
        targetDate: "2025-12-31",
      };

      await request(app).post("/goals/").send(goalData).expect(401);
    });

    it("deve validar campos obrigatórios", async () => {
      const response = await request(app)
        .post("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          // Faltando campos obrigatórios
          title: "Apenas título",
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("deve validar que targetAmount seja positivo", async () => {
      const goalData = {
        title: "Meta Inválida",
        targetAmount: -1000,
        targetDate: "2025-12-31",
      };

      const response = await request(app)
        .post("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(goalData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("deve validar formato de data", async () => {
      const goalData = {
        title: "Meta com data inválida",
        targetAmount: 1000,
        targetDate: "data-invalida",
      };

      const response = await request(app)
        .post("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(goalData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("deve aceitar valores decimais para targetAmount", async () => {
      const goalData = {
        title: "Meta Decimal",
        targetAmount: 7500.75,
        targetDate: "2025-09-30",
      };

      const response = await request(app)
        .post("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(goalData)
        .expect(201);

      expect(response.body.data.targetAmount).toBe("7500.75");
    });
  });

  describe("GET /goals/", () => {
    it("deve retornar lista de metas do usuário", async () => {
      const response = await request(app)
        .get("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("deve retornar metas com informações de progresso", async () => {
      const response = await request(app)
        .get("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const goal = response.body.data[0];
      expect(goal).toHaveProperty("progress");
      expect(goal.progress).toHaveProperty("percentage");
      expect(goal.progress).toHaveProperty("daysRemaining");
    });

    it("deve retornar apenas metas ativas", async () => {
      const response = await request(app)
        .get("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const inactiveGoals = response.body.data.filter(
        (g: any) => g.isActive === false
      );
      expect(inactiveGoals).toHaveLength(0);
    });

    it("deve retornar array vazio para usuário sem metas", async () => {
      // Criar novo usuário
      const newUserData = {
        name: "New User Goals",
        email: `newgoals${Date.now()}@test.com`,
        password: "password123",
      };

      const newUserResponse = await request(app)
        .post("/auth/sign-up")
        .send(newUserData);

      const newToken = newUserResponse.body.data.accessToken;

      const response = await request(app)
        .get("/goals/")
        .set("Authorization", `Bearer ${newToken}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it("deve rejeitar sem autenticação", async () => {
      await request(app).get("/goals/").expect(401);
    });
  });

  describe("GET /goals/:id", () => {
    it("deve retornar meta específica", async () => {
      const response = await request(app)
        .get(`/goals/${goalId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body.data.id).toBe(goalId);
      expect(response.body.data).toHaveProperty("title");
      expect(response.body.data).toHaveProperty("targetAmount");
    });

    it("deve rejeitar busca de meta inexistente", async () => {
      await request(app)
        .get("/goals/invalid-id-999")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });

    it("não deve permitir buscar meta de outro usuário", async () => {
      // Criar outro usuário
      const otherUserData = {
        name: "Other User",
        email: `othergoal${Date.now()}@test.com`,
        password: "password123",
      };

      const otherUserResponse = await request(app)
        .post("/auth/sign-up")
        .send(otherUserData);

      const otherToken = otherUserResponse.body.data.accessToken;

      const response = await request(app)
        .get(`/goals/${goalId}`)
        .set("Authorization", `Bearer ${otherToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty("error");
    });

    it("deve rejeitar sem autenticação", async () => {
      await request(app).get(`/goals/${goalId}`).expect(401);
    });
  });

  describe("PUT /goals/:id", () => {
    it("deve atualizar uma meta com sucesso", async () => {
      const updateData = {
        title: "Viagem para Europa Atualizada",
        description: "Atualização da descrição",
        targetAmount: 12000,
      };

      const response = await request(app)
        .put(`/goals/${goalId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.targetAmount).toBe(
        updateData.targetAmount.toString()
      );
    });

    it("deve permitir atualização parcial", async () => {
      const updateData = {
        title: "Apenas título atualizado",
      };

      const response = await request(app)
        .put(`/goals/${goalId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.title).toBe(updateData.title);
    });

    it("deve permitir desativar meta", async () => {
      // Criar uma meta para desativar
      const goalData = {
        title: "Meta para desativar",
        targetAmount: 1000,
        targetDate: "2025-12-31",
      };

      const createResponse = await request(app)
        .post("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(goalData);

      const idToDeactivate = createResponse.body.data.id;

      const updateData = {
        isActive: false,
      };

      const response = await request(app)
        .put(`/goals/${idToDeactivate}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.isActive).toBe(false);
    });

    it("deve rejeitar atualização com valor negativo", async () => {
      const updateData = {
        targetAmount: -500,
      };

      const response = await request(app)
        .put(`/goals/${goalId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("deve rejeitar atualização de meta inexistente", async () => {
      const updateData = {
        title: "Teste",
      };

      await request(app)
        .put("/goals/invalid-id-999")
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });

    it("deve rejeitar atualização sem autenticação", async () => {
      const updateData = {
        title: "Teste",
      };

      await request(app).put(`/goals/${goalId}`).send(updateData).expect(401);
    });

    it("não deve permitir atualizar meta de outro usuário", async () => {
      // Criar outro usuário
      const otherUserData = {
        name: "Other User Update",
        email: `otherupdate${Date.now()}@test.com`,
        password: "password123",
      };

      const otherUserResponse = await request(app)
        .post("/auth/sign-up")
        .send(otherUserData);

      const otherToken = otherUserResponse.body.data.accessToken;

      const updateData = {
        title: "Tentativa de atualização",
      };

      const response = await request(app)
        .put(`/goals/${goalId}`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send(updateData);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /goals/:id/add-amount", () => {
    it("deve adicionar valor à meta com sucesso", async () => {
      const addAmountData = {
        amount: 500,
      };

      const response = await request(app)
        .post(`/goals/${goalId}/add-amount`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(addAmountData)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("currentAmount");
      expect(Number(response.body.data.currentAmount)).toBeGreaterThanOrEqual(
        500
      );
    });

    it("deve aceitar valores decimais", async () => {
      const addAmountData = {
        amount: 250.75,
      };

      const response = await request(app)
        .post(`/goals/${goalId}/add-amount`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(addAmountData)
        .expect(200);

      expect(response.body).toHaveProperty("data");
    });

    it("deve rejeitar valor negativo", async () => {
      const addAmountData = {
        amount: -100,
      };

      const response = await request(app)
        .post(`/goals/${goalId}/add-amount`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(addAmountData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("deve rejeitar meta inexistente", async () => {
      const addAmountData = {
        amount: 100,
      };

      await request(app)
        .post("/goals/invalid-id-999/add-amount")
        .set("Authorization", `Bearer ${authToken}`)
        .send(addAmountData)
        .expect(404);
    });

    it("deve rejeitar sem autenticação", async () => {
      const addAmountData = {
        amount: 100,
      };

      await request(app)
        .post(`/goals/${goalId}/add-amount`)
        .send(addAmountData)
        .expect(401);
    });

    it("deve atualizar progresso após adicionar valor", async () => {
      // Buscar estado atual
      const beforeResponse = await request(app)
        .get(`/goals/${goalId}`)
        .set("Authorization", `Bearer ${authToken}`);

      const currentAmountBefore = Number(
        beforeResponse.body.data.currentAmount || 0
      );

      // Adicionar valor
      const addAmountData = {
        amount: 1000,
      };

      await request(app)
        .post(`/goals/${goalId}/add-amount`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(addAmountData);

      // Verificar estado depois
      const afterResponse = await request(app)
        .get(`/goals/${goalId}`)
        .set("Authorization", `Bearer ${authToken}`);

      const currentAmountAfter = Number(afterResponse.body.data.currentAmount);

      expect(currentAmountAfter).toBeGreaterThan(currentAmountBefore);
      expect(currentAmountAfter).toBe(currentAmountBefore + 1000);
    });
  });

  describe("DELETE /goals/:id", () => {
    it("deve deletar uma meta com sucesso", async () => {
      // Criar uma meta para deletar
      const goalData = {
        title: "Meta para deletar",
        targetAmount: 500,
        targetDate: "2025-12-31",
      };

      const createResponse = await request(app)
        .post("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(goalData);

      const idToDelete = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/goals/${idToDelete}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
    });

    it("deve rejeitar deleção de meta inexistente", async () => {
      await request(app)
        .delete("/goals/invalid-id-999")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });

    it("deve rejeitar deleção sem autenticação", async () => {
      await request(app).delete(`/goals/${goalId}`).expect(401);
    });

    it("não deve permitir deletar meta de outro usuário", async () => {
      // Criar outro usuário
      const otherUserData = {
        name: "Other User Delete",
        email: `otherdelete${Date.now()}@test.com`,
        password: "password123",
      };

      const otherUserResponse = await request(app)
        .post("/auth/sign-up")
        .send(otherUserData);

      const otherToken = otherUserResponse.body.data.accessToken;

      const response = await request(app)
        .delete(`/goals/${goalId}`)
        .set("Authorization", `Bearer ${otherToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty("error");
    });

    it("deve verificar se meta foi realmente deletada", async () => {
      // Criar e deletar meta
      const goalData = {
        title: "Verificar deleção",
        targetAmount: 300,
        targetDate: "2025-12-31",
      };

      const createResponse = await request(app)
        .post("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(goalData);

      const idToDelete = createResponse.body.data.id;

      // Deletar
      await request(app)
        .delete(`/goals/${idToDelete}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      // Tentar buscar meta deletada - deveria não encontrar na lista
      const listResponse = await request(app)
        .get("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const deletedGoal = listResponse.body.data.find(
        (g: any) => g.id === idToDelete
      );
      expect(deletedGoal).toBeUndefined();
    });
  });

  describe("Goal Progress and Milestones", () => {
    let progressGoalId: string;

    beforeAll(async () => {
      // Criar meta para testes de progresso
      const goalData = {
        title: "Meta de Progresso",
        targetAmount: 1000,
        targetDate: "2025-12-31",
      };

      const response = await request(app)
        .post("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(goalData);

      progressGoalId = response.body.data.id;
    });

    it("deve calcular progresso corretamente", async () => {
      // Adicionar 50% do valor
      await request(app)
        .post(`/goals/${progressGoalId}/add-amount`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ amount: 500 });

      const response = await request(app)
        .get(`/goals/${progressGoalId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.progress.percentage).toBeGreaterThanOrEqual(45);
      expect(response.body.data.progress.percentage).toBeLessThanOrEqual(55);
    });

    it("deve retornar milestones da meta", async () => {
      const response = await request(app)
        .get(`/goals/${progressGoalId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty("milestones");
      expect(Array.isArray(response.body.data.milestones)).toBe(true);
    });

    it("deve marcar milestones como atingidos", async () => {
      // Adicionar valor para atingir milestones
      await request(app)
        .post(`/goals/${progressGoalId}/add-amount`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ amount: 250 });

      const response = await request(app)
        .get(`/goals/${progressGoalId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const reachedMilestones = response.body.data.milestones.filter(
        (m: any) => m.isReached
      );

      expect(reachedMilestones.length).toBeGreaterThan(0);
    });
  });
});
