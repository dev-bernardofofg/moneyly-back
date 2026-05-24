import { HttpError } from './errors';
import { overtimeRepository } from '../repositories/overtime.repository';
import type { OvertimeWithCompany } from '../repositories/interfaces/IOvertimeRepository';

export async function validateOvertimeOwnership(
  id: string,
  userId: string
): Promise<OvertimeWithCompany> {
  const record = await overtimeRepository.findByIdAndUserId(id, userId);
  if (!record) throw new HttpError(404, 'Registro de hora extra não encontrado');
  return record;
}

export function validateTimeRange(startTime: Date, endTime: Date): void {
  if (endTime <= startTime) {
    throw new HttpError(400, 'endTime deve ser posterior a startTime');
  }
  if (startTime > new Date()) {
    throw new HttpError(400, 'startTime não pode ser no futuro');
  }
}
