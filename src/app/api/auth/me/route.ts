import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

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

    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.userId,
        cpf: payload.cpf,
        name: payload.name,
        role: payload.role,
      },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
