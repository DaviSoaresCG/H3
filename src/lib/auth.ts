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
export function generateToken(payload: { userId: string; cpf: string; name: string; role: UserRole; avatarUrl?: string | null }): string {
  return jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '7d' });
}
export const signToken = generateToken;

/**
 * Valida um token JWT no ambiente Node (usando jsonwebtoken)
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Valida a assinatura e payload do token JWT de forma assíncrona usando Web Crypto API (100% compatível com Edge Runtime e Middleware)
 */
export async function verifyJwtEdge(token: string, secret: string = ENV.JWT_SECRET): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const binarySignature = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    );

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify('HMAC', key, binarySignature, data);
    if (!isValid) return null;

    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as JwtPayload & { exp?: number };

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Limpa uma string de CPF mantendo apenas dígitos
 */
export function sanitizeCpf(cpf: string): string {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '');
}

/**
 * Valida se um CPF é matematicamente válido através do cálculo dos dígitos verificadores (Módulo 11)
 */
export function validateCpf(cpf: string): boolean {
  const clean = sanitizeCpf(cpf);
  if (!clean || clean.length !== 11) return false;

  // Rejeita sequências de dígitos repetidos (ex: 00000000000, 11111111111)
  if (/^(\d)\1{10}$/.test(clean)) return false;

  // Validação do 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let firstCheck = 11 - (sum % 11);
  if (firstCheck >= 10) firstCheck = 0;
  if (firstCheck !== parseInt(clean.charAt(9), 10)) return false;

  // Validação do 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  let secondCheck = 11 - (sum % 11);
  if (secondCheck >= 10) secondCheck = 0;
  if (secondCheck !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}
