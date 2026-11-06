/**
 * Integration tests for GET /overview/forecast and the real-money freeBalance contract.
 * Dates are relative to today so the suite does not depend on the current month.
 */

import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { spDayString, spMidnightOf, spMidnightPlusDays, spParts } from '@core/helpers/dates';
import { db } from '@infra/db';
import {
  accounts,
  cardBillPayments,
  companies,
  overtimeRecords,
  recurringTransactions,
  transactions,
  transfers,
} from '@infra/db/schema';
import { invoiceDueDate } from '@modules/account/helpers/billing-date';
import { calculateNextExecution } from '@modules/recurring-transaction/helpers/execution-dates';
import { overtimeMonthForSalary } from '@modules/recurring-transaction/helpers/occurrences';
import { app } from '../../src/server';
import { currentPeriod } from '../setup/period-anchor';

const CLOSING_DAY = 28;

const dayOffset = (days: number) => {
  const { year, month, day } = spParts(new Date());
  return spMidnightPlusDays(year, month, day, days);
};

const addDays = (date: Date, days: number) => {
  const { year, month, day } = spParts(date);
  return spMidnightPlusDays(year, month, day, days);
};

const zeroFreeBalance = {
  total: 0,
  components: { accountsBalance: 0, otherIncome: 0, recurringExpense: 0, cardBills: 0 },
  committedAfter: 0,
};

