import { Goal } from "../db/schema";
import { HttpError } from "./errors";

export const validateGoal = (goal: Goal | null, userId: string) => {
  if (!goal || goal.userId !== userId) {
    throw new HttpError(
      404,
      "Objetivo não encontrado ou não pertence ao usuário"
    );
  }
};

export const validateUpdateGoal = (goal: Goal) => {
  if (!goal) {
    throw new HttpError(404, "Erro ao atualizar objetivo");
  }
};

export const validateDeleteGoal = (deleted: boolean) => {
  if (!deleted) {
    throw new HttpError(404, "Erro ao deletar objetivo");
  }
};

export const validateAddAmountToGoal = (updatedGoal: Goal) => {
  if (!updatedGoal) {
    throw new HttpError(404, "Erro ao adicionar valor ao objetivo");
  }
};

export const validateGoalExists = (goal: Goal | null) => {
  if (!goal) {
    throw new HttpError(404, "Objetivo não encontrado");
  }
};
