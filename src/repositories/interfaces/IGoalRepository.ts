import type { Goal, GoalMilestone, NewGoal, NewGoalMilestone } from '../../db/schema';

export type GoalWithMilestones = Goal & {
  milestones: GoalMilestone[];
  progress: {
    percentage: number;
    remaining: number;
    daysRemaining: number;
  };
};

export interface IGoalRepository {
  create(data: NewGoal): Promise<Goal>;
  findById(id: string): Promise<Goal | null>;
  findByIdAndUserId(id: string, userId: string): Promise<Goal | null>;
  findByUserId(userId: string): Promise<Goal[]>;
  findByUserIdActive(userId: string): Promise<Goal[]>;
  update(id: string, data: Partial<NewGoal>): Promise<Goal | null>;
  delete(id: string): Promise<boolean>;
  addAmount(id: string, amount: number): Promise<Goal | null>;
  createMilestone(data: NewGoalMilestone): Promise<GoalMilestone>;
  findMilestonesByGoalId(goalId: string): Promise<GoalMilestone[]>;
  updateMilestone(id: string, data: Partial<NewGoalMilestone>): Promise<GoalMilestone | null>;
  getGoalWithMilestones(goalId: string): Promise<GoalWithMilestones | null>;
}
