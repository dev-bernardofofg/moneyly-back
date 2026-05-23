import { Router } from 'express';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../controllers/notification.controller';
import { authenticateUser } from '../middlewares/auth';
import { validateParams, validateQuery } from '../middlewares/validate';
import { idParamSchema } from '../schemas/auth.schema';
import { notificationQuerySchema } from '../schemas/notification.schema';

const NotificationRouter: Router = Router();

NotificationRouter.use(authenticateUser);

NotificationRouter.get('/', validateQuery(notificationQuerySchema), getNotifications);

NotificationRouter.patch('/read-all', markAllNotificationsRead);

NotificationRouter.patch('/:id/read', validateParams(idParamSchema), markNotificationRead);

export { NotificationRouter };
