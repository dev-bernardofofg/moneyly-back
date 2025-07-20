import { getCurrentFinancialPeriod } from "../lib/financialPeriod";
import { CategoryRepository } from "../repositories/categoriesRepository";
import {
  CategoryBudgetRepository,
  ICategoryBudgetRepository,
} from "../repositories/categoryBudgetRepository";
import { TransactionRepository } from "../repositories/transactionRepository";
import { UserRepository } from "../repositories/userRepository";

export interface ICategoryBudgetService {
  createBudget(
    userId: string,
    data: {
      categoryId: string;
      monthlyLimit: number;
    }
  ): Promise<any>;
  getUserBudgets(userId: string): Promise<any[]>;
  updateBudget(
    userId: string,
    budgetId: string,
    data: { monthlyLimit: number }
  ): Promise<any>;
  deleteBudget(userId: string, budgetId: string): Promise<boolean>;
  getBudgetProgress(userId: string): Promise<any[]>;
}

export class CategoryBudgetService implements ICategoryBudgetService {
  private budgetRepository: ICategoryBudgetRepository;
  private transactionRepository: TransactionRepository;
  private categoryRepository: CategoryRepository;

  constructor() {
    this.budgetRepository = new CategoryBudgetRepository();
    this.transactionRepository = new TransactionRepository();
    this.categoryRepository = new CategoryRepository();
  }

  async createBudget(
    userId: string,
    data: {
      categoryId: string;
      monthlyLimit: number;
    }
  ): Promise<any> {
    // Verificar se a categoria pertence ao usuário
    const category = await CategoryRepository.findByIdAndUserId(
      data.categoryId,
      userId
    );
    if (!category) {
      throw new Error("Categoria não encontrada ou não pertence ao usuário");
    }

    // Verificar se já existe um orçamento para esta categoria
    const existingBudget = await this.budgetRepository.findByCategoryId(
      data.categoryId
    );

    if (existingBudget) {
      throw new Error("Já existe um orçamento para esta categoria");
    }

    const budget = await this.budgetRepository.create({
      userId,
      categoryId: data.categoryId,
      monthlyLimit: data.monthlyLimit,
    });

    return budget;
  }

  async getUserBudgets(userId: string): Promise<any[]> {
    // Buscar configurações do usuário
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const financialDayStart = user.financialDayStart ?? 1;
    const financialDayEnd = user.financialDayEnd ?? 31;

    if (!financialDayStart || !financialDayEnd) {
      throw new Error("Configuração de período financeiro não encontrada");
    }

    const currentPeriod = getCurrentFinancialPeriod(
      financialDayStart,
      financialDayEnd
    );

    // Buscar orçamentos
    const budgets = await this.budgetRepository.getBudgetWithCategory(userId);

    // Buscar transações do período atual
    const transactions = await TransactionRepository.findByUserId(userId, {
      startDate: currentPeriod.startDate,
      endDate: currentPeriod.endDate,
    });

    // Calcular progresso para cada orçamento
    const budgetsWithProgress = budgets.map((budget) => {
      const categoryExpenses = transactions
        .filter(
          (tx: any) =>
            tx.type === "expense" && tx.category.id === budget.category.id
        )
        .reduce((sum: number, tx: any) => sum + tx.amount, 0);

      const percentage = Math.min(
        (categoryExpenses / budget.monthlyLimit) * 100,
        100
      );
      const remaining = Math.max(0, budget.monthlyLimit - categoryExpenses);

      return {
        ...budget,
        spent: categoryExpenses,
        remaining,
        percentage: Math.round(percentage * 100) / 100,
        status: this.getBudgetStatus(percentage),
      };
    });

    return budgetsWithProgress;
  }

  async updateBudget(
    userId: string,
    budgetId: string,
    data: { monthlyLimit: number }
  ): Promise<any> {
    const budget = await this.budgetRepository.update(budgetId, {
      monthlyLimit: data.monthlyLimit,
    });

    if (!budget) {
      throw new Error("Orçamento não encontrado");
    }

    // Verificar se o orçamento pertence ao usuário
    if (budget.userId !== userId) {
      throw new Error("Orçamento não pertence ao usuário");
    }

    return budget;
  }

  async deleteBudget(userId: string, budgetId: string): Promise<boolean> {
    // Primeiro, buscar o orçamento específico para verificar se existe e pertence ao usuário
    const targetBudget = await this.budgetRepository.findByIdAndUserId(
      budgetId,
      userId
    );

    if (!targetBudget) {
      throw new Error("Orçamento não encontrado ou não pertence ao usuário");
    }

    // Se chegou até aqui, o orçamento existe e pertence ao usuário
    // Agora podemos deletar com segurança
    const deleted = await this.budgetRepository.delete(budgetId);

    if (!deleted) {
      throw new Error("Erro ao deletar orçamento");
    }

    return true;
  }

  async getBudgetProgress(userId: string): Promise<any[]> {
    // Buscar configurações do usuário
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    const financialDayStart = user.financialDayStart ?? 1;
    const financialDayEnd = user.financialDayEnd ?? 31;
    const currentPeriod = getCurrentFinancialPeriod(
      financialDayStart,
      financialDayEnd
    );

    // Buscar orçamentos
    const budgets = await this.budgetRepository.getBudgetWithCategory(userId);

    // Buscar transações do período atual
    const transactions = await TransactionRepository.findByUserId(userId, {
      startDate: currentPeriod.startDate,
      endDate: currentPeriod.endDate,
    });

    // Calcular progresso para cada orçamento
    const budgetProgress = budgets.map((budget) => {
      const categoryExpenses = transactions
        .filter(
          (tx: any) =>
            tx.type === "expense" && tx.category.id === budget.category.id
        )
        .reduce((sum: number, tx: any) => sum + tx.amount, 0);

      const percentage = Math.min(
        (categoryExpenses / budget.monthlyLimit) * 100,
        100
      );
      const remaining = Math.max(0, budget.monthlyLimit - categoryExpenses);

      return {
        ...budget,
        spent: categoryExpenses,
        remaining,
        percentage: Math.round(percentage * 100) / 100,
        status: this.getBudgetStatus(percentage),
      };
    });

    return budgetProgress;
  }

  private getBudgetStatus(percentage: number): string {
    if (percentage >= 100) return "exceeded";
    if (percentage >= 90) return "warning";
    if (percentage >= 75) return "attention";
    return "safe";
  }
}
