/**
 * Testes de integração para autenticação
 */

import request from "supertest";
import { app } from "../../src/server";

describe("Auth Endpoints", () => {
  describe("POST /auth/sign-up", () => {
    it("deve criar um novo usuário", async () => {
      const userData = {
        name: "Test User",
        email: `test${Date.now()}@example.com`,
        password: "password123",
      };

      const response = await request(app)
        .post("/auth/sign-up")
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it("deve rejeitar email duplicado", async () => {
      const userData = {
        name: "Test User",
        email: "duplicate@example.com",
        password: "password123",
      };

      // Primeiro cadastro
      await request(app).post("/auth/sign-up").send(userData);

      // Tentativa de cadastro duplicado
      const response = await request(app)
        .post("/auth/sign-up")
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
    });

    it("deve validar campos obrigatórios", async () => {
      const response = await request(app)
        .post("/auth/sign-up")
        .send({
          name: "Test",
          // email e password faltando
        })
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
    });
  });

  describe("POST /auth/sign-in", () => {
    it("deve fazer login com credenciais válidas", async () => {
      // Primeiro criar usuário
      const userData = {
        name: "Login Test",
        email: `login${Date.now()}@example.com`,
        password: "password123",
      };

      await request(app).post("/auth/sign-up").send(userData);

      // Fazer login
      const response = await request(app)
        .post("/auth/sign-in")
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("token");
    });

    it("deve rejeitar senha incorreta", async () => {
      // Criar usuário primeiro
      const userData = {
        name: "Wrong Password Test",
        email: `wrongpass${Date.now()}@example.com`,
        password: "correctpassword",
      };

      await request(app).post("/auth/sign-up").send(userData);

      // Tentar login com senha incorreta
      const response = await request(app)
        .post("/auth/sign-in")
        .send({
          email: userData.email,
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
    });
  });
});
