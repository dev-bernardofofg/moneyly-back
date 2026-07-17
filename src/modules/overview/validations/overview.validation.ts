import { IAvailablePeriod } from '../../financial-period';
import { HttpError } from '../../../validations/errors';

export const validatePeriodId = (periodId: string, availablePeriods: IAvailablePeriod[]) => {
  const period = availablePeriods.find((p) => p.id === periodId);
  if (!period) {
    throw new HttpError(404, 'Período não encontrado');
  }
};
