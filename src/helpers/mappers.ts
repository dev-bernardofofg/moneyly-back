import type { AuthenticatedUser } from "../types/auth.types";

export const mapUserResponse = (user: AuthenticatedUser, includeGoogle = false) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  ...(includeGoogle && { googleId: user.googleId, avatar: user.avatar }),
  monthlyIncome: user.monthlyIncome ?? 0,
  financialDayStart: user.financialDayStart ?? 1,
  financialDayEnd: user.financialDayEnd ?? 31,
  firstAccess: user.firstAccess,
  createdAt: user.createdAt,
});
