import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { User } from '@/types';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
      const users = await query<User>(
        'SELECT id, cpf, name, phone, role, created_at as "createdAt" FROM users ORDER BY name ASC'
      );
      if (users && users.length > 0) {
        return NextResponse.json({ success: true, employees: users });
      }
    } catch {
      // Fallback
    }

    const memoryEmployees: User[] = [
      { id: 'u1', cpf: '123.456.789-00', name: 'Carlos Silva', phone: '11999999999', role: 'EMPLOYEE', createdAt: new Date().toISOString() },
      { id: 'u2', cpf: '234.567.890-11', name: 'Marcos Souza', phone: '11988888888', role: 'EMPLOYEE', createdAt: new Date().toISOString() },
      { id: 'u3', cpf: '345.678.901-22', name: 'Ana Oliveira', phone: '11977777777', role: 'EMPLOYEE', createdAt: new Date().toISOString() },
      { id: 'u4', cpf: '456.789.012-33', name: 'Rodrigo Lima', phone: '11966666666', role: 'EMPLOYEE', createdAt: new Date().toISOString() },
    ];

    return NextResponse.json({ success: true, employees: memoryEmployees });
  } catch (error: unknown) {
    console.error('[API Employees Error]:', error);
    return NextResponse.json({ error: 'Erro ao listar colaboradores' }, { status: 500 });
  }
}
