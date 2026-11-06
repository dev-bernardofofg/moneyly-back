import { recurringTransactionRepository } from '@modules/recurring-transaction/repositories/recurring-transaction.repository';
import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { requireUser } from '@modules/user';
import {
  excludeActiveRecurring,
  groupSubscriptionCandidates,
  type SubscriptionCandidate,
} from '../helpers/subscription-detector';

export const detectSubscriptionsUseCase = async (
  userId: string
): Promise<SubscriptionCandidate[]> => {
  await requireUser(userId);
  const [transactions, activeRecurring] = await Promise.all([
    transactionRepository.findAllByUserId(userId),
    recurringTransactionRepository.findByUserId(userId),
  ]);
  return excludeActiveRecurring(groupSubscriptionCandidates(transactions), activeRecurring);
};
