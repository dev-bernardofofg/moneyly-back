import {
  markNotificationReadService,
  processUserBudgetAlerts,
} from "../../../src/services/notification.service";
import { notificationRepository } from "../../../src/repositories/notification.repository";
import { financialPeriodService } from "../../../src/services/financial-period.service";
import { getBudgetProgressService } from "../../../src/services/budget.service";
import { HttpError } from "../../../src/validations/errors";

jest.mock("../../../src/repositories/notification.repository");
jest.mock("../../../src/services/financial-period.service");
jest.mock("../../../src/services/budget.service");

const mockedRepo = notificationRepository as jest.Mocked<
  typeof notificationRepository
>;
const mockedPeriod = financialPeriodService as jest.Mocked<
  typeof financialPeriodService
>;
const mockedBudget = getBudgetProgressService as jest.Mock;

const USER = "11111111-1111-1111-1111-111111111111";
const PERIOD = { id: "22222222-2222-2222-2222-222222222222" };

const budget = (status: string, id = "b1") => ({
  id,
  monthlyLimit: "100",
  category: { id: "c1", name: "Comida" },
  spent: 0,
  remaining: 0,
  percentage: 100,
  status,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedPeriod.ensureCurrentPeriodExists.mockResolvedValue(PERIOD as never);
});

describe("processUserBudgetAlerts", () => {
  it("cria notificação p/ orçamento excedido (severity danger)", async () => {
    mockedBudget.mockResolvedValue([budget("exceeded")]);
    mockedRepo.findByDedupeKey.mockResolvedValue(null);
    mockedRepo.create.mockResolvedValue({} as never);

    await processUserBudgetAlerts(USER);

    expect(mockedRepo.create).toHaveBeenCalledTimes(1);
    const arg = mockedRepo.create.mock.calls[0]![0];
    expect(arg.severity).toBe("danger");
    expect(arg.dedupeKey).toBe(`budget:b1:${PERIOD.id}:exceeded`);
  });

  it("idempotente: dedupeKey já existe → não cria", async () => {
    mockedBudget.mockResolvedValue([budget("warning")]);
    mockedRepo.findByDedupeKey.mockResolvedValue({ id: "n1" } as never);

    await processUserBudgetAlerts(USER);

    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it("status safe → nenhuma notificação", async () => {
    mockedBudget.mockResolvedValue([budget("safe")]);
    await processUserBudgetAlerts(USER);
    expect(mockedRepo.findByDedupeKey).not.toHaveBeenCalled();
    expect(mockedRepo.create).not.toHaveBeenCalled();
  });

  it("corrida do scheduler: create lança → não propaga", async () => {
    mockedBudget.mockResolvedValue([budget("warning")]);
    mockedRepo.findByDedupeKey.mockResolvedValue(null);
    mockedRepo.create.mockRejectedValue(new Error("unique violation"));

    await expect(processUserBudgetAlerts(USER)).resolves.toBeUndefined();
  });
});

describe("markNotificationReadService", () => {
  it("não encontrada → HttpError 404", async () => {
    mockedRepo.markRead.mockResolvedValue(null);
    await expect(
      markNotificationReadService("x", USER)
    ).rejects.toThrow(HttpError);
  });
});
