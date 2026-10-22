interface ExportRecord {
  hoursWorked: string | number;
  amount: number;
  company: { name: string };
}

export interface OvertimeTotals {
  hours: number;
  amount: number;
  byCompany: { name: string; hours: number; amount: number }[];
}

export const overtimeTotals = (records: ExportRecord[]): OvertimeTotals => {
  const byCompany = new Map<string, { name: string; hours: number; amount: number }>();
  for (const record of records) {
    const entry = byCompany.get(record.company.name) ?? {
      name: record.company.name,
      hours: 0,
      amount: 0,
    };
    entry.hours += Number(record.hoursWorked);
    entry.amount += record.amount;
    byCompany.set(record.company.name, entry);
  }
  const companies = [...byCompany.values()].sort((a, b) => b.amount - a.amount);
  return {
    hours: companies.reduce((total, company) => total + company.hours, 0),
    amount: companies.reduce((total, company) => total + company.amount, 0),
    byCompany: companies,
  };
};

/** 12.5 → "12h 30min"; minutos arredondados (horas vêm com 2 casas). */
export const formatHoursLong = (hours: number): string => {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const min = totalMinutes % 60;
  return min > 0 ? `${h}h ${String(min).padStart(2, '0')}min` : `${h}h`;
};

/** 12.5 → "12,50" (para planilha somar). */
export const formatHoursDecimal = (hours: number): string => hours.toFixed(2).replace('.', ',');

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const periodLabel = (month?: number, year?: number): string =>
  month && year ? `${MONTHS[month - 1]}/${year}` : year ? String(year) : 'Todo o período';
