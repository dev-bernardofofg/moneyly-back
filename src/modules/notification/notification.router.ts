import { Router } from 'express';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  registerDevice,
  unregisterDevice,
} from './notification.controller';
import { authenticateUser } from '@modules/auth/middlewares/auth';
import { validateBody, validateParams, validateQuery } from '@core/middlewares/validate';
import { idParamSchema } from '@core/schemas/id-param.schema';
import { notificationQuerySchema } from './schemas/notification.schema';
import { deviceFidParamSchema, registerDeviceSchema } from './schemas/device-registration.schema';

const NotificationRouter: Router = Router();

NotificationRouter.use(authenticateUser);

NotificationRouter.get('/', validateQuery(notificationQuerySchema), getNotifications);

NotificationRouter.patch('/read-all', markAllNotificationsRead);

// Push (FCM): registro do device do usuário logado
NotificationRouter.post('/devices', validateBody(registerDeviceSchema), registerDevice);

NotificationRouter.delete('/devices/:fid', validateParams(deviceFidParamSchema), unregisterDevice);

NotificationRouter.patch('/:id/read', validateParams(idParamSchema), markNotificationRead);

export { NotificationRouter };