describe('GET /overview/forecast', () => {
  let token: string;
  let userId: string;
  let categoryId: string;
  let defaultAccountId: string;
  let cardCount = 0;
  let accountCount = 0;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  const getFreeBalance = async () => {
    const res = await request(app).get('/overview/forecast').set(auth()).expect(200);
    expect(Object.keys(res.body.data)).toEqual(['freeBalance']);
    return res.body.data.freeBalance;
  };

  const setOpeningBalance = (accountId: string, openingBalance: number, date = dayOffset(0)) =>
    request(app)
      .put(`/accounts/${accountId}`)
      .set(auth())
      .send({ openingBalance, openingBalanceDate: spDayString(date) })
      .expect(200);

  const setDataThrough = (accountId: string, dataThrough: Date) =>
    db.update(accounts).set({ dataThrough }).where(eq(accounts.id, accountId));

  const addChecking = async (openingBalance?: number) => {
    const res = await request(app)
      .post('/accounts')
      .set(auth())
      .send({ type: 'checking', name: `Conta ${++accountCount}` })
      .expect(201);
    const id = res.body.data.id as string;
    if (openingBalance !== undefined) await setOpeningBalance(id, openingBalance);
    return id;
  };

  const addCard = async (dueDay: number, closingDay = CLOSING_DAY) => {
    const res = await request(app)
      .post('/accounts')
      .set(auth())
      .send({ type: 'credit_card', name: `Cartão ${++cardCount}`, closingDay, dueDay })
      .expect(201);
    return { id: res.body.data.id as string, dueDay, closingDay };
  };

  const purchaseOnBill = async (
    card: { id: string; dueDay: number; closingDay: number },
    due: Date,
    amount: number
  ) => {
    const date = Array.from({ length: 120 }, (_, index) => dayOffset(index - 60)).find(
      (candidate) =>
        invoiceDueDate(candidate, card.closingDay, card.dueDay).getTime() === due.getTime()
    );
    await request(app)
      .post('/transactions/create')
      .set(auth())
      .send({
        type: 'expense',
        title: 'Compra',
        amount,
        category: categoryId,
        date: spDayString(date!),
        accountId: card.id,
      })
      .expect(201);
  };

  const addRecurrence = (data: {
    type: 'income' | 'expense';
    amount: number;
    nextExecution: Date;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    accountId?: string;
    startDate?: Date;
  }) =>
    db.insert(recurringTransactions).values({
      userId,
      categoryId,
      title: 'Recorrente',
      frequency: 'monthly',
      dayOfMonth: spParts(data.nextExecution).day,
      ...data,
    });

  const addSalary = (date: Date, amount = 500000, accountId?: string) =>
    addRecurrence({ type: 'income', amount, nextExecution: date, accountId });

  const addOvertimeIn = async (companyId: string, month: number, year: number) => {
    const start = spMidnightOf(year, month - 1, 15);
    const res = await request(app)
      .post('/overtime')
      .set(auth())
      .send({
        companyId,
        startTime: start.toISOString(),
        endTime: new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      })
      .expect(201);
    return res.body.data.amount as number;
  };

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/sign-up')
      .send({
        name: 'Forecast',
        email: `forecast-${Date.now()}@test.com`,
        password: 'password123',
      });
    token = res.body.data.accessToken;
    const category = await request(app)
      .post('/categories/create')
      .set(auth())
      .send({ name: `Forecast Category ${Date.now()}` });
    categoryId = category.body.data.id;
    const list = await request(app).get('/accounts').set(auth()).expect(200);
    defaultAccountId = list.body.data[0].id;
    userId = list.body.data[0].userId;
  });

  // /auth/sign-up tem limite de 10 por processo: um usuário só, com os dados limpos a cada caso.
  beforeEach(async () => {
    await db.delete(cardBillPayments).where(eq(cardBillPayments.userId, userId));
    await db.delete(transfers).where(eq(transfers.userId, userId));
    await db.delete(transactions).where(eq(transactions.userId, userId));
    await db.delete(overtimeRecords).where(eq(overtimeRecords.userId, userId));
    await db.delete(companies).where(eq(companies.userId, userId));
    await db.delete(recurringTransactions).where(eq(recurringTransactions.userId, userId));
    await db
      .delete(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.isDefault, false)));
    await db
      .update(accounts)
      .set({ openingBalance: 0, openingBalanceDate: null, dataThrough: null })
      .where(eq(accounts.userId, userId));
  });

  it('requires authentication', async () => {
    await request(app).get('/overview/forecast').expect(401);
  });

  it('computes the free balance until the next salary', async () => {
    const salaryDate = dayOffset(10);
    const billDue = dayOffset(5);
    const { year, month, day: dueDay } = spParts(billDue);

    await setOpeningBalance(defaultAccountId, 100000);
    await addSalary(salaryDate);
    await addRecurrence({ type: 'income', amount: 15000, nextExecution: dayOffset(4) });
    await addRecurrence({ type: 'expense', amount: 20000, nextExecution: dayOffset(3) });
    await addRecurrence({
      type: 'expense',
      amount: 3000,
      nextExecution: dayOffset(2),
      frequency: 'weekly',
    });
    await addRecurrence({
      type: 'expense',
      amount: 7000,
      nextExecution: salaryDate,
      frequency: 'yearly',
    });

    const card = await addCard(dueDay);
    await purchaseOnBill(card, billDue, 40000);
    await purchaseOnBill(card, spMidnightOf(year, month + 1, dueDay), 25000);

    const company = await request(app)
      .post('/companies')
      .set(auth())
      .send({ name: 'Forecast Co', hourlyRate: 4000 })
      .expect(201);
    const overtime = overtimeMonthForSalary(salaryDate);
    const lastMonthHours = await addOvertimeIn(company.body.data.id, overtime.month, overtime.year);
    const earlier = overtimeMonthForSalary(
      new Date(Date.UTC(overtime.year, overtime.month - 1, 15))
    );
    await addOvertimeIn(company.body.data.id, earlier.month, earlier.year);

    const freeBalance = await getFreeBalance();

    const recurringInWindow = 20000 + 2 * 3000;
    expect(freeBalance).toEqual({
      total: 100000 + 15000 - recurringInWindow - 40000,
      until: salaryDate.toISOString(),
      confidence: 'medium',
      components: {
        accountsBalance: 100000,
        otherIncome: 15000,
        recurringExpense: recurringInWindow,
        cardBills: 40000,
      },
      nextPayment: {
        date: salaryDate.toISOString(),
        salary: 500000,
        overtime: lastMonthHours,
        total: 500000 + lastMonthHours,
      },
      committedAfter: 25000,
    });
  });

  const addPassedSalary = (passed: Date) => {
    const next = calculateNextExecution('monthly', spParts(passed).day, null, passed);
    return addRecurrence({
      type: 'income',
      amount: 500000,
      nextExecution: next,
      startDate: dayOffset(-120),
    }).then(() => next);
  };

  it('keeps a passed salary as other income until the statement covers it', async () => {
    await setOpeningBalance(defaultAccountId, 10000, dayOffset(-20));
    await setDataThrough(defaultAccountId, dayOffset(-10));
    const next = await addPassedSalary(dayOffset(-3));

    const freeBalance = await getFreeBalance();

    expect(freeBalance.components.otherIncome).toBe(500000);
    expect(freeBalance.total).toBe(510000);
    expect(freeBalance.until).toBe(next.toISOString());
    expect(freeBalance.nextPayment.date).toBe(next.toISOString());
  });

  it('does not count a passed salary already covered by the statement', async () => {
    await setOpeningBalance(defaultAccountId, 10000, dayOffset(-20));
    await setDataThrough(defaultAccountId, dayOffset(-1));
    await addPassedSalary(dayOffset(-3));

    const freeBalance = await getFreeBalance();

    expect(freeBalance.components.otherIncome).toBe(0);
    expect(freeBalance.total).toBe(10000);
  });

  it('does not count what the informed balance already contains', async () => {
    await setOpeningBalance(defaultAccountId, 10000);
    await setDataThrough(defaultAccountId, dayOffset(-2));
    await addPassedSalary(dayOffset(-1));

    const freeBalance = await getFreeBalance();

    expect(freeBalance.components.otherIncome).toBe(0);
    expect(freeBalance.total).toBe(10000);
  });

  it('counts a salary dated today when the statement stops earlier', async () => {
    await setOpeningBalance(defaultAccountId, 10000, dayOffset(-20));
    await setDataThrough(defaultAccountId, dayOffset(-3));
    const next = await addPassedSalary(dayOffset(0));

    const freeBalance = await getFreeBalance();

    expect(freeBalance.components.otherIncome).toBe(500000);
    expect(freeBalance.until).toBe(next.toISOString());
  });

  it('treats an event exactly on data through as covered', async () => {
    await setDataThrough(defaultAccountId, dayOffset(-2));
    await addSalary(dayOffset(10));
    await addRecurrence({
      type: 'expense',
      amount: 1000,
      nextExecution: dayOffset(-2),
      frequency: 'yearly',
    });
    await addRecurrence({
      type: 'expense',
      amount: 2000,
      nextExecution: dayOffset(-1),
      frequency: 'yearly',
    });

    expect((await getFreeBalance()).components.recurringExpense).toBe(2000);
  });

  it('uses the real first date of a salary that starts in the future', async () => {
    const start = dayOffset(70);
    await addRecurrence({
      type: 'income',
      amount: 500000,
      nextExecution: start,
      startDate: start,
    });

    const freeBalance = await getFreeBalance();

    expect(freeBalance.until).toBe(start.toISOString());
    expect(freeBalance.nextPayment.date).toBe(start.toISOString());
    expect(freeBalance.components.otherIncome).toBe(0);
  });

  it('predicts a recurrence with a future start only from that start', async () => {
    await addSalary(dayOffset(10));
    await addRecurrence({
      type: 'expense',
      amount: 1000,
      nextExecution: dayOffset(40),
      startDate: dayOffset(40),
    });

    const freeBalance = await getFreeBalance();

    expect(freeBalance.components.recurringExpense).toBe(0);
  });

  it('predicts only what comes after today when the account has no statement', async () => {
    await setOpeningBalance(defaultAccountId, 10000);
    await addSalary(dayOffset(10));
    await addRecurrence({
      type: 'expense',
      amount: 999,
      nextExecution: dayOffset(-2),
      frequency: 'yearly',
    });
    await addRecurrence({
      type: 'expense',
      amount: 111,
      nextExecution: dayOffset(0),
      frequency: 'yearly',
    });

    expect((await getFreeBalance()).components.recurringExpense).toBe(0);
  });

  it('uses the data through of the account of each recurrence', async () => {
    const otherId = await addChecking();
    await setDataThrough(defaultAccountId, dayOffset(-5));
    await setDataThrough(otherId, dayOffset(-1));
    await addSalary(dayOffset(10));

    const passed = dayOffset(-2);
    // accountId null vai para a conta padrão, ainda sem extrato nessa data.
    await addRecurrence({
      type: 'expense',
      amount: 1000,
      nextExecution: passed,
      frequency: 'yearly',
    });
    await addRecurrence({
      type: 'expense',
      amount: 2000,
      nextExecution: passed,
      frequency: 'yearly',
      accountId: otherId,
    });

    expect((await getFreeBalance()).components.recurringExpense).toBe(1000);
  });

  it('does not predict occurrences before the recurrence started', async () => {
    await setDataThrough(defaultAccountId, dayOffset(-40));
    await addSalary(dayOffset(3));
    await addRecurrence({
      type: 'expense',
      amount: 1000,
      nextExecution: dayOffset(6),
      frequency: 'weekly',
      startDate: dayOffset(-1),
    });

    expect((await getFreeBalance()).components.recurringExpense).toBe(1000);
  });

  it('leaves an account without opening balance out of the sum, with low confidence', async () => {
    await addChecking(5000);
    await addSalary(dayOffset(10));

    const freeBalance = await getFreeBalance();

    expect(freeBalance.components.accountsBalance).toBe(5000);
    expect(freeBalance.confidence).toBe('low');
  });

  it('ignores an overdue bill and counts a bill due today', async () => {
    await addSalary(dayOffset(10));
    const overdue = await addCard(spParts(dayOffset(-1)).day);
    await purchaseOnBill(overdue, dayOffset(-1), 40000);
    const dueToday = await addCard(spParts(dayOffset(0)).day);
    await purchaseOnBill(dueToday, dayOffset(0), 7000);

    const freeBalance = await getFreeBalance();

    expect(freeBalance.components.cardBills).toBe(7000);
    expect(freeBalance.total).toBe(-7000);
  });

  describe('overdue bill and statement coverage', () => {
    const overdueBill = async (days = 1) => {
      await addSalary(dayOffset(10));
      // Fecha uma semana antes de vencer: a compra da fatura cai sempre perto do vencimento.
      const card = await addCard(spParts(dayOffset(-days)).day, spParts(dayOffset(-days - 7)).day);
      await purchaseOnBill(card, dayOffset(-days), 40000);
      return card;
    };

    it('counts it while the statement stops before the due date', async () => {
      await overdueBill();
      await setDataThrough(defaultAccountId, dayOffset(-2));

      expect((await getFreeBalance()).components.cardBills).toBe(40000);
    });

    it('drops it once the statement reaches today', async () => {
      await overdueBill();
      await setDataThrough(defaultAccountId, dayOffset(0));

      expect((await getFreeBalance()).components.cardBills).toBe(0);
    });

    it('drops it when the statement stops exactly on the due date', async () => {
      await overdueBill();
      await setDataThrough(defaultAccountId, dayOffset(-1));

      expect((await getFreeBalance()).components.cardBills).toBe(0);
    });

    it('uses the informed balance as coverage too', async () => {
      await overdueBill();
      await setDataThrough(defaultAccountId, dayOffset(-5));
      await setOpeningBalance(defaultAccountId, 0, dayOffset(0));

      expect((await getFreeBalance()).components.cardBills).toBe(0);
    });

    it('takes the most recent coverage among checking accounts', async () => {
      await overdueBill();
      await setDataThrough(defaultAccountId, dayOffset(-5));
      await setDataThrough(await addChecking(), dayOffset(0));

      expect((await getFreeBalance()).components.cardBills).toBe(0);
    });

    it('ignores the coverage of a card', async () => {
      const card = await overdueBill();
      await setDataThrough(defaultAccountId, dayOffset(-2));
      await setDataThrough(card.id, dayOffset(0));

      expect((await getFreeBalance()).components.cardBills).toBe(40000);
    });

    it('finds a bill from a period that already ended', async () => {
      await overdueBill(40);
      await setDataThrough(defaultAccountId, dayOffset(-45));

      expect((await getFreeBalance()).components.cardBills).toBe(40000);
    });

    it('ignores a paid bill', async () => {
      const card = await overdueBill();
      await setDataThrough(defaultAccountId, dayOffset(-2));
      await request(app)
        .post(`/accounts/${card.id}/bill-payment`)
        .set(auth())
        .send({ dueDate: spDayString(dayOffset(-1)) })
        .expect(200);

      expect((await getFreeBalance()).components.cardBills).toBe(0);
    });
  });

  it('ignores a paid bill', async () => {
    const due = dayOffset(5);
    await addSalary(dayOffset(10));
    const card = await addCard(spParts(due).day);
    await purchaseOnBill(card, due, 40000);
    await request(app)
      .post(`/accounts/${card.id}/bill-payment`)
      .set(auth())
      .send({ dueDate: spDayString(due) })
      .expect(200);

    expect((await getFreeBalance()).components.cardBills).toBe(0);
  });

  it('treats a bill due on the salary day as committed after', async () => {
    const salaryDate = dayOffset(10);
    await addSalary(salaryDate);
    const card = await addCard(spParts(salaryDate).day);
    await purchaseOnBill(card, salaryDate, 40000);

    const freeBalance = await getFreeBalance();

    expect(freeBalance.components.cardBills).toBe(0);
    expect(freeBalance.committedAfter).toBe(40000);
  });

  it('adds nothing for a card without transactions', async () => {
    await addSalary(dayOffset(10));
    await addCard(spParts(dayOffset(5)).day);

    const freeBalance = await getFreeBalance();

    expect(freeBalance.components.cardBills).toBe(0);
    expect(freeBalance.committedAfter).toBe(0);
  });

  describe('card recurrences', () => {
    const charge = dayOffset(2);
    const due = dayOffset(5);
    const dueDay = spParts(due).day;
    const closingDay = Array.from({ length: 31 }, (_, index) => index + 1).find(
      (candidate) => invoiceDueDate(charge, candidate, dueDay).getTime() === due.getTime()
    )!;

    const addCardRecurrence = async () => {
      const card = await addCard(dueDay, closingDay);
      await addRecurrence({
        type: 'expense',
        amount: 5590,
        nextExecution: charge,
        frequency: 'yearly',
        accountId: card.id,
      });
    };

    it('adds to the bill due before the salary, not to recurring expenses', async () => {
      await addSalary(dayOffset(6));
      await addCardRecurrence();

      const freeBalance = await getFreeBalance();

      expect(freeBalance.components).toMatchObject({ recurringExpense: 0, cardBills: 5590 });
      expect(freeBalance.committedAfter).toBe(0);
      expect(freeBalance.total).toBe(-5590);
    });

    it('commits the amount after the salary when the bill is due later', async () => {
      await addSalary(dayOffset(3));
      await addCardRecurrence();

      const freeBalance = await getFreeBalance();

      expect(freeBalance.components).toMatchObject({ recurringExpense: 0, cardBills: 0 });
      expect(freeBalance.committedAfter).toBe(5590);
    });

    it('stays out when the charge falls after the window', async () => {
      await addSalary(charge);
      await addCardRecurrence();

      const freeBalance = await getFreeBalance();

      expect(freeBalance.components).toMatchObject({ recurringExpense: 0, cardBills: 0 });
      expect(freeBalance.committedAfter).toBe(0);
    });
  });

  it('ends at the period end, included, for a user without salary', async () => {
    const period = await currentPeriod(app, token);
    const end = new Date(period.endDate);
    await setDataThrough(defaultAccountId, dayOffset(-1));
    await addRecurrence({ type: 'expense', amount: 1000, nextExecution: end, frequency: 'yearly' });
    await addRecurrence({
      type: 'expense',
      amount: 2000,
      nextExecution: addDays(end, 1),
      frequency: 'yearly',
    });

    const freeBalance = await getFreeBalance();

    expect(freeBalance.until).toBe(end.toISOString());
    expect(freeBalance.nextPayment).toBeNull();
    expect(freeBalance.components.recurringExpense).toBe(1000);
    expect(freeBalance.confidence).toBe('low');
  });

  it('does not change the total with a transfer between accounts', async () => {
    const otherId = await addChecking(100000);
    await setOpeningBalance(defaultAccountId, 50000);
    const before = await getFreeBalance();

    await request(app)
      .post('/transfers')
      .set(auth())
      .send({
        fromAccountId: otherId,
        toAccountId: defaultAccountId,
        amount: 30000,
        date: spDayString(dayOffset(0)),
      })
      .expect(201);

    const after = await getFreeBalance();
    expect(after.components.accountsBalance).toBe(150000);
    expect(after.total).toBe(before.total);
  });

  it('is high with fresh accounts, opening balance and salary, medium with a stale one', async () => {
    const card = await addCard(10);
    await setOpeningBalance(defaultAccountId, 1000);
    await setDataThrough(defaultAccountId, dayOffset(-1));
    await setDataThrough(card.id, dayOffset(-1));
    await addSalary(dayOffset(10));

    expect((await getFreeBalance()).confidence).toBe('high');

    await setDataThrough(card.id, dayOffset(-8));
    expect((await getFreeBalance()).confidence).toBe('medium');
  });

  it('ignores the periodId query', async () => {
    const res = await request(app)
      .get('/overview/forecast')
      .set(auth())
      .query({ periodId: 'not-a-uuid' })
      .expect(200);

    expect(res.body.data.freeBalance).toEqual(await getFreeBalance());
  });

  it('returns zeros for a user without data', async () => {
    const period = await currentPeriod(app, token);

    expect(await getFreeBalance()).toEqual({
      ...zeroFreeBalance,
      until: new Date(period.endDate).toISOString(),
      confidence: 'low',
      nextPayment: null,
    });
  });
});
