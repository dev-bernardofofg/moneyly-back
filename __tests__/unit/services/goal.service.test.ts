/**
 * Unit tests for GoalService
 */

import { goalRepository } from "../../../src/repositories/goal.repository";
import {
  addAmountToGoalService,
  createGoalService,
  deleteGoalService,
  getGoalByIdService,
  getGoalsProgressService,
  getGoalsService,
  getGoalStatusService,
  updateGoalService,
} from "../../../src/services/goal.service";
import {
  validateDeleteGoal,
  validateGoal,
  validateGoalExists,
  validateUpdateGoal,
} from "../../../src/validations/goal.validation";

// Mock dos módulos
jest.mock("../../../src/repositories/goal.repository");
jest.mock("../../../src/validations/goal.validation");
jest.mock("../../../src/services/financial-period.service", () => ({
  financialPeriodService: {
    createNextPeriods: jest.fn().mockResolvedValue([]),
    ensureCurrentPeriodExists: jest.fn().mockResolvedValue({ id: "p1" }),
  },
}));

describe("GoalService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createGoalService", () => {
    const mockUserId = "user-123";
    const mockGoalData = {
      title: "Viagem para Europa",
      description: "Férias de verão",
      targetAmount: 10000,
      targetDate: "2024-12-31",
    };

    const mockCreatedGoal = {
      id: "goal-123",
      userId: mockUserId,
      title: "Viagem para Europa",
      description: "Férias de verão",
      targetAmount: "10000",
      currentAmount: "0",
      targetDate: new Date("2024-12-31"),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("creates a goal successfully", async () => {
      (goalRepository.create as jest.Mock).mockResolvedValue(mockCreatedGoal);

      const result = await createGoalService(mockUserId, mockGoalData);

      expect(goalRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        title: mockGoalData.title,
        description: mockGoalData.description,
        targetAmount: mockGoalData.targetAmount.toString(),
        targetDate: new Date(mockGoalData.targetDate),
      });
      expect(result).toEqual(mockCreatedGoal);
    });

    it("creates a goal without description", async () => {
      const dataWithoutDescription = {
        title: "Nova Meta",
        targetAmount: 5000,
        targetDate: "2024-06-30",
      };

      (goalRepository.create as jest.Mock).mockResolvedValue({
        ...mockCreatedGoal,
        description: undefined,
      });

      await createGoalService(mockUserId, dataWithoutDescription);

      expect(goalRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: undefined,
        })
      );
    });

    it("converts targetAmount to string", async () => {
      (goalRepository.create as jest.Mock).mockResolvedValue(mockCreatedGoal);

      await createGoalService(mockUserId, {
        ...mockGoalData,
        targetAmount: 15000.5,
      });

      expect(goalRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          targetAmount: "15000.5",
        })
      );
    });

    it("converts targetDate to Date", async () => {
      (goalRepository.create as jest.Mock).mockResolvedValue(mockCreatedGoal);

      await createGoalService(mockUserId, mockGoalData);

      expect(goalRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          targetDate: expect.any(Date),
        })
      );
    });
  });

  describe("getGoalsService", () => {
    const mockUserId = "user-123";
    const mockGoals = [
      {
        id: "goal-1",
        userId: mockUserId,
        title: "Meta 1",
        targetAmount: "5000",
        isActive: true,
      },
      {
        id: "goal-2",
        userId: mockUserId,
        title: "Meta 2",
        targetAmount: "10000",
        isActive: true,
      },
    ];

    it("returns all active goals for the user", async () => {
      (goalRepository.findByUserIdActive as jest.Mock).mockResolvedValue(
        mockGoals
      );

      const result = await getGoalsService(mockUserId);

      expect(goalRepository.findByUserIdActive).toHaveBeenCalledWith(
        mockUserId
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("progress");
      expect(result[0]!.progress).toHaveProperty("percentage");
      expect(result[0]!.progress).toHaveProperty("daysRemaining");
    });

    it("returns an empty array when the user has no goals", async () => {
      (goalRepository.findByUserIdActive as jest.Mock).mockResolvedValue([]);

      const result = await getGoalsService(mockUserId);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("getGoalsProgressService", () => {
    const mockUserId = "user-123";
    const mockGoals = [{ id: "goal-1" }, { id: "goal-2" }];

    const mockGoalsWithProgress = [
      {
        id: "goal-1",
        title: "Meta 1",
        progress: { percentage: 50, daysRemaining: 30 },
        milestones: [],
      },
      {
        id: "goal-2",
        title: "Meta 2",
        progress: { percentage: 75, daysRemaining: 60 },
        milestones: [],
      },
    ];

    it("returns goals with computed progress", async () => {
      (goalRepository.findByUserIdActive as jest.Mock).mockResolvedValue(
        mockGoals
      );
      (goalRepository.getGoalWithMilestones as jest.Mock)
        .mockResolvedValueOnce(mockGoalsWithProgress[0])
        .mockResolvedValueOnce(mockGoalsWithProgress[1]);

      const result = await getGoalsProgressService(mockUserId);

      expect(goalRepository.getGoalWithMilestones).toHaveBeenCalledTimes(2);
      expect(goalRepository.getGoalWithMilestones).toHaveBeenCalledWith(
        "goal-1"
      );
      expect(goalRepository.getGoalWithMilestones).toHaveBeenCalledWith(
        "goal-2"
      );
      expect(result).toEqual(mockGoalsWithProgress);
    });
  });

  describe("getGoalByIdService", () => {
    const mockUserId = "user-123";
    const mockGoalId = "goal-123";
    const mockGoal = {
      id: mockGoalId,
      userId: mockUserId,
      title: "Meta Específica",
      targetAmount: "5000",
    };

    it("returns the user's specific goal", async () => {
      const mockGoalWithMilestones = {
        ...mockGoal,
        milestones: [],
      };

      (goalRepository.findByIdAndUserId as jest.Mock).mockResolvedValue(
        mockGoal
      );
      (goalRepository.getGoalWithMilestones as jest.Mock).mockResolvedValue(
        mockGoalWithMilestones
      );
      (validateGoalExists as jest.Mock).mockReturnValue(undefined);

      const result = await getGoalByIdService(mockUserId, mockGoalId);

      expect(goalRepository.findByIdAndUserId).toHaveBeenCalledWith(
        mockGoalId,
        mockUserId
      );
      expect(validateGoalExists).toHaveBeenCalledWith(mockGoal);
      expect(goalRepository.getGoalWithMilestones).toHaveBeenCalledWith(
        mockGoalId
      );
      expect(result).toEqual(mockGoalWithMilestones);
    });

    it("validates whether the goal exists", async () => {
      (goalRepository.findByIdAndUserId as jest.Mock).mockResolvedValue(null);
      (validateGoalExists as jest.Mock).mockImplementation((goal) => {
        if (!goal) throw new Error("Meta não encontrada");
      });

      await expect(getGoalByIdService(mockUserId, mockGoalId)).rejects.toThrow(
        "Meta não encontrada"
      );
    });
  });

  describe("updateGoalService", () => {
    const mockUserId = "user-123";
    const mockGoalId = "goal-123";
    const mockGoal = {
      id: mockGoalId,
      userId: mockUserId,
      title: "Meta Original",
      targetAmount: "5000",
    };

    const mockUpdatedGoalWithMilestones = {
      id: mockGoalId,
      title: "Meta Atualizada",
      targetAmount: "7500",
      progress: { percentage: 60, daysRemaining: 45 },
      milestones: [],
    };

    it("updates a goal successfully", async () => {
      (goalRepository.findByIdAndUserId as jest.Mock).mockResolvedValue(
        mockGoal
      );
      (validateGoal as jest.Mock).mockReturnValue(undefined);
      (goalRepository.update as jest.Mock).mockResolvedValue({
        ...mockGoal,
        title: "Meta Atualizada",
      });
      (validateUpdateGoal as jest.Mock).mockReturnValue(undefined);
      (goalRepository.getGoalWithMilestones as jest.Mock).mockResolvedValue(
        mockUpdatedGoalWithMilestones
      );

      const result = await updateGoalService(mockUserId, mockGoalId, {
        title: "Meta Atualizada",
        targetAmount: 7500,
      });

      expect(goalRepository.update).toHaveBeenCalledWith(
        mockGoalId,
        expect.objectContaining({
          title: "Meta Atualizada",
          targetAmount: "7500",
        })
      );
      expect(result).toEqual(mockUpdatedGoalWithMilestones);
    });

    it("updates only the provided fields", async () => {
      (goalRepository.findByIdAndUserId as jest.Mock).mockResolvedValue(
        mockGoal
      );
      (validateGoal as jest.Mock).mockReturnValue(undefined);
      (goalRepository.update as jest.Mock).mockResolvedValue(mockGoal);
      (validateUpdateGoal as jest.Mock).mockReturnValue(undefined);
      (goalRepository.getGoalWithMilestones as jest.Mock).mockResolvedValue(
        mockUpdatedGoalWithMilestones
      );

      await updateGoalService(mockUserId, mockGoalId, {
        title: "Novo Título",
      });

      expect(goalRepository.update).toHaveBeenCalledWith(mockGoalId, {
        title: "Novo Título",
      });
    });

    it("converts targetDate to Date when provided", async () => {
      (goalRepository.findByIdAndUserId as jest.Mock).mockResolvedValue(
        mockGoal
      );
      (validateGoal as jest.Mock).mockReturnValue(undefined);
      (goalRepository.update as jest.Mock).mockResolvedValue(mockGoal);
      (validateUpdateGoal as jest.Mock).mockReturnValue(undefined);
      (goalRepository.getGoalWithMilestones as jest.Mock).mockResolvedValue(
        mockUpdatedGoalWithMilestones
      );

      await updateGoalService(mockUserId, mockGoalId, {
        targetDate: "2025-12-31",
      });

      expect(goalRepository.update).toHaveBeenCalledWith(
        mockGoalId,
        expect.objectContaining({
          targetDate: expect.any(Date),
        })
      );
    });

    it("validates that the goal belongs to the user", async () => {
      (goalRepository.findByIdAndUserId as jest.Mock).mockResolvedValue(
        mockGoal
      );
      (validateGoal as jest.Mock).mockImplementation(() => {
        throw new Error("Meta não pertence ao usuário");
      });

      await expect(
        updateGoalService(mockUserId, mockGoalId, { title: "Novo" })
      ).rejects.toThrow("Meta não pertence ao usuário");

      expect(goalRepository.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteGoalService", () => {
    const mockUserId = "user-123";
    const mockGoalId = "goal-123";
    const mockGoal = {
      id: mockGoalId,
      userId: mockUserId,
      title: "Meta a Deletar",
    };

    it("deletes a goal successfully", async () => {
      (goalRepository.findByIdAndUserId as jest.Mock).mockResolvedValue(
        mockGoal
      );
      (validateGoal as jest.Mock).mockReturnValue(undefined);
      (goalRepository.delete as jest.Mock).mockResolvedValue(true);
      (validateDeleteGoal as jest.Mock).mockReturnValue(undefined);

      const result = await deleteGoalService(mockUserId, mockGoalId);

      expect(goalRepository.findByIdAndUserId).toHaveBeenCalledWith(
        mockGoalId,
        mockUserId
      );
      expect(validateGoal).toHaveBeenCalledWith(mockGoal, mockUserId);
      expect(goalRepository.delete).toHaveBeenCalledWith(mockGoalId);
      expect(validateDeleteGoal).toHaveBeenCalledWith(true);
      expect(result).toBe(true);
    });

    it("validates goal ownership before deleting", async () => {
      (goalRepository.findByIdAndUserId as jest.Mock).mockResolvedValue(
        mockGoal
      );
      (validateGoal as jest.Mock).mockImplementation(() => {
        throw new Error("Meta não pertence ao usuário");
      });

      await expect(deleteGoalService(mockUserId, mockGoalId)).rejects.toThrow(
        "Meta não pertence ao usuário"
      );

      expect(goalRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe("addAmountToGoalService", () => {
    const mockUserId = "user-123";
    const mockGoalId = "goal-123";
    const mockGoal = {
      id: mockGoalId,
      userId: mockUserId,
      currentAmount: "1000",
    };

    const mockUpdatedGoalWithMilestones = {
      id: mockGoalId,
      currentAmount: "1500",
      progress: { percentage: 30, daysRemaining: 60 },
      milestones: [],
    };

    it("adds amount to the goal successfully", async () => {
      (goalRepository.findByIdAndUserId as jest.Mock).mockResolvedValue(
        mockGoal
      );
      (validateGoal as jest.Mock).mockReturnValue(undefined);
      (goalRepository.addAmount as jest.Mock).mockResolvedValue({
        ...mockGoal,
        currentAmount: "1500",
      });
      (validateUpdateGoal as jest.Mock).mockReturnValue(undefined);
      (goalRepository.getGoalWithMilestones as jest.Mock).mockResolvedValue(
        mockUpdatedGoalWithMilestones
      );

      const result = await addAmountToGoalService(mockUserId, mockGoalId, 500);

      expect(goalRepository.addAmount).toHaveBeenCalledWith(mockGoalId, 500);
      expect(result).toEqual(mockUpdatedGoalWithMilestones);
    });

    it("validates goal ownership before adding amount", async () => {
      (goalRepository.findByIdAndUserId as jest.Mock).mockResolvedValue(
        mockGoal
      );
      (validateGoal as jest.Mock).mockImplementation(() => {
        throw new Error("Meta não pertence ao usuário");
      });

      await expect(
        addAmountToGoalService(mockUserId, mockGoalId, 500)
      ).rejects.toThrow("Meta não pertence ao usuário");

      expect(goalRepository.addAmount).not.toHaveBeenCalled();
    });
  });

  describe("getGoalStatusService", () => {
    const mockUserId = "user-123";
    const mockGoals = [{ id: "goal-1" }, { id: "goal-2" }];

    const mockGoalsWithProgress = [
      {
        id: "goal-1",
        title: "Meta 1",
        currentAmount: 5000,
        progress: { percentage: 80, daysRemaining: 30 },
        milestones: [
          { id: "m1", percentage: 50, amount: "3000", isReached: true },
          { id: "m2", percentage: 100, amount: "6000", isReached: false },
        ],
      },
      {
        id: "goal-2",
        title: "Meta 2",
        currentAmount: 10000,
        progress: { percentage: 100, daysRemaining: 60 },
        milestones: [],
      },
    ];

    it("returns goals with computed status", async () => {
      (goalRepository.findByUserIdActive as jest.Mock).mockResolvedValue(
        mockGoals
      );
      (goalRepository.getGoalWithMilestones as jest.Mock)
        .mockResolvedValueOnce(mockGoalsWithProgress[0])
        .mockResolvedValueOnce(mockGoalsWithProgress[1]);

      const result = await getGoalStatusService(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: "goal-1",
        status: "on-track", // 80% de progresso
        nextMilestone: expect.objectContaining({
          id: "m2",
          percentage: 100,
        }),
      });
      expect(result[1]).toMatchObject({
        id: "goal-2",
        status: "completed", // 100% de progresso
      });
    });

    it("filters out null goals", async () => {
      (goalRepository.findByUserIdActive as jest.Mock).mockResolvedValue([
        { id: "goal-1" },
        { id: "goal-2" },
      ]);
      (goalRepository.getGoalWithMilestones as jest.Mock)
        .mockResolvedValueOnce(mockGoalsWithProgress[0])
        .mockResolvedValueOnce(null);

      const result = await getGoalStatusService(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("goal-1");
    });

    it("computes 'overdue' status for late goals", async () => {
      (goalRepository.findByUserIdActive as jest.Mock).mockResolvedValue([
        { id: "goal-1" },
      ]);
      (goalRepository.getGoalWithMilestones as jest.Mock).mockResolvedValue({
        id: "goal-1",
        progress: { percentage: 50, daysRemaining: -10 },
        milestones: [],
        currentAmount: 5000,
      });

      const result = await getGoalStatusService(mockUserId);

      expect(result[0]!.status).toBe("overdue");
    });

    it("computes different statuses based on percentage", async () => {
      const testCases = [
        { percentage: 100, expected: "completed" },
        { percentage: 80, expected: "on-track" },
        { percentage: 60, expected: "good-progress" },
        { percentage: 30, expected: "early-stage" },
        { percentage: 10, expected: "just-started" },
      ];

      for (const testCase of testCases) {
        (goalRepository.findByUserIdActive as jest.Mock).mockResolvedValue([
          { id: "goal-1" },
        ]);
        (goalRepository.getGoalWithMilestones as jest.Mock).mockResolvedValue({
          id: "goal-1",
          progress: {
            percentage: testCase.percentage,
            daysRemaining: 30,
          },
          milestones: [],
          currentAmount: 0,
        });

        const result = await getGoalStatusService(mockUserId);
        expect(result[0]!.status).toBe(testCase.expected);
      }
    });
  });
});
