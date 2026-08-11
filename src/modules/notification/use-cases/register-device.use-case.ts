import { deviceRegistrationRepository } from '../repositories/device-registration.repository';

/**
 * Registra (ou renova) o FID do dispositivo para o usuário logado.
 * O front chama isso sempre que o SDK emite um FID — inclusive em rotações.
 */
export const registerDeviceUseCase = async (
  userId: string,
  fid: string,
  userAgent?: string
): Promise<{ registered: true }> => {
  await deviceRegistrationRepository.upsert(userId, fid, userAgent);
  return { registered: true };
};
