export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export interface CreateRecurringTransactionInput {
  type: "income" | "expense";
  title: string;
  amount: string;
  categoryId: string;
  frequency: RecurringFrequency;
  dayOfMonth?: number;
  dayOfWeek?: number;
  description?: string;
  totalInstallments?: number;
  startDate?: Date;
}

export interface UpdateRecurringTransactionInput {
  title?: string;
  amount?: string;
  categoryId?: string;
  frequency?: RecurringFrequency;
  dayOfMonth?: number;
  dayOfWeek?: number;
  description?: string;
  isActive?: boolean;
  totalInstallments?: number;
}
