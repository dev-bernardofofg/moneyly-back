import { Router } from 'express';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notification.controller';
import { authenticateUser } from '../auth/middlewares/auth';
import { validateParams, validateQuery } from '../../core/middlewares/validate';
import { idParamSchema } from '../../core/schemas/id-param.schema';
import { notificationQuerySchema } from './schemas/notification.schema';

const NotificationRouter: Router = Router();

NotificationRouter.use(authenticateUser);

NotificationRouter.get('/', validateQuery(notificationQuerySchema), getNotifications);

NotificationRouter.patch('/read-all', markAllNotificationsRead);

NotificationRouter.patch('/:id/read', validateParams(idParamSchema), markNotificationRead);

export { NotificationRouter };
