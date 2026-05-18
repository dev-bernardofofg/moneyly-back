/**
 * Testes unitários para getDashboardPreviewsService (F5).
 * findAllByUserId mockado; heurísticas F3/F4 reais.
 */
import { getDashboardPreviewsService } from "../../../src/services/overview.service";
import { transactionRepository } from "../../../src/repositories/transaction.repository";

jest.mock("../../../src/repositories/transaction.repository");

const txRepo = transactionRepository as jest.Mocked<
  typeof transactionRepository
>;

const USER = "user-123";

const expense = (amount: string, date: Date, title = "Spotify") => ({
  id: "t" + Math.random(),
  type: "expense",
  title,
  amount,
  description: null,
  date,
  periodId: null,
  recurringTransactionId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: { id: "c1", name: "Streaming" },
});

beforeEach(() => jest.clearAllMocks());

describe("getDashboardPreviewsService", () => {
  it("no transactions → nulls and stable signal", async () => {
    txRepo.findAllByUserId.mockResolvedValue([] as never);

    const r = await getDashboardPreviewsService(USER, 1, 31);

    expect(r.subscriptions).toEqual({
      count: 0,
      topMonthlyCost: null,
      topTitle: null,
    });
    expect(r.comparison.signal).toBe("stable");
    expect(r.comparison.deltaPct).toBeNull();
    expect(r.comparison.topHighlight).toBeNull();
  });

  it("detects recurring subscription (top summary)", async () => {
    txRepo.findAllByUserId.mockResolvedValue([
      expense("19.90", new Date("2026-01-10")),
      expense("19.90", new Date("2026-02-10")),
      expense("19.90", new Date("2026-03-10")),
    ] as never);

    const r = await getDashboardPreviewsService(USER, 1, 31);

    expect(r.subscriptions.count).toBeGreaterThanOrEqual(1);
    expect(r.subscriptions.topTitle).toBe("Spotify");
    expect(typeof r.subscriptions.topMonthlyCost).toBe("number");
    expect(["up", "down", "stable"]).toContain(r.comparison.signal);
  });
});
