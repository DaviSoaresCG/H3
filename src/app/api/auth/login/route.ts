import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { comparePassword, generateToken, sanitizeCpf } from '@/lib/auth';
import { UserRole } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cpf, password } = body;

    if (!cpf || !password) {
      return NextResponse.json({ error: 'CPF e senha são obrigatórios' }, { status: 400 });
    }

    const cleanCpf = sanitizeCpf(cpf);

    const user = await queryOne<{
      id: string;
      cpf: string;
      name: string;
      phone: string;
      role: UserRole;
      password_hash: string;
    }>('SELECT id, cpf, name, phone, role, password_hash FROM users WHERE cpf = $1', [cleanCpf]);

    if (!user) {
      return NextResponse.json({ error: 'CPF ou senha incorretos' }, { status: 401 });
    }

    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'CPF ou senha incorretos' }, { status: 401 });
    }

    const token = generateToken({
      userId: user.id,
      cpf: user.cpf,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        cpf: user.cpf,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      token,
    });

    // Armazena token em Cookie seguro HTTP-only
    response.cookies.set({
      name: 'eventpoint_token',
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error: any) {
    console.error('[API Auth Error]:', error);
    return NextResponse.json({ error: 'Erro interno ao realizar autenticação' }, { status: 500 });
  }
}
