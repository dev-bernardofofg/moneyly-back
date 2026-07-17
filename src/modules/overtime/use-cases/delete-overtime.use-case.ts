import { transactionRepository } from '../../transaction/repositories/transaction.repository';
import { HttpError } from '../../../core/errors/http-error';
import { overtimeRepository } from '../repositories/overtime.repository';
import { validateOvertimeOwnership } from '../validations/overtime.validation';

export const deleteOvertimeUseCase = async (id: string, userId: string) => {
  const existing = await validateOvertimeOwnership(id, userId);

  if (existing.transactionId) {
    await transactionRepository.delete(existing.transactionId, userId);
  }

  const deleted = await overtimeRepository.delete(id, userId);
  if (!deleted) throw new HttpError(404, 'Registro de hora extra não encontrado');
  return deleted;
};
