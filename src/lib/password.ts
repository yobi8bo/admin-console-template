import { compare, hash } from "bcryptjs";

export async function hashPassword(plainPassword: string) {
  return hash(plainPassword, 12);
}

export async function verifyPassword(plainPassword: string, passwordHash: string) {
  return compare(plainPassword, passwordHash);
}

