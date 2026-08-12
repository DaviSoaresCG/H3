import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JwtPayload, UserRole } from '@/types';
import { ENV } from '@/lib/constants';

/**
 * Criptografa uma senha em texto claro usando bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compara uma senha em texto claro com um hash bcrypt armazenado
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Gera um token JWT assinado para a sessão do usuário
 */
export function generateToken(payload: { userId: string; cpf: string; name: string; role: UserRole }): string {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Valida um token JWT e retorna o payload decodificado ou null se inválido
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Limpa uma string de CPF mantendo apenas dígitos
 */
export function sanitizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, '');
}
