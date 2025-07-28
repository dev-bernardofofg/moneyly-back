import bcrypt from "bcryptjs";
import { generateToken } from "../helpers/token";
import { UserRepository } from "../repositories/user.repository";
import {
  ensureEmailNotExists,
  validateCreateSession,
  validateGoogleSession,
} from "../validations/user.validation";

interface ICreateUserInput {
  name: string;
  email: string;
  password: string;
}

interface ICreateSessionInput {
  email: string;
  password: string;
}

const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, 10);
};

export const createUserService = async ({
  name,
  email,
  password,
}: ICreateUserInput) => {
  await ensureEmailNotExists(email);

  const hashedPassword = await hashPassword(password);

  const user = await UserRepository.create({
    name,
    email,
    password: hashedPassword,
  });

  const token = generateToken(user.id);

  return { user, token };
};

export const createSessionService = async ({
  email,
  password,
}: ICreateSessionInput) => {
  const user = await validateCreateSession(email, password);

  const token = generateToken(user.id);

  return { user, token };
};

export const createGoogleSessionService = async (idToken: string) => {
  const user = await validateGoogleSession(idToken);

  const token = generateToken(user.id);

  return { user, token };
};

// Exemplo de serviço que recebe o usuário como parâmetro
export const updateUserProfileService = async (
  user: any,
  data: {
    monthlyIncome?: number;
    financialDayStart?: number;
    financialDayEnd?: number;
  }
) => {
  // O usuário já foi validado no middleware, então podemos usar diretamente
  let updatedUser = user;

  if (data.monthlyIncome !== undefined) {
    updatedUser = await UserRepository.updateMonthlyIncome(
      user.id,
      data.monthlyIncome
    );
  }

  if (
    data.financialDayStart !== undefined &&
    data.financialDayEnd !== undefined
  ) {
    updatedUser = await UserRepository.updateFinancialPeriod(
      user.id,
      data.financialDayStart,
      data.financialDayEnd
    );
  }

  return {
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    monthlyIncome: updatedUser.monthlyIncome,
    financialDayStart: updatedUser.financialDayStart,
    financialDayEnd: updatedUser.financialDayEnd,
    firstAccess: updatedUser.firstAccess,
  };
};
