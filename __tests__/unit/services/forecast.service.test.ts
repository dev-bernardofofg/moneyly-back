import { getForecastService } from "../../../src/services/forecast.service";
import { financialPeriodService } from "../../../src/services/financial-period.service";
import { transactionRepository } from "../../../src/repositories/transaction.repository";
import { recurringTransactionRepository } from "../../../src/repositories/recurring-transaction.repository";
import { requireUser } from "../../../src/validations/user.validation";
import { HttpError } from "../../../src/validations/errors";

jest.mock("../../../src/services/financial-period.service");
jest.mock("../../../src/repositories/transaction.repository");
jest.mock("../../../src/repositories/recurring-transaction.repository");
jest.mock("../../../src/validations/user.validation");

const mockedPeriodSvc = financialPeriodService as jest.Mocked<
  typeof financialPeriodService
>;
const mockedTxRepo = transactionRepository as jest.Mocked<
  typeof transactionRepository
>;
const mockedRecRepo = recurringTransactionRepository as jest.Mocked<
  typeof recurringTransactionRepository
>;

const USER = "11111111-1111-1111-1111-111111111111";
const day = 86400000;

function periodAround(now: Date) {
  return {
    id: "22222222-2222-2222-2222-222222222222",
    userId: USER,
    startDate: new Date(now.getTime() - 10 * day),
    endDate: new Date(now.getTime() + 10 * day),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (requireUser as jest.Mock).mockResolvedValue({ id: USER });
});

describe("getForecastService", () => {
  it("realized only, no recurrences → zeroed projection", async () => {
    const now = new Date();
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(
      periodAround(now) as never
    );
    mockedTxRepo.findByPeriodId.mockResolvedValue([
      { type: "income", amount: "1000" },
      { type: "expense", amount: "300" },
    ] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([]);

    const r = await getForecastService(USER);

    expect(r.realized).toEqual({ income: 1000, expense: 300, balance: 700 });
    expect(r.projected.recurringIncome).toBe(0);
    expect(r.projected.recurringExpense).toBe(0);
    expect(r.projected.occurrences).toHaveLength(0);
    expect(r.projectedEndBalance).toBe(700);
  });

  it("counts a future recurrence within the period window", async () => {
    const now = new Date();
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(
      periodAround(now) as never
    );
    mockedTxRepo.findByPeriodId.mockResolvedValue([
      { type: "income", amount: "1000" },
    ] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([
      {
        id: "33333333-3333-3333-3333-333333333333",
        title: "Aluguel",
        type: "expense",
        amount: "200",
        frequency: "monthly",
        dayOfMonth: null,
        dayOfWeek: null,
        nextExecution: new Date(now.getTime() + 1 * day),
        totalInstallments: null,
        executedInstallments: 0,
      },
    ] as never);

    const r = await getForecastService(USER);

    expect(r.projected.occurrences).toHaveLength(1);
    expect(r.projected.recurringExpense).toBe(200);
    expect(r.projectedEndBalance).toBe(1000 - 200);
  });

  it("ignores a recurrence with exhausted installments", async () => {
    const now = new Date();
    mockedPeriodSvc.ensureCurrentPeriodExists.mockResolvedValue(
      periodAround(now) as never
    );
    mockedTxRepo.findByPeriodId.mockResolvedValue([] as never);
    mockedRecRepo.findByUserId.mockResolvedValue([
      {
        id: "44444444-4444-4444-4444-444444444444",
        title: "Parcelado",
        type: "expense",
        amount: "50",
        frequency: "monthly",
        dayOfMonth: null,
        dayOfWeek: null,
        nextExecution: new Date(now.getTime() + 1 * day),
        totalInstallments: 3,
        executedInstallments: 3,
      },
    ] as never);

    const r = await getForecastService(USER);
    expect(r.projected.occurrences).toHaveLength(0);
    expect(r.projectedEndBalance).toBe(0);
  });

  it("invalid periodId → HttpError 404", async () => {
    mockedPeriodSvc.getPeriodById.mockResolvedValue(null as never);
    await expect(
      getForecastService(USER, "99999999-9999-9999-9999-999999999999")
    ).rejects.toThrow(HttpError);
  });
});
