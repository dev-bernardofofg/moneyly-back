import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export const hash = (value: string): Promise<string> => bcrypt.hash(value, SALT_ROUNDS);

export const compare = (value: string, hashed: string): Promise<boolean> => bcrypt.compare(value, hashed);
