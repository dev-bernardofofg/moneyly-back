import { toSaoPauloTimezone } from "../helpers/date-utils";
import { TransactionRepository } from "../repositories/transaction.repository";
import { validateCategoryExistsForUser } from "../validations/transaction.validation";

interface ITransaction {
  type: "income" | "expense";
  title: string;
  amount: string;
  category: string;
  description: string;
  date: Date;
}

export const createTransactionService = async (
  userId: string,
  transaction: ITransaction
) => {
  // Validar se a categoria existe e pertence ao usuário
  await validateCategoryExistsForUser(transaction.category, userId);

  const newTransaction = await TransactionRepository.create({
    userId,
    type: transaction.type,
    title: transaction.title,
    amount: transaction.amount,
    categoryId: transaction.category,
    description: transaction.description,
    date: transaction.date
      ? toSaoPauloTimezone(transaction.date)
      : toSaoPauloTimezone(new Date()),
  });

  return newTransaction;
};

export const updateTransactionService = async (
  id: string,
  userId: string,
  updateData: Partial<{
    type: "income" | "expense";
    title: string;
    amount: string;
    categoryId: string;
    description: string;
    date: Date;
  }>
) => {
  // Se uma nova categoria está sendo definida, validar se ela existe e pertence ao usuário
  if (updateData.categoryId) {
    await validateCategoryExistsForUser(updateData.categoryId, userId);
  }

  // Se uma nova data está sendo definida, aplicar timezone
  if (updateData.date) {
    updateData.date = toSaoPauloTimezone(updateData.date);
  }

  const transaction = await TransactionRepository.update(
    id,
    userId,
    updateData
  );

  if (!transaction) {
    throw new Error(
      "Transação não encontrada. Verifique se o ID está correto e se você tem permissão para acessá-la."
    );
  }

  return transaction;
};
