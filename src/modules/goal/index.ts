/**
 * Interface pública do módulo goal.
 */
export { default as GoalRouter } from './goal.router';
export { getGoalsProgressUseCase } from './use-cases/get-goals-progress.use-case';
export { calculateGoalProgress } from './helpers/goal-progress';
