/**
 * Testes E2E para fluxo completo de Budgets e Goals
 */

import { expect, test } from "@playwright/test";

const API_BASE_URL = process.env.API_URL || "http://localhost:5000";

test.describe("Fluxo Completo de Budgets e Goals E2E", () => {
  let authToken: string;
  let categoryId: string;
  let budgetId: string;
  let goalId: string;

  // Setup: Criar usuário autenticado e categoria
  test.beforeAll(async ({ request }) => {
    // Criar usuário
    const signUpResponse = await request.post(`${API_BASE_URL}/auth/sign-up`, {
      data: {
        name: "E2E Budget Goals User",
        email: `e2e-budgets-goals-${Date.now()}@test.com`,
        password: "senha123",
      },
    });

    const signUpBody = await signUpResponse.json();
    authToken = signUpBody.data.token;

    // Criar categoria
    const categoryResponse = await request.post(
      `${API_BASE_URL}/categories/create`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          name: `E2E Budget Category ${Date.now()}`,
        },
      }
    );

    const categoryBody = await categoryResponse.json();
    categoryId = categoryBody.data.id;
  });

  // === TESTES DE BUDGETS ===
  test.describe("Budgets", () => {
    test("deve criar um orçamento para uma categoria", async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/budgets/`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          categoryId: categoryId,
          monthlyLimit: 1000,
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("id");
      expect(body.data.monthlyLimit).toBe("1000");

      budgetId = body.data.id;
    });

    test("deve listar orçamentos com progresso", async ({ request }) => {
      // Criar transação para testar progresso
      await request.post(`${API_BASE_URL}/transactions/create`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          type: "expense",
          title: "Gasto no orçamento",
          amount: 250,
          category: categoryId,
          description: "Teste de progresso",
        },
      });

      const response = await request.get(`${API_BASE_URL}/budgets/`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);

      const budget = body.data.find((b: any) => b.id === budgetId);
      expect(budget).toBeDefined();
      expect(budget.spent).toBeGreaterThan(0);
      expect(budget.percentage).toBeGreaterThan(0);
      expect(budget.remaining).toBeLessThan(1000);
      expect(budget.status).toBeDefined();
    });

    test("deve atualizar limite de orçamento", async ({ request }) => {
      const response = await request.put(
        `${API_BASE_URL}/budgets/${budgetId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          data: {
            monthlyLimit: 1500,
          },
        }
      );

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data.monthlyLimit).toBe("1500");
    });

    test("deve deletar orçamento", async ({ request }) => {
      // Criar categoria e orçamento temporários
      const categoryResponse = await request.post(
        `${API_BASE_URL}/categories/create`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          data: {
            name: `Temp Category ${Date.now()}`,
          },
        }
      );

      const catBody = await categoryResponse.json();
      const tempCategoryId = catBody.data.id;

      const budgetResponse = await request.post(`${API_BASE_URL}/budgets/`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          categoryId: tempCategoryId,
          monthlyLimit: 500,
        },
      });

      const budgetBody = await budgetResponse.json();
      const tempBudgetId = budgetBody.data.id;

      // Deletar
      const deleteResponse = await request.delete(
        `${API_BASE_URL}/budgets/${tempBudgetId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(deleteResponse.status()).toBe(200);
      const deleteBody = await deleteResponse.json();

      expect(deleteBody.success).toBe(true);
    });
  });

  // === TESTES DE GOALS ===
  test.describe("Goals", () => {
    test("deve criar uma meta de poupança", async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/goals/`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          title: "Viagem para Europa",
          description: "Férias de verão 2025",
          targetAmount: 10000,
          targetDate: "2025-12-31T00:00:00.000Z",
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty("id");
      expect(body.data.title).toBe("Viagem para Europa");
      expect(body.data.targetAmount).toBe("10000");

      goalId = body.data.id;
    });

    test("deve listar metas do usuário", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/goals/`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);

      // Verificar se meta tem progresso
      const goal = body.data.find((g: any) => g.id === goalId);
      expect(goal).toBeDefined();
      expect(goal.progress).toBeDefined();
      expect(goal.progress).toHaveProperty("percentage");
      expect(goal.progress).toHaveProperty("daysRemaining");
    });

    test("deve buscar meta específica por ID", async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/goals/${goalId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data.id).toBe(goalId);
      expect(body.data.title).toBe("Viagem para Europa");
    });

    test("deve adicionar valor à meta", async ({ request }) => {
      const response = await request.post(
        `${API_BASE_URL}/goals/${goalId}/add-amount`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          data: {
            amount: 500,
          },
        }
      );

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(Number(body.data.currentAmount)).toBeGreaterThanOrEqual(500);
      expect(body.data.progress).toBeDefined();
    });

    test("deve atualizar meta existente", async ({ request }) => {
      const response = await request.put(`${API_BASE_URL}/goals/${goalId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          title: "Viagem para Europa - Atualizada",
          targetAmount: 12000,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data.title).toBe("Viagem para Europa - Atualizada");
      expect(body.data.targetAmount).toBe("12000");
    });

    test("deve permitir desativar meta", async ({ request }) => {
      const response = await request.put(`${API_BASE_URL}/goals/${goalId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          isActive: false,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.data.isActive).toBe(false);
    });

    test("deve deletar meta", async ({ request }) => {
      // Criar meta temporária para deletar
      const createResponse = await request.post(`${API_BASE_URL}/goals/`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          title: "Meta para deletar",
          targetAmount: 500,
          targetDate: "2025-12-31T00:00:00.000Z",
        },
      });

      const createBody = await createResponse.json();
      const tempGoalId = createBody.data.id;

      // Deletar
      const deleteResponse = await request.delete(
        `${API_BASE_URL}/goals/${tempGoalId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(deleteResponse.status()).toBe(200);
      const deleteBody = await deleteResponse.json();

      expect(deleteBody.success).toBe(true);
    });

    test("deve calcular progresso com milestones", async ({ request }) => {
      // Criar nova meta
      const createResponse = await request.post(`${API_BASE_URL}/goals/`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          title: "Meta de Progresso",
          targetAmount: 1000,
          targetDate: "2025-12-31T00:00:00.000Z",
        },
      });

      const createBody = await createResponse.json();
      const progressGoalId = createBody.data.id;

      // Adicionar 50% do valor
      await request.post(`${API_BASE_URL}/goals/${progressGoalId}/add-amount`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          amount: 500,
        },
      });

      // Buscar meta atualizada
      const getResponse = await request.get(
        `${API_BASE_URL}/goals/${progressGoalId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const getBody = await getResponse.json();

      expect(getBody.data.progress.percentage).toBeGreaterThanOrEqual(45);
      expect(getBody.data.progress.percentage).toBeLessThanOrEqual(55);
      expect(getBody.data.milestones).toBeDefined();
      expect(Array.isArray(getBody.data.milestones)).toBe(true);
    });
  });

  // === TESTE DE FLUXO INTEGRADO ===
  test("deve integrar budgets, goals e transações no overview", async ({
    request,
  }) => {
    // Atualizar rendimento mensal
    await request.put(`${API_BASE_URL}/users/monthly-income`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        monthlyIncome: 5000,
      },
    });

    // Buscar overview do planner
    const response = await request.get(`${API_BASE_URL}/overview/planner`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("stats");
    expect(body.data).toHaveProperty("alerts");

    // Verificar stats de planejamento
    expect(body.data.stats).toHaveProperty("totalBudgeted");
    expect(body.data.stats).toHaveProperty("totalSavingsGoal");
    expect(body.data.stats).toHaveProperty("savingsProgress");

    // Verificar alertas
    expect(Array.isArray(body.data.alerts)).toBe(true);
  });
});
