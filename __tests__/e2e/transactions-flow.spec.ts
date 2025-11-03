/**
 * Testes E2E para fluxo completo de transações
 */

import { expect, test } from "@playwright/test";

const API_BASE_URL = process.env.API_URL || "http://localhost:5000";

test.describe("Fluxo Completo de Transações E2E", () => {
  let authToken: string;
  let categoryId: string;
  let transactionId: string;

  // Setup: Criar usuário, fazer login e criar categoria
  test.beforeAll(async ({ request }) => {
    // Criar usuário
    const signUpResponse = await request.post(`${API_BASE_URL}/auth/sign-up`, {
      data: {
        name: "E2E Transaction User",
        email: `e2e-transactions-${Date.now()}@test.com`,
        password: "senha123",
      },
    });

    const signUpBody = await signUpResponse.json();
    authToken = signUpBody.data.token;

    // Criar categoria para usar nas transações
    const categoryResponse = await request.post(
      `${API_BASE_URL}/categories/create`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          name: `E2E Category ${Date.now()}`,
        },
      }
    );

    const categoryBody = await categoryResponse.json();
    categoryId = categoryBody.data.id;
  });

  test("deve criar uma transação de despesa", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/transactions/create`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        type: "expense",
        title: "Supermercado",
        amount: 250.5,
        category: categoryId,
        description: "Compras da semana",
        date: new Date().toISOString(),
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("id");
    expect(body.data.type).toBe("expense");
    expect(body.data.title).toBe("Supermercado");
    expect(body.data.amount).toBe("250.5");

    transactionId = body.data.id;
  });

  test("deve criar uma transação de receita", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/transactions/create`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        type: "income",
        title: "Salário",
        amount: 5000,
        category: categoryId,
        description: "Salário mensal",
        date: new Date().toISOString(),
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.type).toBe("income");
    expect(body.data.amount).toBe("5000");
  });

  test("deve listar transações do usuário", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/transactions/`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        page: 1,
        limit: 10,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("data");
    expect(body.data).toHaveProperty("pagination");
    expect(Array.isArray(body.data.data)).toBe(true);
    expect(body.data.data.length).toBeGreaterThan(0);
  });

  test("deve atualizar uma transação existente", async ({ request }) => {
    const response = await request.put(
      `${API_BASE_URL}/transactions/${transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          title: "Supermercado Atualizado",
          amount: 300,
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.title).toBe("Supermercado Atualizado");
    expect(body.data.amount).toBe("300");
  });

  test("deve buscar resumo de transações", async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/transactions/summary`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("totalIncome");
    expect(body.data).toHaveProperty("totalExpenses");
    expect(body.data).toHaveProperty("balance");
    expect(Number(body.data.totalIncome)).toBeGreaterThan(0);
  });

  test("deve buscar resumo mensal", async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/transactions/summary-by-month`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("deve buscar resumo do período atual", async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/transactions/summary-current-period`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("totalIncome");
    expect(body.data).toHaveProperty("totalExpenses");
  });

  test("deve filtrar transações por data", async ({ request }) => {
    const startDate = new Date("2024-01-01").toISOString();
    const endDate = new Date().toISOString();

    const response = await request.post(`${API_BASE_URL}/transactions/`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        page: 1,
        limit: 10,
        startDate,
        endDate,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data.data).toBeDefined();
  });

  test("deve aplicar paginação corretamente", async ({ request }) => {
    // Criar várias transações para testar paginação
    for (let i = 0; i < 5; i++) {
      await request.post(`${API_BASE_URL}/transactions/create`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          type: "expense",
          title: `Transação ${i + 1}`,
          amount: 10 + i,
          category: categoryId,
          description: `Descrição ${i + 1}`,
        },
      });
    }

    // Buscar com limit de 5
    const response = await request.post(`${API_BASE_URL}/transactions/`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        page: 1,
        limit: 5,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body.data.pagination.limit).toBe(5);
    expect(body.data.data.length).toBeLessThanOrEqual(5);
  });

  test("deve deletar uma transação", async ({ request }) => {
    // Criar transação para deletar
    const createResponse = await request.post(
      `${API_BASE_URL}/transactions/create`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        data: {
          type: "expense",
          title: "Transação para deletar",
          amount: 50,
          category: categoryId,
          description: "Será deletada",
        },
      }
    );

    const createBody = await createResponse.json();
    const idToDelete = createBody.data.id;

    // Deletar
    const deleteResponse = await request.delete(
      `${API_BASE_URL}/transactions/${idToDelete}`,
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

  test("deve validar tipo de transação", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/transactions/create`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        type: "tipo-invalido",
        title: "Teste",
        amount: 100,
        category: categoryId,
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();

    expect(body.success).toBe(false);
  });

  test("deve validar valor positivo", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/transactions/create`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      data: {
        type: "expense",
        title: "Teste",
        amount: -100, // Valor negativo
        category: categoryId,
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();

    expect(body.success).toBe(false);
  });
});


