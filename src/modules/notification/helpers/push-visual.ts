export interface PushVisual {
  url: string;
  icon?: string;
  image?: string;
  badge?: string;
}

const BADGE = '/icons/badge.png';

export const resolvePushVisual = (type: string, relatedId: string | null): PushVisual => {
  switch (type) {
    case 'budget_alert':
      return { url: '/dashboard', icon: '/icons/budget.png', badge: BADGE };
    case 'bill_reminder':
      return { url: '/recurring-transactions', icon: '/icons/bill.png', badge: BADGE };
    case 'goal_milestone':
      return {
        url: relatedId ? `/planner?goalId=${relatedId}` : '/planner',
        icon: '/icons/goal.png',
        badge: BADGE,
      };
    case 'spending_alert':
      return { url: '/dashboard', icon: '/icons/spending.png', badge: BADGE };
    case 'transaction_income':
      return {
        url: relatedId ? `/transactions?id=${relatedId}` : '/transactions',
        icon: '/icons/income.png',
        badge: BADGE,
      };
    case 'transaction_expense':
      return {
        url: relatedId ? `/transactions?id=${relatedId}` : '/transactions',
        icon: '/icons/expense.png',
        badge: BADGE,
      };
    default:
      return { url: '/dashboard', badge: BADGE };
  }
};
