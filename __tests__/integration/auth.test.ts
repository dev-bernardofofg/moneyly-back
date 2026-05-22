/**
 * Integration tests for auth endpoints
 */

import request from "supertest";
import { app } from "../../src/server";

describe("Auth Endpoints", () => {
  describe("POST /auth/sign-up", () => {
    it("creates a new user", async () => {
      const userData = {
        name: "Test User",
        email: `test${Date.now()}@example.com`,
        password: "password123",
      };

      const response = await request(app)
        .post("/auth/sign-up")
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data).toHaveProperty("accessToken");
      expect(response.body.data).toHaveProperty("refreshToken");
      expect(response.body.data.user.email).toBe(userData.email);
    });

    it("rejects duplicate email", async () => {
      const userData = {
        name: "Test User",
        email: "duplicate@example.com",
        password: "password123",
      };

      await request(app).post("/auth/sign-up").send(userData);

      const response = await request(app)
        .post("/auth/sign-up")
        .send(userData)
        .expect(409);

      expect(response.body).toHaveProperty("error");
    });

    it("validates required fields", async () => {
      const response = await request(app)
        .post("/auth/sign-up")
        .send({
          name: "Test",
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /auth/sign-in", () => {
    it("signs in with valid credentials", async () => {
      const userData = {
        name: "Login Test",
        email: `login${Date.now()}@example.com`,
        password: "password123",
      };

      await request(app).post("/auth/sign-up").send(userData);

      const response = await request(app)
        .post("/auth/sign-in")
        .send({
          email: userData.email,
          password: userData.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("accessToken");
      expect(response.body.data).toHaveProperty("refreshToken");
    });

    it("rejects wrong password", async () => {
      const userData = {
        name: "Wrong Password Test",
        email: `wrongpass${Date.now()}@example.com`,
        password: "correctpassword",
      };

      await request(app).post("/auth/sign-up").send(userData);

      const response = await request(app)
        .post("/auth/sign-in")
        .send({
          email: userData.email,
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body).toHaveProperty("error");
    });
  });
});
