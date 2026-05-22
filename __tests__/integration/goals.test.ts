/**
 * Integration tests for goal endpoints
 */

import request from "supertest";
import { app } from "../../src/server";

describe("Goal Endpoints", () => {
  let authToken: string;
  let goalId: string;

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
    it("creates a goal successfully", async () => {
      const goalData = {
        title: "Trip to Europe",
        description: "Summer vacation 2025",
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

      goalId = response.body.data.id;
    });

    it("creates a goal without description", async () => {
      const goalData = {
        title: "Emergency Fund",
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

    it("rejects creation without authentication", async () => {
      const goalData = {
        title: "Test",
        targetAmount: 5000,
        targetDate: "2025-12-31",
      };

      await request(app).post("/goals/").send(goalData).expect(401);
    });

    it("validates required fields", async () => {
      const response = await request(app)
        .post("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Title only",
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("validates that targetAmount is positive", async () => {
      const goalData = {
        title: "Invalid Goal",
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

    it("validates date format", async () => {
      const goalData = {
        title: "Goal with invalid date",
        targetAmount: 1000,
        targetDate: "invalid-date",
      };

      const response = await request(app)
        .post("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(goalData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("accepts decimal values for targetAmount", async () => {
      const goalData = {
        title: "Decimal Goal",
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
    it("returns the user's goal list", async () => {
      const response = await request(app)
        .get("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("returns goals with progress information", async () => {
      const response = await request(app)
        .get("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const goal = response.body.data[0];
      expect(goal).toHaveProperty("progress");
      expect(goal.progress).toHaveProperty("percentage");
      expect(goal.progress).toHaveProperty("daysRemaining");
    });

    it("returns only active goals", async () => {
      const response = await request(app)
        .get("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      const inactiveGoals = response.body.data.filter(
        (g: any) => g.isActive === false
      );
      expect(inactiveGoals).toHaveLength(0);
    });

    it("returns empty array for user with no goals", async () => {
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

    it("rejects without authentication", async () => {
      await request(app).get("/goals/").expect(401);
    });
  });

  describe("GET /goals/:id", () => {
    it("returns a specific goal", async () => {
      const response = await request(app)
        .get(`/goals/${goalId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body.data.id).toBe(goalId);
      expect(response.body.data).toHaveProperty("title");
      expect(response.body.data).toHaveProperty("targetAmount");
    });

    it("rejects lookup of non-existent goal", async () => {
      await request(app)
        .get("/goals/invalid-id-999")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });

    it("does not allow fetching another user's goal", async () => {
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

    it("rejects without authentication", async () => {
      await request(app).get(`/goals/${goalId}`).expect(401);
    });
  });

  describe("PUT /goals/:id", () => {
    it("updates a goal successfully", async () => {
      const updateData = {
        title: "Trip to Europe Updated",
        description: "Updated description",
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

    it("allows partial update", async () => {
      const updateData = {
        title: "Title only updated",
      };

      const response = await request(app)
        .put(`/goals/${goalId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.title).toBe(updateData.title);
    });

    it("allows deactivating a goal", async () => {
      const goalData = {
        title: "Goal to deactivate",
        targetAmount: 1000,
        targetDate: "2025-12-31",
      };

      const createResponse = await request(app)
        .post("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(goalData);

      const idToDeactivate = createResponse.body.data.id;

      const response = await request(app)
        .put(`/goals/${idToDeactivate}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ isActive: false })
        .expect(200);

      expect(response.body.data.isActive).toBe(false);
    });

    it("rejects update with negative value", async () => {
      const response = await request(app)
        .put(`/goals/${goalId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ targetAmount: -500 })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("rejects update of non-existent goal", async () => {
      await request(app)
        .put("/goals/invalid-id-999")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ title: "Test" })
        .expect(404);
    });

    it("rejects update without authentication", async () => {
      await request(app)
        .put(`/goals/${goalId}`)
        .send({ title: "Test" })
        .expect(401);
    });

    it("does not allow updating another user's goal", async () => {
      const otherUserData = {
        name: "Other User Update",
        email: `otherupdate${Date.now()}@test.com`,
        password: "password123",
      };

      const otherUserResponse = await request(app)
        .post("/auth/sign-up")
        .send(otherUserData);

      const otherToken = otherUserResponse.body.data.accessToken;

      const response = await request(app)
        .put(`/goals/${goalId}`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ title: "Attempted update" });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /goals/:id/add-amount", () => {
    it("adds amount to goal successfully", async () => {
      const response = await request(app)
        .post(`/goals/${goalId}/add-amount`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ amount: 500 })
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("currentAmount");
      expect(Number(response.body.data.currentAmount)).toBeGreaterThanOrEqual(
        500
      );
    });

    it("accepts decimal values", async () => {
      const response = await request(app)
        .post(`/goals/${goalId}/add-amount`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ amount: 250.75 })
        .expect(200);

      expect(response.body).toHaveProperty("data");
    });

    it("rejects negative value", async () => {
      const response = await request(app)
        .post(`/goals/${goalId}/add-amount`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ amount: -100 })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("rejects non-existent goal", async () => {
      await request(app)
        .post("/goals/invalid-id-999/add-amount")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ amount: 100 })
        .expect(404);
    });

    it("rejects without authentication", async () => {
      await request(app)
        .post(`/goals/${goalId}/add-amount`)
        .send({ amount: 100 })
        .expect(401);
    });

    it("updates progress after adding amount", async () => {
      const beforeResponse = await request(app)
        .get(`/goals/${goalId}`)
        .set("Authorization", `Bearer ${authToken}`);

      const currentAmountBefore = Number(
        beforeResponse.body.data.currentAmount || 0
      );

      await request(app)
        .post(`/goals/${goalId}/add-amount`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ amount: 1000 });

      const afterResponse = await request(app)
        .get(`/goals/${goalId}`)
        .set("Authorization", `Bearer ${authToken}`);

      const currentAmountAfter = Number(afterResponse.body.data.currentAmount);

      expect(currentAmountAfter).toBeGreaterThan(currentAmountBefore);
      expect(currentAmountAfter).toBe(currentAmountBefore + 1000);
    });
  });

  describe("DELETE /goals/:id", () => {
    it("deletes a goal successfully", async () => {
      const goalData = {
        title: "Goal to delete",
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

    it("rejects deletion of non-existent goal", async () => {
      await request(app)
        .delete("/goals/invalid-id-999")
        .set("Authorization", `Bearer ${authToken}`)
        .expect(404);
    });

    it("rejects deletion without authentication", async () => {
      await request(app).delete(`/goals/${goalId}`).expect(401);
    });

    it("does not allow deleting another user's goal", async () => {
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

    it("verifies that the goal was actually deleted", async () => {
      const goalData = {
        title: "Verify deletion",
        targetAmount: 300,
        targetDate: "2025-12-31",
      };

      const createResponse = await request(app)
        .post("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(goalData);

      const idToDelete = createResponse.body.data.id;

      await request(app)
        .delete(`/goals/${idToDelete}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

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
      const goalData = {
        title: "Progress Goal",
        targetAmount: 1000,
        targetDate: "2025-12-31",
      };

      const response = await request(app)
        .post("/goals/")
        .set("Authorization", `Bearer ${authToken}`)
        .send(goalData);

      progressGoalId = response.body.data.id;
    });

    it("calculates progress correctly", async () => {
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

    it("returns goal milestones", async () => {
      const response = await request(app)
        .get(`/goals/${progressGoalId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty("milestones");
      expect(Array.isArray(response.body.data.milestones)).toBe(true);
    });

    it("marks milestones as reached", async () => {
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
