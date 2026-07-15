import { markNotificationReadUseCase } from '../../../../../src/modules/notification/use-cases/mark-notification-read.use-case';
import { notificationRepository } from '../../../../../src/modules/notification/repositories/notification.repository';
import { HttpError } from '../../../../../src/validations/errors';

jest.mock('../../../../../src/modules/notification/repositories/notification.repository');

const mockedRepo = notificationRepository as jest.Mocked<typeof notificationRepository>;

const USER = '11111111-1111-1111-1111-111111111111';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('markNotificationReadUseCase', () => {
  it('not found → HttpError 404', async () => {
    mockedRepo.markRead.mockResolvedValue(null);
    await expect(markNotificationReadUseCase('x', USER)).rejects.toThrow(HttpError);
  });

  it('returns updated notification on success', async () => {
    mockedRepo.markRead.mockResolvedValue({ id: 'n1', isRead: true } as never);
    const result = await markNotificationReadUseCase('n1', USER);
    expect(result).toMatchObject({ id: 'n1', isRead: true });
  });
});
