import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { comparePassword, generateToken, sanitizeCpf, validateCpf } from '@/lib/auth';
import { UserRole } from '@/types';

interface DbUserRow {
  id: string;
  cpf: string;
  name: string;
  phone: string;
  role: UserRole;
  password_hash: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cpf, password } = body;

    if (!cpf || !password) {
      return NextResponse.json({ error: 'CPF e senha são obrigatórios' }, { status: 400 });
    }

    const cleanCpf = sanitizeCpf(cpf);

    // Permite CPFs de teste para demo (11111111111 / 99999999999) ou CPFs com dígitos matematicamente válidos
    const isDemoCpf = cleanCpf === '11111111111' || cleanCpf === '99999999999';
    if (!isDemoCpf && !validateCpf(cleanCpf)) {
      return NextResponse.json({ error: 'CPF inválido. Verifique os dígitos informados.' }, { status: 400 });
    }

    let user: DbUserRow | null = null;

    try {
      user = await queryOne<DbUserRow>(
        'SELECT id, cpf, name, phone, role, password_hash FROM users WHERE cpf = $1',
        [cleanCpf]
      );
    } catch {
      user = null;
    }

    // Fallback de demonstração offline quando o banco PostgreSQL não estiver conectado
    if (!user) {
      if (cleanCpf === '11111111111' && password === '123456') {
        user = {
          id: '11111111-1111-1111-1111-111111111111',
          cpf: '11111111111',
          name: 'Carlos Montador',
          phone: '(11) 99999-1111',
          role: 'EMPLOYEE',
          password_hash: '',
        };
      } else if (cleanCpf === '99999999999' && password === 'admin123') {
        user = {
          id: '99999999-9999-9999-9999-999999999999',
          cpf: '99999999999',
          name: 'Roberto Dono',
          phone: '(11) 98888-9999',
          role: 'ADMIN',
          password_hash: '',
        };
      }
    } else {
      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        return NextResponse.json({ error: 'CPF ou senha incorretos' }, { status: 401 });
      }
    }

    if (!user) {
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

    // Armazena token em Cookie seguro HTTP-only com flags de segurança
    response.cookies.set({
      name: 'eventpoint_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error: unknown) {
    console.error('[API Auth Error]:', error);
    return NextResponse.json({ error: 'Erro interno ao realizar autenticação' }, { status: 500 });
  }
}
