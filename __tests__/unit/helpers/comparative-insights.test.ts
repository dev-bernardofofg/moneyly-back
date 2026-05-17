import {
  buildComparison,
  type ComparativePeriod,
} from "../../../src/helpers/comparative-insights";

type Tx = Parameters<typeof buildComparison>[0][number];

const tx = (over: Partial<Tx>): Tx =>
  ({
    id: "t",
    type: "expense",
    title: "x",
    amount: "100",
    description: null,
    date: new Date("2026-03-15"),
    periodId: null,
    recurringTransactionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { id: "c1", name: "Restaurante" },
    ...over,
  }) as Tx;

const periods: ComparativePeriod[] = [
  { startDate: new Date("2026-03-01"), endDate: new Date("2026-03-31"), label: "Mar" },
  { startDate: new Date("2026-02-01"), endDate: new Date("2026-02-28"), label: "Fev" },
  { startDate: new Date("2026-01-01"), endDate: new Date("2026-01-31"), label: "Jan" },
];

describe("buildComparison", () => {
  it("alta de categoria → signal up + deltaPct", () => {
    const r = buildComparison(
      [
        tx({ date: new Date("2026-03-15"), amount: "140" }), // current
        tx({ date: new Date("2026-02-15"), amount: "100" }), // prev
        tx({ date: new Date("2026-01-15"), amount: "100" }), // prev
      ],
      periods
    );
    const cat = r.byCategory[0]!;
    expect(cat.currentExpense).toBe(140);
    expect(cat.averageExpense).toBe(100);
    expect(cat.deltaPct).toBe(40);
    expect(cat.signal).toBe("up");
    expect(r.highlights[0]).toContain("Restaurante");
  });

  it("categoria nova (sem histórico) → deltaPct null", () => {
    const r = buildComparison(
      [tx({ date: new Date("2026-03-10"), amount: "50" })],
      periods
    );
    expect(r.byCategory[0]!.deltaPct).toBeNull();
    expect(r.byCategory[0]!.signal).toBe("stable");
    expect(r.byCategory[0]!.message).toContain("Novo gasto");
  });

  it("variação <10% → stable", () => {
    const r = buildComparison(
      [
        tx({ date: new Date("2026-03-15"), amount: "105" }),
        tx({ date: new Date("2026-02-15"), amount: "100" }),
        tx({ date: new Date("2026-01-15"), amount: "100" }),
      ],
      periods
    );
    expect(r.byCategory[0]!.signal).toBe("stable");
    expect(r.highlights).toHaveLength(0);
  });

  it("sem períodos → vazio seguro", () => {
    const r = buildComparison([tx({})], []);
    expect(r.totals.deltaPct).toBeNull();
    expect(r.byCategory).toEqual([]);
    expect(r.highlights).toEqual([]);
  });
});
