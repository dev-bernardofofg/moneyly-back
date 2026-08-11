import { deviceRegistrationRepository } from '../repositories/device-registration.repository';

/**
 * Remove o dispositivo (logout ou push desativado pelo usuário).
 * Idempotente: apagar um FID inexistente não é erro.
 */
export const unregisterDeviceUseCase = async (
  userId: string,
  fid: string
): Promise<{ unregistered: true }> => {
  await deviceRegistrationRepository.deleteByFid(userId, fid);
  return { unregistered: true };
};
