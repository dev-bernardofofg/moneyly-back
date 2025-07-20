import {
  ISavingsGoalRepository,
  SavingsGoalRepository,
} from "../repositories/savingsGoalRepository";

export interface ISavingsGoalService {
  createGoal(
    userId: string,
    data: {
      title: string;
      description?: string;
      targetAmount: number;
      targetDate: string;
    }
  ): Promise<any>;
  getUserGoals(userId: string, activeOnly?: boolean): Promise<any[]>;
  getGoalById(userId: string, goalId: string): Promise<any>;
  updateGoal(
    userId: string,
    goalId: string,
    data: {
      title?: string;
      description?: string;
      targetAmount?: number;
      targetDate?: string;
      currentAmount?: number;
      isActive?: boolean;
    }
  ): Promise<any>;
  deleteGoal(userId: string, goalId: string): Promise<boolean>;
  addAmountToGoal(userId: string, goalId: string, amount: number): Promise<any>;
  getGoalsProgress(userId: string): Promise<any[]>;
}

export class SavingsGoalService implements ISavingsGoalService {
  private goalRepository: ISavingsGoalRepository;

  constructor() {
    this.goalRepository = new SavingsGoalRepository();
  }

  async createGoal(
    userId: string,
    data: {
      title: string;
      description?: string;
      targetAmount: number;
      targetDate: string;
    }
  ): Promise<any> {
    const goal = await this.goalRepository.create({
      userId,
      title: data.title,
      description: data.description,
      targetAmount: data.targetAmount,
      targetDate: new Date(data.targetDate),
    });

    return await this.goalRepository.getGoalWithMilestones(goal.id);
  }

  async getUserGoals(
    userId: string,
    activeOnly: boolean = true
  ): Promise<any[]> {
    const goals = activeOnly
      ? await this.goalRepository.findByUserIdActive(userId)
      : await this.goalRepository.findByUserId(userId);

    const goalsWithProgress = await Promise.all(
      goals.map((goal) => this.goalRepository.getGoalWithMilestones(goal.id))
    );

    return goalsWithProgress.filter((goal) => goal !== null);
  }

  async getGoalById(userId: string, goalId: string): Promise<any> {
    const goal = await this.goalRepository.findById(goalId);

    if (!goal || goal.userId !== userId) {
      throw new Error("Objetivo não encontrado ou não pertence ao usuário");
    }

    return await this.goalRepository.getGoalWithMilestones(goalId);
  }

  async updateGoal(
    userId: string,
    goalId: string,
    data: {
      title?: string;
      description?: string;
      targetAmount?: number;
      targetDate?: string;
      currentAmount?: number;
      isActive?: boolean;
    }
  ): Promise<any> {
    // Verificar se o objetivo pertence ao usuário
    const existingGoal = await this.goalRepository.findById(goalId);
    if (!existingGoal || existingGoal.userId !== userId) {
      throw new Error("Objetivo não encontrado ou não pertence ao usuário");
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.targetAmount !== undefined)
      updateData.targetAmount = data.targetAmount;
    if (data.targetDate !== undefined)
      updateData.targetDate = new Date(data.targetDate);
    if (data.currentAmount !== undefined)
      updateData.currentAmount = data.currentAmount;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updatedGoal = await this.goalRepository.update(goalId, updateData);

    if (!updatedGoal) {
      throw new Error("Erro ao atualizar objetivo");
    }

    return await this.goalRepository.getGoalWithMilestones(goalId);
  }

  async deleteGoal(userId: string, goalId: string): Promise<boolean> {
    // Verificar se o objetivo pertence ao usuário
    const goal = await this.goalRepository.findByIdAndUserId(goalId, userId);
    if (!goal) {
      throw new Error("Objetivo não encontrado ou não pertence ao usuário");
    }

    // Se chegou até aqui, o objetivo existe e pertence ao usuário
    // Agora podemos deletar com segurança
    const deleted = await this.goalRepository.delete(goalId);

    if (!deleted) {
      throw new Error("Erro ao deletar objetivo");
    }

    return true;
  }

  async addAmountToGoal(
    userId: string,
    goalId: string,
    amount: number
  ): Promise<any> {
    // Verificar se o objetivo pertence ao usuário
    const goal = await this.goalRepository.findById(goalId);
    if (!goal || goal.userId !== userId) {
      throw new Error("Objetivo não encontrado ou não pertence ao usuário");
    }

    const updatedGoal = await this.goalRepository.addAmount(goalId, amount);

    if (!updatedGoal) {
      throw new Error("Erro ao adicionar valor ao objetivo");
    }

    return await this.goalRepository.getGoalWithMilestones(goalId);
  }

  async getGoalsProgress(userId: string): Promise<any[]> {
    const goals = await this.goalRepository.findByUserIdActive(userId);

    const goalsWithProgress = await Promise.all(
      goals.map((goal) => this.goalRepository.getGoalWithMilestones(goal.id))
    );

    return goalsWithProgress
      .filter((goal) => goal !== null)
      .map((goal) => ({
        ...goal,
        status: this.getGoalStatus(
          goal.progress.percentage,
          goal.progress.daysRemaining
        ),
        nextMilestone: this.getNextMilestone(
          goal.milestones,
          goal.currentAmount ?? 0
        ),
      }));
  }

  private getGoalStatus(percentage: number, daysRemaining: number): string {
    if (percentage >= 100) return "completed";
    if (daysRemaining < 0) return "overdue";
    if (percentage >= 75) return "on-track";
    if (percentage >= 50) return "good-progress";
    if (percentage >= 25) return "early-stage";
    return "just-started";
  }

  private getNextMilestone(milestones: any[], currentAmount: number): any {
    const unreachedMilestones = milestones.filter((m) => !m.isReached);
    return unreachedMilestones.length > 0 ? unreachedMilestones[0] : null;
  }
}
