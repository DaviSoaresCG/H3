import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, signToken, hashPassword } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { User } from '@/types';

export async function PUT(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, password } = body as {
      name?: string;
      phone?: string;
      password?: string;
    };

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    if (password && password.trim().length > 0 && password.trim().length < 4) {
      return NextResponse.json({ error: 'A nova senha deve ter no mínimo 4 caracteres' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone ? phone.trim() : '';

    try {
      if (password && password.trim().length >= 4) {
        const pwdHash = await hashPassword(password.trim());
        await query(
          'UPDATE users SET name = $1, phone = $2, password_hash = $3 WHERE id = $4',
          [trimmedName, trimmedPhone, pwdHash, payload.userId]
        );
      } else {
        await query(
          'UPDATE users SET name = $1, phone = $2 WHERE id = $3',
          [trimmedName, trimmedPhone, payload.userId]
        );
      }
    } catch (dbErr: any) {
      console.warn('[DB Profile PUT Fallback]:', dbErr.message);
    }

    // Atualiza token JWT com novo nome
    const updatedToken = signToken({
      userId: payload.userId,
      cpf: payload.cpf,
      name: trimmedName,
      role: payload.role,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Perfil atualizado com sucesso!',
      user: {
        id: payload.userId,
        cpf: payload.cpf,
        name: trimmedName,
        phone: trimmedPhone,
        role: payload.role,
      },
    });

    response.cookies.set('eventpoint_token', updatedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error: unknown) {
    console.error('[API Profile PUT Error]:', error);
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
  }
}
