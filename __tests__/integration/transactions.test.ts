/**
 * Integration tests for transaction endpoints
 */

import request from 'supertest';
import { app } from '../../src/server';

describe('Transaction Endpoints', () => {
  let authToken: string;
  let categoryId: string;
  let transactionId: string;

  beforeAll(async () => {
    const userData = {
      name: 'Test User Transactions',
      email: `transactions${Date.now()}@test.com`,
      password: 'password123',
    };

    const signUpResponse = await request(app).post('/auth/sign-up').send(userData);

    authToken = signUpResponse.body.data.accessToken;

    const categoryResponse = await request(app)
      .post('/categories/create')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: `Test Category ${Date.now()}` });

    categoryId = categoryResponse.body.data.id;
  });

  describe('POST /transactions/create', () => {
    it('creates an expense transaction successfully', async () => {
      const transactionData = {
        type: 'expense',
        title: 'Almoço no restaurante',
        amount: 45.5,
        category: categoryId,
        description: 'Almoço de domingo',
        date: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/transactions/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.type).toBe('expense');
      expect(response.body.data.title).toBe(transactionData.title);
      expect(response.body.data.categoryId).toBe(categoryId);

      transactionId = response.body.data.id;
    });

    it('creates an income transaction successfully', async () => {
      const transactionData = {
        type: 'income',
        title: 'Salário',
        amount: 5000,
        category: categoryId,
        description: 'Salário mensal',
        date: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/transactions/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.type).toBe('income');
      expect(response.body.data.amount).toBe('5000');
    });

    it('rejects transaction without authentication', async () => {
      const transactionData = {
        type: 'expense',
        title: 'Teste',
        amount: 100,
        category: categoryId,
        description: 'Descrição',
      };

      await request(app).post('/transactions/create').send(transactionData).expect(401);
    });

    it('validates required fields', async () => {
      const response = await request(app)
        .post('/transactions/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Faltando campos obrigatórios
          type: 'expense',
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('validates transaction type', async () => {
      const transactionData = {
        type: 'invalid-type',
        title: 'Teste',
        amount: 100,
        category: categoryId,
        description: 'Descrição',
      };

      await request(app)
        .post('/transactions/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData)
        .expect(400);
    });

    it('rejects invalid category', async () => {
      const transactionData = {
        type: 'expense',
        title: 'Teste',
        amount: 100,
        category: 'invalid-category-id',
        description: 'Descrição',
      };

      const response = await request(app)
        .post('/transactions/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /transactions/', () => {
    it("returns the user's transaction list", async () => {
      const response = await request(app)
        .get('/transactions/')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });

    it('applies pagination correctly', async () => {
      const response = await request(app)
        .get('/transactions/')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          page: 1,
          limit: 5,
        })
        .expect(200);

      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 5);
      expect(response.body.data.data.length).toBeLessThanOrEqual(5);
    });

    it('filters by period when provided', async () => {
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-01-31').toISOString();

      const response = await request(app)
        .get('/transactions/')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          page: 1,
          limit: 10,
          startDate,
          endDate,
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });
  });

  describe('PUT /transactions/:id', () => {
    it('updates a transaction successfully', async () => {
      const updateData = {
        title: 'Almoço Atualizado',
        amount: 60,
        description: 'Descrição atualizada',
      };

      const response = await request(app)
        .put(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.amount).toBe(updateData.amount.toString());
    });

    it('allows partial update', async () => {
      const updateData = {
        title: 'Apenas título atualizado',
      };

      const response = await request(app)
        .put(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.title).toBe(updateData.title);
    });

    it('rejects update of non-existent transaction', async () => {
      const updateData = {
        title: 'Teste',
      };

      await request(app)
        .put('/transactions/invalid-id-999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });

    it('rejects update without authentication', async () => {
      const updateData = {
        title: 'Teste',
      };

      await request(app).put(`/transactions/${transactionId}`).send(updateData).expect(401);
    });
  });

  describe('GET /transactions/summary', () => {
    it('returns transaction summary', async () => {
      const response = await request(app)
        .get('/transactions/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalIncome');
      expect(response.body.data).toHaveProperty('totalExpenses');
      expect(response.body.data).toHaveProperty('balance');
    });

    it('rejects without authentication', async () => {
      await request(app).get('/transactions/summary').expect(401);
    });
  });

  describe('GET /transactions/summary-by-month', () => {
    it('returns monthly summary', async () => {
      const response = await request(app)
        .get('/transactions/summary-by-month')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /transactions/summary-current-period', () => {
    it('returns current period summary', async () => {
      const response = await request(app)
        .get('/transactions/summary-current-period')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalIncome');
      expect(response.body.data).toHaveProperty('totalExpenses');
    });
  });

  describe('DELETE /transactions/:id', () => {
    it('deletes a transaction successfully', async () => {
      // Criar uma transação para deletar
      const transactionData = {
        type: 'expense',
        title: 'Transação para deletar',
        amount: 50,
        category: categoryId,
        description: 'Será deletada',
      };

      const createResponse = await request(app)
        .post('/transactions/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transactionData);

      const idToDelete = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/transactions/${idToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
    });

    it('rejects deletion of non-existent transaction', async () => {
      await request(app)
        .delete('/transactions/invalid-id-999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('rejects deletion without authentication', async () => {
      await request(app).delete(`/transactions/${transactionId}`).expect(401);
    });

    it("does not allow deleting another user's transaction", async () => {
      // Criar outro usuário
      const otherUserData = {
        name: 'Other User',
        email: `other${Date.now()}@test.com`,
        password: 'password123',
      };

      const otherUserResponse = await request(app).post('/auth/sign-up').send(otherUserData);

      const otherToken = otherUserResponse.body.data.accessToken;

      // Tentar deletar transação do primeiro usuário
      const response = await request(app)
        .delete(`/transactions/${transactionId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });
});
