/**
 * Unit tests for the goal service (factory with injected dependencies).
 */

import { makeGoalService, type GoalServiceDeps } from '../../../src/services/goal.service';

const buildDeps = () => {
  const deps = {
    goalRepository: {
      create: jest.fn(),
      findByUserIdActive: jest.fn(),
      findByIdAndUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addAmount: jest.fn(),
      getGoalWithMilestones: jest.fn(),
    },
    financialPeriodService: {
      createNextPeriods: jest.fn().mockResolvedValue([]),
    },
    validations: {
      validateGoal: jest.fn(),
      validateGoalExists: jest.fn(),
      validateUpdateGoal: jest.fn(),
      validateDeleteGoal: jest.fn(),
    },
  };
  return deps as unknown as GoalServiceDeps & typeof deps;
};

describe('goal service', () => {
  describe('create', () => {
    const userId = 'user-123';
    const goalData = {
      title: 'Viagem para Europa',
      description: 'Férias de verão',
      targetAmount: 10000,
      targetDate: '2024-12-31',
    };

    const created = {
      id: 'goal-123',
      userId,
      title: 'Viagem para Europa',
      description: 'Férias de verão',
      targetAmount: '10000',
      currentAmount: '0',
      targetDate: new Date('2024-12-31'),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('creates a goal successfully', async () => {
      const deps = buildDeps();
      deps.goalRepository.create.mockResolvedValue(created);

      const service = makeGoalService(deps);
      const result = await service.create(userId, goalData);

      expect(deps.goalRepository.create).toHaveBeenCalledWith({
        userId,
        title: goalData.title,
        description: goalData.description,
        targetAmount: goalData.targetAmount.toString(),
        targetDate: new Date(goalData.targetDate),
      });
      expect(deps.financialPeriodService.createNextPeriods).toHaveBeenCalledWith(
        userId,
        expect.any(Number)
      );
      expect(result).toEqual(created);
    });

    it('creates a goal without description', async () => {
      const deps = buildDeps();
      deps.goalRepository.create.mockResolvedValue({ ...created, description: undefined });

      const service = makeGoalService(deps);
      await service.create(userId, {
        title: 'Nova Meta',
        targetAmount: 5000,
        targetDate: '2024-06-30',
      });

      expect(deps.goalRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: undefined })
      );
    });

    it('converts targetAmount to string and targetDate to Date', async () => {
      const deps = buildDeps();
      deps.goalRepository.create.mockResolvedValue(created);

      const service = makeGoalService(deps);
      await service.create(userId, { ...goalData, targetAmount: 15000.5 });

      expect(deps.goalRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ targetAmount: '15000.5', targetDate: expect.any(Date) })
      );
    });
  });

  describe('getGoals', () => {
    const userId = 'user-123';
    const goals = [
      { id: 'goal-1', userId, title: 'Meta 1', targetAmount: '5000', isActive: true },
      { id: 'goal-2', userId, title: 'Meta 2', targetAmount: '10000', isActive: true },
    ];

    it('returns all active goals with computed progress', async () => {
      const deps = buildDeps();
      deps.goalRepository.findByUserIdActive.mockResolvedValue(goals);

      const service = makeGoalService(deps);
      const result = await service.getGoals(userId);

      expect(deps.goalRepository.findByUserIdActive).toHaveBeenCalledWith(userId);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('progress');
      expect(result[0]!.progress).toHaveProperty('percentage');
      expect(result[0]!.progress).toHaveProperty('daysRemaining');
    });

    it('returns an empty array when the user has no goals', async () => {
      const deps = buildDeps();
      deps.goalRepository.findByUserIdActive.mockResolvedValue([]);

      const service = makeGoalService(deps);
      const result = await service.getGoals(userId);

      expect(result).toEqual([]);
    });
  });

  describe('getProgress', () => {
    const userId = 'user-123';

    it('returns goals with milestones for each active goal', async () => {
      const deps = buildDeps();
      const withProgress = [
        {
          id: 'goal-1',
          title: 'Meta 1',
          progress: { percentage: 50, daysRemaining: 30 },
          milestones: [],
        },
        {
          id: 'goal-2',
          title: 'Meta 2',
          progress: { percentage: 75, daysRemaining: 60 },
          milestones: [],
        },
      ];
      deps.goalRepository.findByUserIdActive.mockResolvedValue([
        { id: 'goal-1' },
        { id: 'goal-2' },
      ]);
      deps.goalRepository.getGoalWithMilestones
        .mockResolvedValueOnce(withProgress[0])
        .mockResolvedValueOnce(withProgress[1]);

      const service = makeGoalService(deps);
      const result = await service.getProgress(userId);

      expect(deps.goalRepository.getGoalWithMilestones).toHaveBeenCalledTimes(2);
      expect(deps.goalRepository.getGoalWithMilestones).toHaveBeenCalledWith('goal-1');
      expect(deps.goalRepository.getGoalWithMilestones).toHaveBeenCalledWith('goal-2');
      expect(result).toEqual(withProgress);
    });
  });

  describe('getById', () => {
    const userId = 'user-123';
    const goalId = 'goal-123';
    const goal = { id: goalId, userId, title: 'Meta Específica', targetAmount: '5000' };

    it("returns the user's specific goal with milestones", async () => {
      const deps = buildDeps();
      const withMilestones = { ...goal, milestones: [] };
      deps.goalRepository.findByIdAndUserId.mockResolvedValue(goal);
      deps.goalRepository.getGoalWithMilestones.mockResolvedValue(withMilestones);

      const service = makeGoalService(deps);
      const result = await service.getById(userId, goalId);

      expect(deps.goalRepository.findByIdAndUserId).toHaveBeenCalledWith(goalId, userId);
      expect(deps.validations.validateGoalExists).toHaveBeenCalledWith(goal);
      expect(deps.goalRepository.getGoalWithMilestones).toHaveBeenCalledWith(goalId);
      expect(result).toEqual(withMilestones);
    });

    it('validates whether the goal exists', async () => {
      const deps = buildDeps();
      deps.goalRepository.findByIdAndUserId.mockResolvedValue(null);
      deps.validations.validateGoalExists.mockImplementation((g: unknown) => {
        if (!g) throw new Error('Meta não encontrada');
      });

      const service = makeGoalService(deps);

      await expect(service.getById(userId, goalId)).rejects.toThrow('Meta não encontrada');
    });
  });

  describe('update', () => {
    const userId = 'user-123';
    const goalId = 'goal-123';
    const goal = { id: goalId, userId, title: 'Meta Original', targetAmount: '5000' };

    const updatedWithMilestones = {
      id: goalId,
      title: 'Meta Atualizada',
      targetAmount: '7500',
      progress: { percentage: 60, daysRemaining: 45 },
      milestones: [],
    };

    it('updates a goal successfully', async () => {
      const deps = buildDeps();
      deps.goalRepository.findByIdAndUserId.mockResolvedValue(goal);
      deps.goalRepository.update.mockResolvedValue({ ...goal, title: 'Meta Atualizada' });
      deps.goalRepository.getGoalWithMilestones.mockResolvedValue(updatedWithMilestones);

      const service = makeGoalService(deps);
      const result = await service.update(userId, goalId, {
        title: 'Meta Atualizada',
        targetAmount: 7500,
      });

      expect(deps.goalRepository.update).toHaveBeenCalledWith(
        goalId,
        expect.objectContaining({ title: 'Meta Atualizada', targetAmount: '7500' })
      );
      expect(result).toEqual(updatedWithMilestones);
    });

    it('updates only the provided fields', async () => {
      const deps = buildDeps();
      deps.goalRepository.findByIdAndUserId.mockResolvedValue(goal);
      deps.goalRepository.update.mockResolvedValue(goal);
      deps.goalRepository.getGoalWithMilestones.mockResolvedValue(updatedWithMilestones);

      const service = makeGoalService(deps);
      await service.update(userId, goalId, { title: 'Novo Título' });

      expect(deps.goalRepository.update).toHaveBeenCalledWith(goalId, { title: 'Novo Título' });
    });

    it('converts targetDate to Date and extends periods when provided', async () => {
      const deps = buildDeps();
      deps.goalRepository.findByIdAndUserId.mockResolvedValue(goal);
      deps.goalRepository.update.mockResolvedValue(goal);
      deps.goalRepository.getGoalWithMilestones.mockResolvedValue(updatedWithMilestones);

      const service = makeGoalService(deps);
      await service.update(userId, goalId, { targetDate: '2025-12-31' });

      expect(deps.goalRepository.update).toHaveBeenCalledWith(
        goalId,
        expect.objectContaining({ targetDate: expect.any(Date) })
      );
      expect(deps.financialPeriodService.createNextPeriods).toHaveBeenCalled();
    });

    it('validates that the goal belongs to the user', async () => {
      const deps = buildDeps();
      deps.goalRepository.findByIdAndUserId.mockResolvedValue(goal);
      deps.validations.validateGoal.mockImplementation(() => {
        throw new Error('Meta não pertence ao usuário');
      });

      const service = makeGoalService(deps);

      await expect(service.update(userId, goalId, { title: 'Novo' })).rejects.toThrow(
        'Meta não pertence ao usuário'
      );
      expect(deps.goalRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const userId = 'user-123';
    const goalId = 'goal-123';
    const goal = { id: goalId, userId, title: 'Meta a Deletar' };

    it('deletes a goal successfully', async () => {
      const deps = buildDeps();
      deps.goalRepository.findByIdAndUserId.mockResolvedValue(goal);
      deps.goalRepository.delete.mockResolvedValue(true);

      const service = makeGoalService(deps);
      const result = await service.delete(userId, goalId);

      expect(deps.goalRepository.findByIdAndUserId).toHaveBeenCalledWith(goalId, userId);
      expect(deps.validations.validateGoal).toHaveBeenCalledWith(goal, userId);
      expect(deps.goalRepository.delete).toHaveBeenCalledWith(goalId);
      expect(deps.validations.validateDeleteGoal).toHaveBeenCalledWith(true);
      expect(result).toBe(true);
    });

    it('validates goal ownership before deleting', async () => {
      const deps = buildDeps();
      deps.goalRepository.findByIdAndUserId.mockResolvedValue(goal);
      deps.validations.validateGoal.mockImplementation(() => {
        throw new Error('Meta não pertence ao usuário');
      });

      const service = makeGoalService(deps);

      await expect(service.delete(userId, goalId)).rejects.toThrow('Meta não pertence ao usuário');
      expect(deps.goalRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('addAmount', () => {
    const userId = 'user-123';
    const goalId = 'goal-123';
    const goal = { id: goalId, userId, currentAmount: '1000' };

    const updatedWithMilestones = {
      id: goalId,
      currentAmount: '1500',
      progress: { percentage: 30, daysRemaining: 60 },
      milestones: [],
    };

    it('adds amount to the goal successfully', async () => {
      const deps = buildDeps();
      deps.goalRepository.findByIdAndUserId.mockResolvedValue(goal);
      deps.goalRepository.addAmount.mockResolvedValue({ ...goal, currentAmount: '1500' });
      deps.goalRepository.getGoalWithMilestones.mockResolvedValue(updatedWithMilestones);

      const service = makeGoalService(deps);
      const result = await service.addAmount(userId, goalId, 500);

      expect(deps.goalRepository.addAmount).toHaveBeenCalledWith(goalId, 500);
      expect(result).toEqual(updatedWithMilestones);
    });

    it('validates goal ownership before adding amount', async () => {
      const deps = buildDeps();
      deps.goalRepository.findByIdAndUserId.mockResolvedValue(goal);
      deps.validations.validateGoal.mockImplementation(() => {
        throw new Error('Meta não pertence ao usuário');
      });

      const service = makeGoalService(deps);

      await expect(service.addAmount(userId, goalId, 500)).rejects.toThrow(
        'Meta não pertence ao usuário'
      );
      expect(deps.goalRepository.addAmount).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    const userId = 'user-123';

    const withProgress = [
      {
        id: 'goal-1',
        title: 'Meta 1',
        currentAmount: 5000,
        progress: { percentage: 80, daysRemaining: 30 },
        milestones: [
          { id: 'm1', percentage: 50, amount: '3000', isReached: true },
          { id: 'm2', percentage: 100, amount: '6000', isReached: false },
        ],
      },
      {
        id: 'goal-2',
        title: 'Meta 2',
        currentAmount: 10000,
        progress: { percentage: 100, daysRemaining: 60 },
        milestones: [],
      },
    ];

    it('returns goals with computed status and next milestone', async () => {
      const deps = buildDeps();
      deps.goalRepository.findByUserIdActive.mockResolvedValue([
        { id: 'goal-1' },
        { id: 'goal-2' },
      ]);
      deps.goalRepository.getGoalWithMilestones
        .mockResolvedValueOnce(withProgress[0])
        .mockResolvedValueOnce(withProgress[1]);

      const service = makeGoalService(deps);
      const result = await service.getStatus(userId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'goal-1',
        status: 'on-track', // 80% de progresso
        nextMilestone: expect.objectContaining({ id: 'm2', percentage: 100 }),
      });
      expect(result[1]).toMatchObject({ id: 'goal-2', status: 'completed' });
    });

    it('filters out null goals', async () => {
      const deps = buildDeps();
      deps.goalRepository.findByUserIdActive.mockResolvedValue([
        { id: 'goal-1' },
        { id: 'goal-2' },
      ]);
      deps.goalRepository.getGoalWithMilestones
        .mockResolvedValueOnce(withProgress[0])
        .mockResolvedValueOnce(null);

      const service = makeGoalService(deps);
      const result = await service.getStatus(userId);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('goal-1');
    });

    it("computes 'overdue' status for late goals", async () => {
      const deps = buildDeps();
      deps.goalRepository.findByUserIdActive.mockResolvedValue([{ id: 'goal-1' }]);
      deps.goalRepository.getGoalWithMilestones.mockResolvedValue({
        id: 'goal-1',
        progress: { percentage: 50, daysRemaining: -10 },
        milestones: [],
        currentAmount: 5000,
      });

      const service = makeGoalService(deps);
      const result = await service.getStatus(userId);

      expect(result[0]!.status).toBe('overdue');
    });

    it('computes different statuses based on percentage', async () => {
      const testCases = [
        { percentage: 100, expected: 'completed' },
        { percentage: 80, expected: 'on-track' },
        { percentage: 60, expected: 'good-progress' },
        { percentage: 30, expected: 'early-stage' },
        { percentage: 10, expected: 'just-started' },
      ];

      for (const testCase of testCases) {
        const deps = buildDeps();
        deps.goalRepository.findByUserIdActive.mockResolvedValue([{ id: 'goal-1' }]);
        deps.goalRepository.getGoalWithMilestones.mockResolvedValue({
          id: 'goal-1',
          progress: { percentage: testCase.percentage, daysRemaining: 30 },
          milestones: [],
          currentAmount: 0,
        });

        const service = makeGoalService(deps);
        const result = await service.getStatus(userId);
        expect(result[0]!.status).toBe(testCase.expected);
      }
    });
  });
});
