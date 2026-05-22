/**
 * Integration tests for budget endpoints
 */

import request from 'supertest';
import { app } from '../../src/server';

describe('Budget Endpoints', () => {
  let authToken: string;
  let categoryId: string;
  let budgetId: string;

  beforeAll(async () => {
    const userData = {
      name: 'Test User Budgets',
      email: `budgets${Date.now()}@test.com`,
      password: 'password123',
    };

    const signUpResponse = await request(app).post('/auth/sign-up').send(userData);

    authToken = signUpResponse.body.data.accessToken;

    const categoryResponse = await request(app)
      .post('/categories/create')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: `Budget Category ${Date.now()}` });

    categoryId = categoryResponse.body.data.id;
  });

  describe('POST /budgets/', () => {
    it('creates a budget successfully', async () => {
      const budgetData = {
        categoryId: categoryId,
        monthlyLimit: 1000,
      };

      const response = await request(app)
        .post('/budgets/')
        .set('Authorization', `Bearer ${authToken}`)
        .send(budgetData)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.categoryId).toBe(categoryId);
      expect(response.body.data.monthlyLimit).toBe(budgetData.monthlyLimit.toString());

      // Salvar ID para testes posteriores
      budgetId = response.body.data.id;
    });

    it('rejects creation without authentication', async () => {
      const budgetData = {
        categoryId: categoryId,
        monthlyLimit: 1000,
      };

      await request(app).post('/budgets/').send(budgetData).expect(401);
    });

    it('validates required fields', async () => {
      const response = await request(app)
        .post('/budgets/')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Faltando campos obrigatórios
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('validates that monthlyLimit is positive', async () => {
      const budgetData = {
        categoryId: categoryId,
        monthlyLimit: -100,
      };

      const response = await request(app)
        .post('/budgets/')
        .set('Authorization', `Bearer ${authToken}`)
        .send(budgetData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('rejects invalid categoryId', async () => {
      const budgetData = {
        categoryId: 'invalid-category-id',
        monthlyLimit: 1000,
      };

      const response = await request(app)
        .post('/budgets/')
        .set('Authorization', `Bearer ${authToken}`)
        .send(budgetData);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('accepts decimal values for monthlyLimit', async () => {
      // Criar outra categoria para este teste
      const categoryResponse = await request(app)
        .post('/categories/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: `Decimal Budget ${Date.now()}` });

      const newCategoryId = categoryResponse.body.data.id;

      const budgetData = {
        categoryId: newCategoryId,
        monthlyLimit: 1500.75,
      };

      const response = await request(app)
        .post('/budgets/')
        .set('Authorization', `Bearer ${authToken}`)
        .send(budgetData)
        .expect(201);

      expect(response.body.data.monthlyLimit).toBe('1500.75');
    });
  });

  describe('GET /budgets/', () => {
    it("returns the user's budget list", async () => {
      const response = await request(app)
        .get('/budgets/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('returns budgets with progress information', async () => {
      const response = await request(app)
        .get('/budgets/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const budget = response.body.data[0];
      expect(budget).toHaveProperty('spent');
      expect(budget).toHaveProperty('remaining');
      expect(budget).toHaveProperty('percentage');
      expect(budget).toHaveProperty('status');
      expect(budget).toHaveProperty('category');
    });

    it('returns empty array for user with no budgets', async () => {
      // Criar novo usuário
      const newUserData = {
        name: 'New User',
        email: `newuser${Date.now()}@test.com`,
        password: 'password123',
      };

      const newUserResponse = await request(app).post('/auth/sign-up').send(newUserData);

      const newToken = newUserResponse.body.data.accessToken;

      const response = await request(app)
        .get('/budgets/')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('rejects without authentication', async () => {
      await request(app).get('/budgets/').expect(401);
    });
  });

  describe('PUT /budgets/:id', () => {
    it('updates a budget successfully', async () => {
      const updateData = {
        monthlyLimit: 1500,
      };

      const response = await request(app)
        .put(`/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.monthlyLimit).toBe(updateData.monthlyLimit.toString());
    });

    it('rejects update with negative value', async () => {
      const updateData = {
        monthlyLimit: -500,
      };

      const response = await request(app)
        .put(`/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('rejects update of non-existent budget', async () => {
      const updateData = {
        monthlyLimit: 2000,
      };

      await request(app)
        .put('/budgets/invalid-id-999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });

    it('rejects update without authentication', async () => {
      const updateData = {
        monthlyLimit: 2000,
      };

      await request(app).put(`/budgets/${budgetId}`).send(updateData).expect(401);
    });

    it("does not allow updating another user's budget", async () => {
      // Criar outro usuário
      const otherUserData = {
        name: 'Other User',
        email: `otherbudget${Date.now()}@test.com`,
        password: 'password123',
      };

      const otherUserResponse = await request(app).post('/auth/sign-up').send(otherUserData);

      const otherToken = otherUserResponse.body.data.accessToken;

      const updateData = {
        monthlyLimit: 3000,
      };

      const response = await request(app)
        .put(`/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(updateData);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('accepts decimal values on update', async () => {
      const updateData = {
        monthlyLimit: 2750.5,
      };

      const response = await request(app)
        .put(`/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.monthlyLimit).toBe('2750.5');
    });
  });

  describe('DELETE /budgets/:id', () => {
    it('deletes a budget successfully', async () => {
      // Criar um orçamento para deletar
      const categoryResponse = await request(app)
        .post('/categories/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: `Delete Budget ${Date.now()}` });

      const deleteCategoryId = categoryResponse.body.data.id;

      const budgetResponse = await request(app)
        .post('/budgets/')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryId: deleteCategoryId,
          monthlyLimit: 500,
        });

      const idToDelete = budgetResponse.body.data.id;

      const response = await request(app)
        .delete(`/budgets/${idToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('rejects deletion of non-existent budget', async () => {
      await request(app)
        .delete('/budgets/invalid-id-999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('rejects deletion without authentication', async () => {
      await request(app).delete(`/budgets/${budgetId}`).expect(401);
    });

    it("does not allow deleting another user's budget", async () => {
      // Criar outro usuário
      const otherUserData = {
        name: 'Other User Delete',
        email: `otherdelete${Date.now()}@test.com`,
        password: 'password123',
      };

      const otherUserResponse = await request(app).post('/auth/sign-up').send(otherUserData);

      const otherToken = otherUserResponse.body.data.accessToken;

      const response = await request(app)
        .delete(`/budgets/${budgetId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('verifies that the budget was actually deleted', async () => {
      // Criar e deletar orçamento
      const categoryResponse = await request(app)
        .post('/categories/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: `Verify Delete ${Date.now()}` });

      const verifyCategoryId = categoryResponse.body.data.id;

      const budgetResponse = await request(app)
        .post('/budgets/')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryId: verifyCategoryId,
          monthlyLimit: 300,
        });

      const idToDelete = budgetResponse.body.data.id;

      // Deletar
      await request(app)
        .delete(`/budgets/${idToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verificar lista de orçamentos
      const listResponse = await request(app)
        .get('/budgets/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deletedBudget = listResponse.body.data.find((b: any) => b.id === idToDelete);
      expect(deletedBudget).toBeUndefined();
    });
  });

  describe('Budget Progress Calculation', () => {
    let testCategoryId: string;
    let testBudgetId: string;

    beforeAll(async () => {
      // Criar categoria e orçamento para testes de progresso
      const categoryResponse = await request(app)
        .post('/categories/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: `Progress Test ${Date.now()}` });

      testCategoryId = categoryResponse.body.data.id;

      const budgetResponse = await request(app)
        .post('/budgets/')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categoryId: testCategoryId,
          monthlyLimit: 1000,
        });

      testBudgetId = budgetResponse.body.data.id;
    });

    it('calculates progress correctly with transactions', async () => {
      // Criar transação de despesa
      await request(app)
        .post('/transactions/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'expense',
          title: 'Test Expense',
          amount: 250,
          category: testCategoryId,
          description: 'Progress test',
        });

      // Buscar orçamentos e verificar progresso
      const response = await request(app)
        .get('/budgets/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const budget = response.body.data.find((b: any) => b.id === testBudgetId);

      expect(budget).toBeDefined();
      expect(budget.spent).toBeGreaterThan(0);
      expect(budget.percentage).toBeGreaterThan(0);
      expect(budget.remaining).toBeLessThan(1000);
    });

    it("marks status as 'safe' when spending is low", async () => {
      const response = await request(app)
        .get('/budgets/')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const budget = response.body.data.find((b: any) => b.id === testBudgetId);

      expect(budget.status).toBe('safe');
    });
  });
});
