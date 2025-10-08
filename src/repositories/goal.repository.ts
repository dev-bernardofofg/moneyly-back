import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  Goal,
  GoalMilestone,
  goalMilestones,
  goals,
  NewGoal,
  NewGoalMilestone,
} from "../db/schema";

// Implementa IGoalRepository (métodos estáticos)
export class GoalRepository {
  static async create(data: NewGoal): Promise<Goal> {
    const [goal] = await db.insert(goals).values(data).returning();
    if (!goal) throw new Error("Falha ao criar objetivo");

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

  static async findById(id: string): Promise<Goal | null> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal || null;
  }

  static async findByIdAndUserId(
    id: string,
    userId: string
  ): Promise<Goal | null> {
    const [goal] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)));
    return goal || null;
  }

  static async findByUserId(userId: string): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(desc(goals.createdAt));
  }

  static async findByUserIdActive(userId: string): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.isActive, true)))
      .orderBy(desc(goals.createdAt));
  }

  static async update(
    id: string,
    data: Partial<NewGoal>
  ): Promise<Goal | null> {
    const [goal] = await db
      .update(goals)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(goals.id, id))
      .returning();
    return goal || null;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await db.delete(goals).where(eq(goals.id, id)).returning();

    // Se retornou algum registro, significa que foi deletado com sucesso
    return result.length > 0;
  }

  static async addAmount(id: string, amount: number): Promise<Goal | null> {
    const goal = await this.findById(id);
    if (!goal) return null;

    const newAmount = (Number(goal.currentAmount) ?? 0) + amount;
    const [updatedGoal] = await db
      .update(goals)
      .set({
        currentAmount: newAmount.toString(),
        updatedAt: new Date(),
      })
      .where(eq(goals.id, id))
      .returning();

    // Verificar se algum marco foi atingido
    await this.checkMilestones(id, newAmount);

    return updatedGoal || null;
  }

  static async createMilestone(data: NewGoalMilestone): Promise<GoalMilestone> {
    const [milestone] = await db
      .insert(goalMilestones)
      .values(data)
      .returning();
    if (!milestone) throw new Error("Falha ao criar marco");
    return milestone;
  }

  static async findMilestonesByGoalId(
    goalId: string
  ): Promise<GoalMilestone[]> {
    return await db
      .select()
      .from(goalMilestones)
      .where(eq(goalMilestones.goalId, goalId))
      .orderBy(goalMilestones.percentage);
  }

  static async updateMilestone(
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

  static async getGoalWithMilestones(goalId: string): Promise<any> {
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

  private static async checkMilestones(
    goalId: string,
    currentAmount: number
  ): Promise<void> {
    const milestones = await GoalRepository.findMilestonesByGoalId(goalId);
    const goal = await GoalRepository.findById(goalId);

    if (!goal) return;

    for (const milestone of milestones) {
      if (!milestone.isReached && currentAmount >= Number(milestone.amount)) {
        await GoalRepository.updateMilestone(milestone.id, {
          isReached: true,
          reachedAt: new Date(),
        });

        // TODO: Adicionar lógica para notificações
        // logger.info(`Marco de ${milestone.percentage}% atingido`, {
        //   goalTitle: goal.title,
        //   milestone: milestone.percentage,
        // });
      }
    }
  }
}
