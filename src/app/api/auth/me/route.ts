import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { User } from '@/types';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    try {
      const dbUser = await queryOne<User>(
        'SELECT id, cpf, name, phone, role, created_at as "createdAt" FROM users WHERE id = $1',
        [payload.userId]
      );
      if (dbUser) {
        return NextResponse.json({
          authenticated: true,
          user: {
            id: dbUser.id,
            cpf: dbUser.cpf,
            name: dbUser.name,
            phone: dbUser.phone || '',
            role: dbUser.role,
          },
        });
      }
    } catch {
      // Fallback to token payload
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.userId,
        cpf: payload.cpf,
        name: payload.name,
        phone: '',
        role: payload.role,
      },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
