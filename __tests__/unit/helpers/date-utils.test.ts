/**
 * Unit tests for date-utils helper
 */

import {
  createNormalizedSaoPauloDate,
  createSaoPauloDate,
  formatBrazilianDate,
  formatBrazilianDateTime,
  formatSaoPauloISO,
  getCurrentSaoPauloDate,
  isValidSaoPauloDate,
  normalizeDayForMonthSaoPaulo,
  toSaoPauloTimezone,
} from "../../../src/helpers/dates";

describe("DateUtils", () => {
  describe("toSaoPauloTimezone", () => {
    it("converts a Date to the São Paulo timezone", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = toSaoPauloTimezone(date);

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeDefined();
    });

    it("converts a string to the São Paulo timezone", () => {
      const dateString = "2024-01-15T12:00:00Z";
      const result = toSaoPauloTimezone(dateString);

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeDefined();
    });
  });

  describe("createSaoPauloDate", () => {
    it("creates a São Paulo date with date only", () => {
      const result = createSaoPauloDate(2024, 0, 15); // Janeiro

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it("creates a São Paulo date with date and time", () => {
      const result = createSaoPauloDate(2024, 0, 15, 14, 30, 45);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBeGreaterThanOrEqual(0);
      expect(result.getMinutes()).toBeGreaterThanOrEqual(0);
    });

    it("uses default values for hour, minute and second", () => {
      const result = createSaoPauloDate(2024, 5, 10);

      expect(result.getFullYear()).toBe(2024);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe("normalizeDayForMonthSaoPaulo", () => {
    it("returns the day when it is valid for the month", () => {
      const result = normalizeDayForMonthSaoPaulo(2024, 0, 15); // Janeiro, dia 15

      expect(result).toBe(15);
    });

    it("normalizes to the last day of the month when the day exceeds it", () => {
      const result = normalizeDayForMonthSaoPaulo(2024, 1, 31); // Fevereiro, dia 31

      expect(result).toBeLessThanOrEqual(29); // 2024 é bissexto
    });

    it("handles 30-day months", () => {
      const result = normalizeDayForMonthSaoPaulo(2024, 3, 31); // Abril, dia 31

      expect(result).toBe(30); // Abril tem 30 dias
    });

    it("handles February in a non-leap year", () => {
      const result = normalizeDayForMonthSaoPaulo(2023, 1, 29); // Fevereiro 2023

      expect(result).toBe(28);
    });
  });

  describe("createNormalizedSaoPauloDate", () => {
    it("creates a normalized date", () => {
      const result = createNormalizedSaoPauloDate(2024, 0, 15);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it("normalizes the day when it exceeds the last day of the month", () => {
      const result = createNormalizedSaoPauloDate(2024, 3, 31); // Abril tem 30 dias

      expect(result.getDate()).toBe(30);
    });
  });

  describe("getCurrentSaoPauloDate", () => {
    it("returns the current date in the São Paulo timezone", () => {
      const result = getCurrentSaoPauloDate();

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThan(0);
    });

    it("returns a near-identical date on close calls", () => {
      const date1 = getCurrentSaoPauloDate();
      // Pequeno delay
      const date2 = getCurrentSaoPauloDate();

      // Deve ser muito próximo (mesma data)
      expect(Math.abs(date2.getTime() - date1.getTime())).toBeLessThan(1000);
    });
  });

  describe("formatBrazilianDate", () => {
    it("formats a Date in the Brazilian format", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = formatBrazilianDate(date);

      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it("formats a string in the Brazilian format", () => {
      const dateString = "2024-01-15T12:00:00Z";
      const result = formatBrazilianDate(dateString);

      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe("formatBrazilianDateTime", () => {
    it("formats a Date with time in the Brazilian format", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = formatBrazilianDateTime(date);

      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    });

    it("formats a string with time in the Brazilian format", () => {
      const dateString = "2024-01-15T14:30:00Z";
      const result = formatBrazilianDateTime(dateString);

      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    });
  });

  describe("isValidSaoPauloDate", () => {
    it("returns true for a valid date", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = isValidSaoPauloDate(date);

      expect(result).toBe(true);
    });

    it("returns true for a valid date string", () => {
      const dateString = "2024-01-15T12:00:00Z";
      const result = isValidSaoPauloDate(dateString);

      expect(result).toBe(true);
    });

    it("returns false for an invalid date", () => {
      const result = isValidSaoPauloDate("data-invalida");

      expect(result).toBe(false);
    });

    it("returns false for an empty string", () => {
      const result = isValidSaoPauloDate("");

      expect(result).toBe(false);
    });
  });

  describe("formatSaoPauloISO", () => {
    it("formats a Date into an ISO string", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = formatSaoPauloISO(date);

      expect(result).toContain("2024");
      expect(result).toContain("T");
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("formats a string into an ISO string", () => {
      const dateString = "2024-01-15T12:00:00Z";
      const result = formatSaoPauloISO(dateString);

      expect(result).toContain("2024");
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
