/**
 * Testes E2E para fluxo de autenticação
 */

import { expect, test } from "@playwright/test";

const API_BASE_URL = process.env.API_URL || "http://localhost:5000";

test.describe("Fluxo de Autenticação E2E", () => {
  const testEmail = `e2e-auth-${Date.now()}@test.com`;
  const testPassword = "senha123";
  let authToken: string;

  test("deve permitir cadastro completo de novo usuário", async ({
    request,
  }) => {
    // Criar novo usuário
    const response = await request.post(`${API_BASE_URL}/auth/sign-up`, {
      data: {
        name: "E2E Test User",
        email: testEmail,
        password: testPassword,
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();

    expect(body).toHaveProperty("success", true);
    expect(body.data).toHaveProperty("user");
    expect(body.data).toHaveProperty("token");
    expect(body.data.user.email).toBe(testEmail);
    expect(body.data.user.name).toBe("E2E Test User");

    authToken = body.data.token;
  });

  test("deve rejeitar cadastro com email duplicado", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/sign-up`, {
      data: {
        name: "Duplicate User",
        email: testEmail, // Email já cadastrado no teste anterior
        password: "senha123",
      },
    });

    expect(response.status()).toBe(409); // Conflict
    const body = await response.json();

    expect(body).toHaveProperty("success", false);
    expect(body).toHaveProperty("error");
  });

  test("deve fazer login com credenciais válidas", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/sign-in`, {
      data: {
        email: testEmail,
        password: testPassword,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body).toHaveProperty("success", true);
    expect(body.data).toHaveProperty("user");
    expect(body.data).toHaveProperty("token");
    expect(body.data.user.email).toBe(testEmail);
  });

  test("deve rejeitar login com credenciais inválidas", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/sign-in`, {
      data: {
        email: testEmail,
        password: "senha-errada",
      },
    });

    expect(response.status()).toBe(401); // Unauthorized
    const body = await response.json();

    expect(body).toHaveProperty("success", false);
  });

  test("deve rejeitar acesso a rotas protegidas sem token", async ({
    request,
  }) => {
    const response = await request.get(`${API_BASE_URL}/transactions/summary`);

    expect(response.status()).toBe(401); // Unauthorized
  });

  test("deve permitir acesso a rotas protegidas com token válido", async ({
    request,
  }) => {
    const response = await request.get(`${API_BASE_URL}/transactions/summary`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(body).toHaveProperty("success", true);
  });

  test("deve validar campos obrigatórios no cadastro", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/sign-up`, {
      data: {
        // Faltando campos obrigatórios
        name: "Test",
      },
    });

    expect(response.status()).toBe(400); // Bad Request
    const body = await response.json();

    expect(body).toHaveProperty("success", false);
  });

  test("deve validar formato de email no cadastro", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/sign-up`, {
      data: {
        name: "Test User",
        email: "email-invalido",
        password: "senha123",
      },
    });

    expect(response.status()).toBe(400); // Bad Request
    const body = await response.json();

    expect(body).toHaveProperty("success", false);
  });

  test("deve validar tamanho mínimo da senha", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/auth/sign-up`, {
      data: {
        name: "Test User",
        email: `short-pass-${Date.now()}@test.com`,
        password: "123", // Menos de 6 caracteres
      },
    });

    expect(response.status()).toBe(400); // Bad Request
    const body = await response.json();

    expect(body).toHaveProperty("success", false);
  });
});


