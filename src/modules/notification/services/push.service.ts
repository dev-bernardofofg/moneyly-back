/**
 * Envio de push via FCM. Stateless, compartilhado pelos use-cases que criam
 * notificações. Nunca lança: push é efeito colateral — falhar aqui não pode
 * derrubar a criação da notificação in-app.
 */
import { getMessaging } from '@infra/firebase';
import { logger } from '@core/lib/logger';
import { deviceRegistrationRepository } from '../repositories/device-registration.repository';

/** Códigos que significam "esse device morreu" — limpamos do banco. */
const DEAD_DEVICE_CODES = new Set([
  'messaging/installation-id-not-registered',
  'messaging/registration-token-not-registered',
  'messaging/invalid-recipient',
  'messaging/invalid-argument',
]);

/** Limite da API de multicast do FCM. */
const FCM_MAX_BATCH_SIZE = 500;

export interface PushPayload {
  title: string;
  body: string;
  /** Rota aberta ao clicar na notificação. */
  url?: string;
  notificationId?: string;
  type?: string;
}

const chunk = <T>(items: T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
};

/**
 * Envia push para todos os devices do usuário.
 *
 * Payload é data-only de propósito: o service worker monta a notificação em
 * `onBackgroundMessage`. Com o bloco `notification` do FCM o browser exibiria
 * sozinho e o SW exibiria de novo — duas notificações para o mesmo evento.
 */
export const sendPushToUser = async (userId: string, payload: PushPayload): Promise<void> => {
  const messaging = getMessaging();
  if (!messaging) {
    logger.warn('[push] skip — Firebase Admin não configurado (FIREBASE_*)');
    return;
  }

  try {
    const devices = await deviceRegistrationRepository.findByUser(userId);
    if (devices.length === 0) {
      logger.warn('[push] skip — nenhum device registrado para o usuário', { userId });
      return;
    }

    const data = {
      title: payload.title,
      body: payload.body,
      url: payload.url ?? '/',
      ...(payload.notificationId ? { notificationId: payload.notificationId } : {}),
      ...(payload.type ? { type: payload.type } : {}),
    };

    const deadFids: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    logger.info('[push] enviando', { userId, devices: devices.length, type: payload.type });

    for (const batch of chunk(
      devices.map((device) => device.fid),
      FCM_MAX_BATCH_SIZE
    )) {
      const response = await messaging.sendEachForMulticast({
        fids: batch,
        data,
        webpush: { headers: { Urgency: 'normal' } },
      });

      successCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach((result, index) => {
        if (!result.error) return;

        const fid = batch[index] as string;
        logger.warn('[push] falha por device', {
          userId,
          fidPrefix: fid.slice(0, 8),
          code: result.error.code,
          message: result.error.message,
        });

        if (DEAD_DEVICE_CODES.has(result.error.code)) {
          deadFids.push(fid);
        }
      });
    }

    if (deadFids.length > 0) {
      await deviceRegistrationRepository.deleteMany(deadFids);
      logger.info('[push] devices inválidos removidos', { count: deadFids.length });
    }

    if (failureCount > 0) {
      logger.warn('[push] envio parcial', { userId, success: successCount, failure: failureCount });
    } else if (successCount > 0) {
      logger.info('[push] enviado', { userId, success: successCount });
    }
  } catch (error) {
    const err = error as Error & { cause?: unknown };
    logger.error('[push] falha ao enviar notificação', err, {
      userId,
      cause: err.cause instanceof Error ? err.cause.message : err.cause,
    });
  }
};
