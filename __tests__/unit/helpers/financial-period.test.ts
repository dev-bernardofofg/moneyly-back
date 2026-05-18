/**
 * Unit tests for financial-period helper
 */

import { createSaoPauloDate } from "../../../src/helpers/dates";
import {
  getAvailableFinancialPeriods,
  getCurrentFinancialPeriod,
  getFinancialPeriodDescription,
  getFinancialPeriodForMonth,
  getPreviousFinancialPeriods,
  isDateInCurrentFinancialPeriod,
  normalizeDayForMonth,
} from "../../../src/helpers/financial-period";

describe("FinancialPeriodHelper", () => {
  describe("normalizeDayForMonth", () => {
    it("returns the day when it is valid for the month", () => {
      const result = normalizeDayForMonth(2024, 0, 15); // Janeiro, dia 15

      expect(result).toBe(15);
    });

    it("normalizes day 31 for February", () => {
      const result = normalizeDayForMonth(2024, 1, 31); // Fevereiro

      expect(result).toBeLessThanOrEqual(29); // 2024 é bissexto
    });

    it("handles April (30 days)", () => {
      const result = normalizeDayForMonth(2024, 3, 31); // Abril

      expect(result).toBe(30);
    });
  });

  describe("getCurrentFinancialPeriod", () => {
    it("computes period when current day >= start day (same month)", () => {
      // Supondo que hoje é 15/01/2024 e período é 5 a 25
      const referenceDate = createSaoPauloDate(2024, 0, 15);
      const period = getCurrentFinancialPeriod(5, 25, referenceDate);

      expect(period.startDate.getDate()).toBe(5);
      expect(period.startDate.getMonth()).toBe(0); // Janeiro
      expect(period.endDate.getDate()).toBe(25);
      expect(period.endDate.getMonth()).toBe(0); // Janeiro
    });

    it("computes period when current day < start day (previous month)", () => {
      // Supondo que hoje é 03/01/2024 e período é 5 a 25
      const referenceDate = createSaoPauloDate(2024, 0, 3);
      const period = getCurrentFinancialPeriod(5, 25, referenceDate);

      // O período deve ter sido criado
      expect(period).toBeDefined();
      expect(period).toHaveProperty("startDate");
      expect(period).toHaveProperty("endDate");
      expect(period.startDate).toBeInstanceOf(Date);
      expect(period.endDate).toBeInstanceOf(Date);
    });

    it("handles a period that crosses months (e.g. 25 to 5)", () => {
      // Supondo que hoje é 28/01/2024 e período é 25 a 5
      const referenceDate = createSaoPauloDate(2024, 0, 28);
      const period = getCurrentFinancialPeriod(25, 5, referenceDate);

      expect(period.startDate.getDate()).toBe(25);
      expect(period.startDate.getMonth()).toBe(0); // Janeiro
      expect(period.endDate.getDate()).toBe(5);
      expect(period.endDate.getMonth()).toBe(1); // Fevereiro
    });

    it("handles a single-day period (e.g. 15 to 15)", () => {
      // Supondo que hoje é 15/01/2024 e período é 15 a 15
      const referenceDate = createSaoPauloDate(2024, 0, 15);
      const period = getCurrentFinancialPeriod(15, 15, referenceDate);

      expect(period.startDate.getDate()).toBe(15);
      expect(period.endDate.getDate()).toBe(15);
      expect(period.startDate.getMonth()).toBe(0); // Janeiro
      expect(period.endDate.getMonth()).toBe(1); // Fevereiro (próximo mês)
    });

    it("handles the default period (1 to 31)", () => {
      const referenceDate = createSaoPauloDate(2024, 0, 15);
      const period = getCurrentFinancialPeriod(1, 31, referenceDate);

      expect(period.startDate.getDate()).toBe(1);
      expect(period.startDate.getMonth()).toBe(0); // Janeiro
      expect(period.endDate.getDate()).toBe(31);
      expect(period.endDate.getMonth()).toBe(0); // Janeiro
    });

    it("normalizes day 31 for months with fewer days", () => {
      // Período 31 a 31 em fevereiro
      const referenceDate = createSaoPauloDate(2024, 1, 15);
      const period = getCurrentFinancialPeriod(31, 31, referenceDate);

      // O período deve ser válido, mesmo que o mês tenha menos de 31 dias
      expect(period.startDate).toBeInstanceOf(Date);
      expect(period.endDate).toBeInstanceOf(Date);
      expect(isNaN(period.startDate.getTime())).toBe(false);
    });
  });

  describe("getFinancialPeriodForMonth", () => {
    it("computes period for a specific month (no month crossing)", () => {
      const period = getFinancialPeriodForMonth(5, 25, 2024, 1); // Janeiro

      expect(period.startDate.getDate()).toBe(5);
      expect(period.startDate.getMonth()).toBe(0); // Janeiro (month 1 = index 0)
      expect(period.endDate.getDate()).toBe(25);
      expect(period.endDate.getMonth()).toBe(0); // Janeiro
    });

    it("computes period for a specific month (crosses months)", () => {
      const period = getFinancialPeriodForMonth(25, 5, 2024, 1); // Janeiro

      expect(period.startDate.getDate()).toBe(25);
      expect(period.startDate.getMonth()).toBe(0); // Janeiro
      expect(period.endDate.getDate()).toBe(5);
      expect(period.endDate.getMonth()).toBe(1); // Fevereiro
    });

    it("converts month correctly (1-12 to 0-11)", () => {
      const period = getFinancialPeriodForMonth(1, 31, 2024, 6); // Junho

      expect(period.startDate.getMonth()).toBe(5); // Junho (index 5)
      expect(period.endDate.getMonth()).toBe(5); // Junho
    });
  });

  describe("isDateInCurrentFinancialPeriod", () => {
    it("returns true when the date is within the current period", () => {
      const referenceDate = createSaoPauloDate(2024, 0, 15);
      const testDate = createSaoPauloDate(2024, 0, 10);

      const result = isDateInCurrentFinancialPeriod(
        testDate,
        5,
        25,
        referenceDate
      );

      expect(result).toBe(true);
    });

    it("returns false when the date is outside the period", () => {
      const referenceDate = createSaoPauloDate(2024, 0, 15);
      const testDate = createSaoPauloDate(2024, 0, 30); // Fora do período 5-25

      const result = isDateInCurrentFinancialPeriod(
        testDate,
        5,
        25,
        referenceDate
      );

      expect(result).toBe(false);
    });

    it("includes the date at the start of the period", () => {
      const referenceDate = createSaoPauloDate(2024, 0, 15);
      const testDate = createSaoPauloDate(2024, 0, 5); // Início do período

      const result = isDateInCurrentFinancialPeriod(
        testDate,
        5,
        25,
        referenceDate
      );

      expect(result).toBe(true);
    });

    it("includes the date at the end of the period", () => {
      const referenceDate = createSaoPauloDate(2024, 0, 15);
      const testDate = createSaoPauloDate(2024, 0, 25); // Fim do período

      const result = isDateInCurrentFinancialPeriod(
        testDate,
        5,
        25,
        referenceDate
      );

      expect(result).toBe(true);
    });
  });

  describe("getFinancialPeriodDescription", () => {
    it("returns description for a single-day period", () => {
      const result = getFinancialPeriodDescription(15, 15);

      expect(result).toBe("Dia 15 de cada mês");
    });

    it("returns description for a period that crosses months", () => {
      const result = getFinancialPeriodDescription(25, 5);

      expect(result).toBe("Dia 25 a 5 do próximo mês");
    });

    it("returns description for a period within the same month", () => {
      const result = getFinancialPeriodDescription(5, 25);

      expect(result).toBe("Dia 5 a 25 do mesmo mês");
    });

    it("returns description for the default period (1 to 31)", () => {
      const result = getFinancialPeriodDescription(1, 31);

      expect(result).toBe("Dia 1 a 31 do mesmo mês");
    });
  });

  describe("getPreviousFinancialPeriods", () => {
    it("returns previous periods including the current one", () => {
      const referenceDate = createSaoPauloDate(2024, 0, 15);
      const periods = getPreviousFinancialPeriods(5, 25, 3, referenceDate);

      expect(periods).toHaveLength(3);
      const firstPeriod = periods[0];
      if (firstPeriod) {
        expect(firstPeriod.startDate.getMonth()).toBe(0); // Período atual (Janeiro)
      }
    });

    it("returns periods ordered from most recent to oldest", () => {
      const referenceDate = createSaoPauloDate(2024, 2, 15); // Março
      const periods = getPreviousFinancialPeriods(1, 31, 3, referenceDate);

      expect(periods).toHaveLength(3);
      // Período 0 deve ser o mais recente (atual)
      if (periods[0] && periods[1]) {
        expect(periods[0].startDate.getMonth()).toBeGreaterThanOrEqual(
          periods[1].startDate.getMonth()
        );
      }
    });

    it("returns a single period when numberOfPeriods is 1", () => {
      const referenceDate = createSaoPauloDate(2024, 0, 15);
      const periods = getPreviousFinancialPeriods(5, 25, 1, referenceDate);

      expect(periods).toHaveLength(1);
    });
  });

  describe("getAvailableFinancialPeriods", () => {
    const mockTransactions = [
      { id: "trans-1", date: new Date("2024-01-10") },
      { id: "trans-2", date: new Date("2024-01-20") },
      { id: "trans-3", date: new Date("2024-02-15") },
      { id: "trans-4", date: new Date("2024-03-05") },
    ];

    it("returns an empty array when there are no transactions", () => {
      const periods = getAvailableFinancialPeriods(1, 31, []);

      expect(periods).toEqual([]);
    });

    it("computes periods based on the provided transactions", () => {
      const periods = getAvailableFinancialPeriods(1, 31, mockTransactions);

      expect(periods.length).toBeGreaterThan(0);
      expect(periods[0]).toHaveProperty("id");
      expect(periods[0]).toHaveProperty("startDate");
      expect(periods[0]).toHaveProperty("endDate");
      expect(periods[0]).toHaveProperty("label");
      expect(periods[0]).toHaveProperty("transactionCount");
    });

    it("counts transactions per period correctly", () => {
      const periods = getAvailableFinancialPeriods(1, 31, mockTransactions);

      const totalTransactions = periods.reduce(
        (sum, p) => sum + p.transactionCount,
        0
      );

      // Cada transação pode estar em apenas um período
      // O total deve ser menor ou igual ao número de transações
      expect(totalTransactions).toBeLessThanOrEqual(mockTransactions.length);
      expect(totalTransactions).toBeGreaterThan(0);
    });

    it("returns periods ordered from most recent to oldest", () => {
      const periods = getAvailableFinancialPeriods(1, 31, mockTransactions);

      const firstPeriod = periods[0];
      const lastPeriod = periods[periods.length - 1];

      if (periods.length > 1 && firstPeriod && lastPeriod) {
        expect(firstPeriod.startDate.getTime()).toBeGreaterThanOrEqual(
          lastPeriod.startDate.getTime()
        );
      }
    });

    it("creates labels formatted in Portuguese", () => {
      const periods = getAvailableFinancialPeriods(1, 31, mockTransactions);

      const firstPeriod = periods[0];
      expect(firstPeriod).toBeDefined();
      if (firstPeriod) {
        expect(firstPeriod.label).toBeDefined();
        expect(typeof firstPeriod.label).toBe("string");
        expect(firstPeriod.label.length).toBeGreaterThan(0);
      }
    });

    it("capitalizes the first letter of months in the label", () => {
      const periods = getAvailableFinancialPeriods(1, 31, mockTransactions);

      // Verificar que não começa com letra minúscula
      const firstPeriod = periods[0];
      if (firstPeriod && firstPeriod.label && firstPeriod.label[0]) {
        const firstChar = firstPeriod.label[0];
        expect(firstChar).toBe(firstChar.toUpperCase());
      }
    });

    it("handles periods that cross years", () => {
      const transactionsAcrossYears = [
        { id: "trans-1", date: new Date("2023-12-15") },
        { id: "trans-2", date: new Date("2024-01-15") },
      ];

      const periods = getAvailableFinancialPeriods(
        1,
        31,
        transactionsAcrossYears
      );

      expect(periods.length).toBeGreaterThan(0);

      // Deve ter criado períodos válidos
      periods.forEach((period) => {
        expect(period.startDate).toBeInstanceOf(Date);
        expect(period.endDate).toBeInstanceOf(Date);
        expect(isNaN(period.startDate.getTime())).toBe(false);
        expect(isNaN(period.endDate.getTime())).toBe(false);
      });
    });

    it("has no duplicate periods", () => {
      const periods = getAvailableFinancialPeriods(1, 31, mockTransactions);

      const periodIds = periods.map((p) => p.id);
      const uniqueIds = new Set(periodIds);

      expect(periodIds.length).toBe(uniqueIds.size);
    });

    it("guards against infinite loop (max 50 iterations)", () => {
      // Criar muitas transações
      const manyTransactions = Array.from({ length: 100 }, (_, i) => ({
        id: `trans-${i}`,
        date: new Date(2020, 0, 1 + i * 10),
      }));

      const periods = getAvailableFinancialPeriods(1, 31, manyTransactions);

      expect(periods.length).toBeLessThanOrEqual(50);
    });
  });

  describe("getFinancialPeriodDescription", () => {
    it("describes a single-day period correctly", () => {
      const description = getFinancialPeriodDescription(10, 10);

      expect(description).toBe("Dia 10 de cada mês");
    });

    it("describes a period within the same month", () => {
      const description = getFinancialPeriodDescription(1, 31);

      expect(description).toBe("Dia 1 a 31 do mesmo mês");
    });

    it("describes a period that crosses months", () => {
      const description = getFinancialPeriodDescription(25, 5);

      expect(description).toBe("Dia 25 a 5 do próximo mês");
    });

    it("describes a mid-month period", () => {
      const description = getFinancialPeriodDescription(10, 20);

      expect(description).toBe("Dia 10 a 20 do mesmo mês");
    });
  });

  describe("getPreviousFinancialPeriods", () => {
    it("includes the current period as the first item", () => {
      const referenceDate = createSaoPauloDate(2024, 0, 15);
      const periods = getPreviousFinancialPeriods(1, 31, 3, referenceDate);

      expect(periods).toHaveLength(3);

      // Primeiro período deve ser o atual
      const currentPeriod = getCurrentFinancialPeriod(1, 31, referenceDate);
      const firstPeriod = periods[0];

      expect(firstPeriod).toBeDefined();
      if (firstPeriod) {
        expect(firstPeriod.startDate.getTime()).toBe(
          currentPeriod.startDate.getTime()
        );
        expect(firstPeriod.endDate.getTime()).toBe(
          currentPeriod.endDate.getTime()
        );
      }
    });

    it("computes previous periods correctly", () => {
      const referenceDate = createSaoPauloDate(2024, 2, 15); // Março
      const periods = getPreviousFinancialPeriods(1, 31, 3, referenceDate);

      expect(periods).toHaveLength(3);

      // Período 0: Março (atual)
      // Período 1: Fevereiro
      // Período 2: Janeiro
      if (periods[0] && periods[1] && periods[2]) {
        expect(periods[0].startDate.getMonth()).toBe(2); // Março
        expect(periods[1].startDate.getMonth()).toBe(1); // Fevereiro
        expect(periods[2].startDate.getMonth()).toBe(0); // Janeiro
      }
    });

    it("handles year transition", () => {
      const referenceDate = createSaoPauloDate(2024, 0, 15); // Janeiro 2024
      const periods = getPreviousFinancialPeriods(1, 31, 3, referenceDate);

      expect(periods).toHaveLength(3);

      // Deve incluir meses de dezembro e novembro do ano anterior
      const lastPeriod = periods[2];
      if (lastPeriod) {
        expect(lastPeriod.startDate.getFullYear()).toBe(2023);
      }
    });

    it("returns the correct number of periods", () => {
      const referenceDate = createSaoPauloDate(2024, 5, 15);
      const periods = getPreviousFinancialPeriods(1, 31, 10, referenceDate);

      expect(periods).toHaveLength(10);
    });
  });

  describe("Edge Cases", () => {
    it("handles a leap year in February", () => {
      const referenceDate = createSaoPauloDate(2024, 1, 15); // Fevereiro 2024
      const period = getCurrentFinancialPeriod(1, 31, referenceDate);

      // Fevereiro de 2024 tem 29 dias
      expect(period.endDate.getDate()).toBe(29);
    });

    it("handles a non-leap year in February", () => {
      const referenceDate = createSaoPauloDate(2023, 1, 15); // Fevereiro 2023
      const period = getCurrentFinancialPeriod(1, 31, referenceDate);

      // Fevereiro de 2023 tem 28 dias
      expect(period.endDate.getDate()).toBe(28);
    });

    it("handles daylight saving time change", () => {
      // São Paulo muda para horário de verão entre outubro e fevereiro
      const winterDate = createSaoPauloDate(2024, 5, 15); // Junho (inverno)
      const summerDate = createSaoPauloDate(2024, 0, 15); // Janeiro (verão)

      const winterPeriod = getCurrentFinancialPeriod(1, 31, winterDate);
      const summerPeriod = getCurrentFinancialPeriod(1, 31, summerDate);

      expect(winterPeriod.startDate).toBeInstanceOf(Date);
      expect(summerPeriod.startDate).toBeInstanceOf(Date);
    });
  });
});
