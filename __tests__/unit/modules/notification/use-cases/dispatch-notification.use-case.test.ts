import { dispatchNotification } from '@modules/notification/use-cases/dispatch-notification.use-case';
import { notificationRepository } from '@modules/notification/repositories/notification.repository';
import { sendPushToUser } from '@modules/notification/services/push.service';

jest.mock('@modules/notification/repositories/notification.repository');
jest.mock('@modules/notification/services/push.service', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(undefined),
}));

const mockedRepo = notificationRepository as jest.Mocked<typeof notificationRepository>;
const mockedPush = sendPushToUser as jest.Mock;

const USER = '11111111-1111-1111-1111-111111111111';
const TX_ID = '22222222-2222-2222-2222-222222222222';
const NOTIF_ID = '33333333-3333-3333-3333-333333333333';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('dispatchNotification', () => {
  it('sends push with url, icon, badge and relatedId', async () => {
    mockedRepo.findByDedupeKey.mockResolvedValue(null);
    mockedRepo.create.mockResolvedValue({
      id: NOTIF_ID,
      userId: USER,
      type: 'transaction_expense',
      title: 'Saída: Almoço',
      message: 'Você registrou uma saída de R$ 45,50.',
      relatedId: TX_ID,
      dedupeKey: `transaction:${TX_ID}`,
    } as never);

    await dispatchNotification({
      userId: USER,
      type: 'transaction_expense',
      severity: 'info',
      title: 'Saída: Almoço',
      message: 'Você registrou uma saída de R$ 45,50.',
      relatedId: TX_ID,
      periodId: null,
      dedupeKey: `transaction:${TX_ID}`,
      isRead: false,
    });

    expect(mockedPush).toHaveBeenCalledWith(
      USER,
      expect.objectContaining({
        url: `/transactions?id=${TX_ID}`,
        icon: '/icons/expense.png',
        badge: '/icons/badge.png',
        relatedId: TX_ID,
        type: 'transaction_expense',
        notificationId: NOTIF_ID,
      })
    );
  });
});
