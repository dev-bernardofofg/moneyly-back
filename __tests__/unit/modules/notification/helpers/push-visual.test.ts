import { resolvePushVisual } from '@modules/notification/helpers/push-visual';

describe('resolvePushVisual', () => {
  it('maps transaction income to transactions url with relatedId', () => {
    const visual = resolvePushVisual('transaction_income', 'tx-1');
    expect(visual.url).toBe('/transactions?id=tx-1');
    expect(visual.icon).toBe('/icons/income.png');
    expect(visual.badge).toBe('/icons/badge.png');
  });

  it('maps transaction expense to transactions url with relatedId', () => {
    const visual = resolvePushVisual('transaction_expense', 'tx-2');
    expect(visual.url).toBe('/transactions?id=tx-2');
    expect(visual.icon).toBe('/icons/expense.png');
  });

  it('falls back to list when relatedId is missing', () => {
    expect(resolvePushVisual('transaction_income', null).url).toBe('/transactions');
  });

  it('maps goal milestone with query param', () => {
    expect(resolvePushVisual('goal_milestone', 'g1').url).toBe('/planner?goalId=g1');
  });
});
