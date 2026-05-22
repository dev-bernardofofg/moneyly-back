import {
  groupSubscriptionCandidates,
  type SubscriptionCandidate,
} from '../helpers/subscription-detector';
import { transactionRepository } from '../repositories/transaction.repository';
import { requireUser } from '../validations/user.validation';

export const detectSubscriptionsService = async (
  userId: string
): Promise<SubscriptionCandidate[]> => {
  await requireUser(userId);
  const transactions = await transactionRepository.findAllByUserId(userId);
  return groupSubscriptionCandidates(transactions);
};
