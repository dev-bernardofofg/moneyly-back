import { transactionRepository } from '@modules/transaction/repositories/transaction.repository';
import { requireUser } from '@modules/user';
import {
  groupSubscriptionCandidates,
  type SubscriptionCandidate,
} from '../helpers/subscription-detector';

export const detectSubscriptionsUseCase = async (
  userId: string
): Promise<SubscriptionCandidate[]> => {
  await requireUser(userId);
  const transactions = await transactionRepository.findAllByUserId(userId);
  return groupSubscriptionCandidates(transactions);
};
