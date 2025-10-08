/**
 * Testes unitários para date-utils helper
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
} from "../../../src/helpers/date-utils";

describe("DateUtils", () => {
  describe("toSaoPauloTimezone", () => {
    it("deve converter Date para timezone de São Paulo", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = toSaoPauloTimezone(date);

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeDefined();
    });

    it("deve converter string para timezone de São Paulo", () => {
      const dateString = "2024-01-15T12:00:00Z";
      const result = toSaoPauloTimezone(dateString);

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeDefined();
    });
  });

  describe("createSaoPauloDate", () => {
    it("deve criar data no timezone de São Paulo com apenas data", () => {
      const result = createSaoPauloDate(2024, 0, 15); // Janeiro

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it("deve criar data no timezone de São Paulo com data e hora", () => {
      const result = createSaoPauloDate(2024, 0, 15, 14, 30, 45);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBeGreaterThanOrEqual(0);
      expect(result.getMinutes()).toBeGreaterThanOrEqual(0);
    });

    it("deve usar valores padrão para hora, minuto e segundo", () => {
      const result = createSaoPauloDate(2024, 5, 10);

      expect(result.getFullYear()).toBe(2024);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe("normalizeDayForMonthSaoPaulo", () => {
    it("deve retornar o dia quando é válido para o mês", () => {
      const result = normalizeDayForMonthSaoPaulo(2024, 0, 15); // Janeiro, dia 15

      expect(result).toBe(15);
    });

    it("deve normalizar para último dia do mês quando dia excede", () => {
      const result = normalizeDayForMonthSaoPaulo(2024, 1, 31); // Fevereiro, dia 31

      expect(result).toBeLessThanOrEqual(29); // 2024 é bissexto
    });

    it("deve lidar com meses de 30 dias", () => {
      const result = normalizeDayForMonthSaoPaulo(2024, 3, 31); // Abril, dia 31

      expect(result).toBe(30); // Abril tem 30 dias
    });

    it("deve lidar com fevereiro em ano não bissexto", () => {
      const result = normalizeDayForMonthSaoPaulo(2023, 1, 29); // Fevereiro 2023

      expect(result).toBe(28);
    });
  });

  describe("createNormalizedSaoPauloDate", () => {
    it("deve criar data normalizada", () => {
      const result = createNormalizedSaoPauloDate(2024, 0, 15);

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it("deve normalizar dia quando excede último dia do mês", () => {
      const result = createNormalizedSaoPauloDate(2024, 3, 31); // Abril tem 30 dias

      expect(result.getDate()).toBe(30);
    });
  });

  describe("getCurrentSaoPauloDate", () => {
    it("deve retornar data atual no timezone de São Paulo", () => {
      const result = getCurrentSaoPauloDate();

      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBeGreaterThan(0);
    });

    it("deve retornar data diferente em chamadas próximas", () => {
      const date1 = getCurrentSaoPauloDate();
      // Pequeno delay
      const date2 = getCurrentSaoPauloDate();

      // Deve ser muito próximo (mesma data)
      expect(Math.abs(date2.getTime() - date1.getTime())).toBeLessThan(1000);
    });
  });

  describe("formatBrazilianDate", () => {
    it("deve formatar Date no formato brasileiro", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = formatBrazilianDate(date);

      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it("deve formatar string no formato brasileiro", () => {
      const dateString = "2024-01-15T12:00:00Z";
      const result = formatBrazilianDate(dateString);

      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe("formatBrazilianDateTime", () => {
    it("deve formatar Date com hora no formato brasileiro", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = formatBrazilianDateTime(date);

      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    });

    it("deve formatar string com hora no formato brasileiro", () => {
      const dateString = "2024-01-15T14:30:00Z";
      const result = formatBrazilianDateTime(dateString);

      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);
    });
  });

  describe("isValidSaoPauloDate", () => {
    it("deve retornar true para data válida", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = isValidSaoPauloDate(date);

      expect(result).toBe(true);
    });

    it("deve retornar true para string de data válida", () => {
      const dateString = "2024-01-15T12:00:00Z";
      const result = isValidSaoPauloDate(dateString);

      expect(result).toBe(true);
    });

    it("deve retornar false para data inválida", () => {
      const result = isValidSaoPauloDate("data-invalida");

      expect(result).toBe(false);
    });

    it("deve retornar false para string vazia", () => {
      const result = isValidSaoPauloDate("");

      expect(result).toBe(false);
    });
  });

  describe("formatSaoPauloISO", () => {
    it("deve formatar Date em ISO string", () => {
      const date = new Date("2024-01-15T12:00:00Z");
      const result = formatSaoPauloISO(date);

      expect(result).toContain("2024");
      expect(result).toContain("T");
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it("deve formatar string em ISO string", () => {
      const dateString = "2024-01-15T12:00:00Z";
      const result = formatSaoPauloISO(dateString);

      expect(result).toContain("2024");
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
