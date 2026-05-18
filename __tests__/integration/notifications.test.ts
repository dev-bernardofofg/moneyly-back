/**
 * Integração F2 — notificações.
 */
import request from "supertest";
import { app } from "../../src/server";

describe("Notification Endpoints (F2)", () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app).post("/auth/sign-up").send({
      name: "Notif User",
      email: `notif${Date.now()}@test.com`,
      password: "password123",
    });
    token = res.body.data.accessToken;
  });

  describe("GET /notifications", () => {
    it("401 without token", async () => {
      await request(app).get("/notifications").expect(401);
    });

    it("200 paginated (empty for new user)", async () => {
      const r = await request(app)
        .get("/notifications")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(r.body).toHaveProperty("success", true);
      expect(Array.isArray(r.body.data)).toBe(true);
      expect(r.body).toHaveProperty("pagination");
    });

    it("accepts ?unreadOnly=true", async () => {
      const r = await request(app)
        .get("/notifications?unreadOnly=true")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(r.body.data)).toBe(true);
    });
  });

  describe("PATCH /notifications/read-all", () => {
    it("200 with updatedCount", async () => {
      const r = await request(app)
        .patch("/notifications/read-all")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(r.body.data).toHaveProperty("updatedCount");
      expect(typeof r.body.data.updatedCount).toBe("number");
    });

    it("401 without token", async () => {
      await request(app).patch("/notifications/read-all").expect(401);
    });
  });

  describe("PATCH /notifications/:id/read", () => {
    it("404 for nonexistent id", async () => {
      await request(app)
        .patch("/notifications/00000000-0000-0000-0000-000000000000/read")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("404 for malformed id (invalid uuid)", async () => {
      await request(app)
        .patch("/notifications/not-a-uuid/read")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });
  });
});
