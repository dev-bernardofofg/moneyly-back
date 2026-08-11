import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging as getAdminMessaging, type Messaging } from 'firebase-admin/messaging';
import { env } from '@core/config/env';
import { logger } from '@core/lib/logger';

const APP_NAME = 'moneyly-push';

export const isPushEnabled = (): boolean =>
  Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);

let cachedMessaging: Messaging | null = null;

const getPushApp = (): App => {
  const existing = getApps().find((app) => app.name === APP_NAME);
  if (existing) return existing;

  return initializeApp(
    {
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY,
      }),
    },
    APP_NAME
  );
};

export const getMessaging = (): Messaging | null => {
  if (!isPushEnabled()) return null;
  if (cachedMessaging) return cachedMessaging;

  try {
    cachedMessaging = getAdminMessaging(getPushApp());
    return cachedMessaging;
  } catch (error) {
    logger.error('[push] falha ao inicializar o Firebase Admin', error as Error);
    return null;
  }
};
