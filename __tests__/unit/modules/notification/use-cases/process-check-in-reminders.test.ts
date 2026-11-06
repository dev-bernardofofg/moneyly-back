import { processCheckInReminders } from '@modules/notification/use-cases/process-check-in-reminders.use-case';
import { dispatchNotification } from '@modules/notification/use-cases/dispatch-notification.use-case';
import { notificationRepository } from '@modules/notification/repositories/notification.repository';
import { accountRepository } from '@modules/account/repositories/account.repository';
import { resolvePushVisual } from '@modules/notification/helpers/push-visual';

jest.mock('@modules/notification/use-cases/dispatch-notification.use-case');
jest.mock('@modules/notification/repositories/notification.repository');
jest.mock('@modules/account/repositories/account.repository');

const mockedDispatch = dispatchNotification as jest.MockedFunction<typeof dispatchNotification>;
const mockedNotificationRepo = notificationRepository as jest.Mocked<typeof notificationRepository>;
const mockedAccountRepo = accountRepository as jest.Mocked<typeof accountRepository>;

const USER_A = '11111111-1111-1111-1111-111111111111';
const USER_B = '22222222-2222-2222-2222-222222222222';
const DAY_MS = 24 * 60 * 60 * 1000;

const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

const account = (id: string, userId: string, dataThrough: Date | null) =>
  ({ id, userId, dataThrough, isActive: true }) as never;

beforeEach(() => {
  jest.resetAllMocks();
  mockedNotificationRepo.findLatestByType.mockResolvedValue(null);
});

describe('processCheckInReminders', () => {
  it('lembra usuário com conta atrasada', async () => {
    mockedAccountRepo.findAllActive.mockResolvedValue([
      account('a1', USER_A, daysAgo(20)),
      account('a2', USER_A, null),
      account('a3', USER_A, daysAgo(1)),
    ]);

    await processCheckInReminders();

    expect(mockedDispatch).toHaveBeenCalledTimes(1);
    const arg = mockedDispatch.mock.calls[0]![0];
    expect(arg.userId).toBe(USER_A);
    expect(arg.type).toBe('check_in_reminder');
    expect(arg.severity).toBe('info');
    expect(arg.title).toBe('Hora do check-in');
    expect(arg.message).toContain('2 contas');
    expect(arg.relatedId).toBeNull();
    expect(arg.periodId).toBeNull();
    expect(arg.dedupeKey).toMatch(new RegExp(`^check-in:${USER_A}:\\d{4}-\\d{2}-\\d{2}$`));
  });

  it('usa singular quando só uma conta está atrasada', async () => {
    mockedAccountRepo.findAllActive.mockResolvedValue([account('a1', USER_A, daysAgo(20))]);

    await processCheckInReminders();

    expect(mockedDispatch.mock.calls[0]![0].message).toContain('1 conta ');
  });

  it('não lembra quando todas as contas estão em dia', async () => {
    mockedAccountRepo.findAllActive.mockResolvedValue([
      account('a1', USER_A, daysAgo(1)),
      account('a2', USER_A, daysAgo(7)),
    ]);

    await processCheckInReminders();

    expect(mockedDispatch).not.toHaveBeenCalled();
  });

  it('não lembra dentro de 7 dias do último lembrete', async () => {
    mockedAccountRepo.findAllActive.mockResolvedValue([account('a1', USER_A, daysAgo(20))]);
    mockedNotificationRepo.findLatestByType.mockResolvedValue({
      createdAt: daysAgo(6.5),
    } as never);

    await processCheckInReminders();

    expect(mockedNotificationRepo.findLatestByType).toHaveBeenCalledWith(
      USER_A,
      'check_in_reminder'
    );
    expect(mockedDispatch).not.toHaveBeenCalled();
  });

  it('lembra de novo quando o último lembrete tem 7 dias ou mais', async () => {
    mockedAccountRepo.findAllActive.mockResolvedValue([account('a1', USER_A, daysAgo(20))]);
    mockedNotificationRepo.findLatestByType.mockResolvedValue({
      createdAt: daysAgo(7.01),
    } as never);

    await processCheckInReminders();

    expect(mockedDispatch).toHaveBeenCalledTimes(1);
  });

  it('uma falha de usuário não interrompe os demais', async () => {
    mockedAccountRepo.findAllActive.mockResolvedValue([
      account('a1', USER_A, daysAgo(20)),
      account('b1', USER_B, daysAgo(20)),
    ]);
    mockedNotificationRepo.findLatestByType.mockRejectedValueOnce(new Error('db down'));

    await processCheckInReminders();

    expect(mockedDispatch).toHaveBeenCalledTimes(1);
    expect(mockedDispatch.mock.calls[0]![0].userId).toBe(USER_B);
  });
});

describe('resolvePushVisual check_in_reminder', () => {
  it('abre /check-in', () => {
    expect(resolvePushVisual('check_in_reminder', null).url).toBe('/check-in');
  });
});
