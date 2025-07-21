import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  GoalMilestone,
  goalMilestones,
  NewGoalMilestone,
  NewSavingsGoal,
  SavingsGoal,
  savingsGoals,
} from "../db/schema";

export interface ISavingsGoalRepository {
  create(data: NewSavingsGoal): Promise<SavingsGoal>;
  findById(id: string): Promise<SavingsGoal | null>;
  findByIdAndUserId(id: string, userId: string): Promise<SavingsGoal | null>;
  findByUserId(userId: string): Promise<SavingsGoal[]>;
  findByUserIdActive(userId: string): Promise<SavingsGoal[]>;
  update(
    id: string,
    data: Partial<NewSavingsGoal>
  ): Promise<SavingsGoal | null>;
  delete(id: string): Promise<boolean>;
  addAmount(id: string, amount: number): Promise<SavingsGoal | null>;
  createMilestone(data: NewGoalMilestone): Promise<GoalMilestone>;
  findMilestonesByGoalId(goalId: string): Promise<GoalMilestone[]>;
  updateMilestone(
    id: string,
    data: Partial<NewGoalMilestone>
  ): Promise<GoalMilestone | null>;
  getGoalWithMilestones(goalId: string): Promise<any>;
}

export class SavingsGoalRepository implements ISavingsGoalRepository {
  async create(data: NewSavingsGoal): Promise<SavingsGoal> {
    const [goal] = await db.insert(savingsGoals).values(data).returning();

    // Criar marcos automaticamente (25%, 50%, 75%, 100%)
    const milestones = [25, 50, 75, 100];
    for (const percentage of milestones) {
      const amount = Math.floor((Number(data.targetAmount) * percentage) / 100);
      await this.createMilestone({
        goalId: goal.id,
        percentage,
        amount: amount.toString(),
      });
    }

    return goal;
  }

  async findById(id: string): Promise<SavingsGoal | null> {
    const [goal] = await db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.id, id));
    return goal || null;
  }

  async findByIdAndUserId(
    id: string,
    userId: string
  ): Promise<SavingsGoal | null> {
    const [goal] = await db
      .select()
      .from(savingsGoals)
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)));
    return goal || null;
  }

  async findByUserId(userId: string): Promise<SavingsGoal[]> {
    return await db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.userId, userId))
      .orderBy(desc(savingsGoals.createdAt));
  }

  async findByUserIdActive(userId: string): Promise<SavingsGoal[]> {
    return await db
      .select()
      .from(savingsGoals)
      .where(
        and(eq(savingsGoals.userId, userId), eq(savingsGoals.isActive, true))
      )
      .orderBy(desc(savingsGoals.createdAt));
  }

  async update(
    id: string,
    data: Partial<NewSavingsGoal>
  ): Promise<SavingsGoal | null> {
    const [goal] = await db
      .update(savingsGoals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(savingsGoals.id, id))
      .returning();
    return goal || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(savingsGoals)
      .where(eq(savingsGoals.id, id))
      .returning();

    // Se retornou algum registro, significa que foi deletado com sucesso
    return result.length > 0;
  }

  async addAmount(id: string, amount: number): Promise<SavingsGoal | null> {
    const goal = await this.findById(id);
    if (!goal) return null;

    const newAmount = (Number(goal.currentAmount) ?? 0) + amount;
    const [updatedGoal] = await db
      .update(savingsGoals)
      .set({
        currentAmount: newAmount.toString(),
        updatedAt: new Date(),
      })
      .where(eq(savingsGoals.id, id))
      .returning();

    // Verificar se algum marco foi atingido
    await this.checkMilestones(id, newAmount);

    return updatedGoal || null;
  }

  async createMilestone(data: NewGoalMilestone): Promise<GoalMilestone> {
    const [milestone] = await db
      .insert(goalMilestones)
      .values(data)
      .returning();
    return milestone;
  }

  async findMilestonesByGoalId(goalId: string): Promise<GoalMilestone[]> {
    return await db
      .select()
      .from(goalMilestones)
      .where(eq(goalMilestones.goalId, goalId))
      .orderBy(goalMilestones.percentage);
  }

  async updateMilestone(
    id: string,
    data: Partial<NewGoalMilestone>
  ): Promise<GoalMilestone | null> {
    const [milestone] = await db
      .update(goalMilestones)
      .set(data)
      .where(eq(goalMilestones.id, id))
      .returning();
    return milestone || null;
  }

  async getGoalWithMilestones(goalId: string): Promise<any> {
    const goal = await this.findById(goalId);
    if (!goal) return null;

    const milestones = await this.findMilestonesByGoalId(goalId);

    return {
      ...goal,
      milestones,
      progress: {
        percentage: Math.floor(
          ((Number(goal.currentAmount) ?? 0) / Number(goal.targetAmount)) * 100
        ),
        remaining:
          Number(goal.targetAmount) - (Number(goal.currentAmount) ?? 0),
        daysRemaining: Math.ceil(
          (new Date(goal.targetDate).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      },
    };
  }

  private async checkMilestones(
    goalId: string,
    currentAmount: number
  ): Promise<void> {
    const milestones = await this.findMilestonesByGoalId(goalId);
    const goal = await this.findById(goalId);

    if (!goal) return;

    for (const milestone of milestones) {
      if (!milestone.isReached && currentAmount >= Number(milestone.amount)) {
        await this.updateMilestone(milestone.id, {
          isReached: true,
          reachedAt: new Date(),
        });

        // Aqui você pode adicionar lógica para notificações
        console.log(
          `🎉 Marco de ${milestone.percentage}% atingido para o objetivo: ${goal.title}`
        );
      }
    }
  }
}
