import {
  groupSubscriptionCandidates,
  type SubscriptionCandidate,
} from '../helpers/subscription-detector';
import { transactionRepository } from '../repositories/transaction.repository';
import type { ITransactionRepository } from '../repositories/interfaces/ITransactionRepository';
import { requireUser } from '../validations/user.validation';

export interface SubscriptionServiceDeps {
  transactionRepository: Pick<ITransactionRepository, 'findAllByUserId'>;
  requireUser: typeof requireUser;
}

export const makeSubscriptionService = (deps: SubscriptionServiceDeps) => {
  const { transactionRepository, requireUser } = deps;

  const detect = async (userId: string): Promise<SubscriptionCandidate[]> => {
    await requireUser(userId);
    const transactions = await transactionRepository.findAllByUserId(userId);
    return groupSubscriptionCandidates(transactions);
  };

  return { detect };
};

// Composition root: instância default com os singletons reais.
export const subscriptionService = makeSubscriptionService({
  transactionRepository,
  requireUser,
});
