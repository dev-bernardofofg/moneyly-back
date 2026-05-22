import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import {
  Goal,
  GoalMilestone,
  goalMilestones,
  goals,
  NewGoal,
  NewGoalMilestone,
} from '../db/schema';
import type { GoalWithMilestones, IGoalRepository } from './interfaces/IGoalRepository';
import { calculateGoalProgress } from '../helpers/goal-progress';

async function checkMilestones(goalId: string, currentAmount: number): Promise<void> {
  const milestones = await db
    .select()
    .from(goalMilestones)
    .where(eq(goalMilestones.goalId, goalId))
    .orderBy(goalMilestones.percentage);
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId));
  if (!goal) return;

  for (const milestone of milestones) {
    if (!milestone.isReached && currentAmount >= Number(milestone.amount)) {
      await db
        .update(goalMilestones)
        .set({ isReached: true, reachedAt: new Date() })
        .where(eq(goalMilestones.id, milestone.id));
    }
  }
}

export const goalRepository: IGoalRepository = {
  async create(data: NewGoal): Promise<Goal> {
    const [goal] = await db.insert(goals).values(data).returning();
    if (!goal) throw new Error('Falha ao criar objetivo');

    const milestonePercentages = [25, 50, 75, 100];
    for (const percentage of milestonePercentages) {
      const amount = Math.floor((Number(data.targetAmount) * percentage) / 100);
      await goalRepository.createMilestone({
        goalId: goal.id,
        percentage,
        amount: amount.toString(),
      });
    }

    return goal;
  },

  async findById(id: string): Promise<Goal | null> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal ?? null;
  },

  async findByIdAndUserId(id: string, userId: string): Promise<Goal | null> {
    const [goal] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)));
    return goal ?? null;
  },

  async findByUserId(userId: string): Promise<Goal[]> {
    return db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt));
  },

  async findByUserIdActive(userId: string): Promise<Goal[]> {
    return db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.isActive, true)))
      .orderBy(desc(goals.createdAt));
  },

  async update(id: string, data: Partial<NewGoal>): Promise<Goal | null> {
    const [goal] = await db
      .update(goals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();
    return goal ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(goals).where(eq(goals.id, id)).returning();
    return result.length > 0;
  },

  async addAmount(id: string, amount: number): Promise<Goal | null> {
    const goal = await goalRepository.findById(id);
    if (!goal) return null;

    const newAmount = (Number(goal.currentAmount) ?? 0) + amount;
    const [updatedGoal] = await db
      .update(goals)
      .set({ currentAmount: newAmount.toString(), updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();

    await checkMilestones(id, newAmount);
    return updatedGoal ?? null;
  },

  async createMilestone(data: NewGoalMilestone): Promise<GoalMilestone> {
    const [milestone] = await db.insert(goalMilestones).values(data).returning();
    if (!milestone) throw new Error('Falha ao criar marco');
    return milestone;
  },

  async findMilestonesByGoalId(goalId: string): Promise<GoalMilestone[]> {
    return db
      .select()
      .from(goalMilestones)
      .where(eq(goalMilestones.goalId, goalId))
      .orderBy(goalMilestones.percentage);
  },

  async updateMilestone(
    id: string,
    data: Partial<NewGoalMilestone>
  ): Promise<GoalMilestone | null> {
    const [milestone] = await db
      .update(goalMilestones)
      .set(data)
      .where(eq(goalMilestones.id, id))
      .returning();
    return milestone ?? null;
  },

  async getGoalWithMilestones(goalId: string): Promise<GoalWithMilestones | null> {
    const goal = await goalRepository.findById(goalId);
    if (!goal) return null;

    const milestones = await goalRepository.findMilestonesByGoalId(goalId);
    return {
      ...goal,
      milestones,
      progress: calculateGoalProgress(goal),
    };
  },
};

export type { IGoalRepository };
