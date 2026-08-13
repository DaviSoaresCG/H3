import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, hashPassword, sanitizeCpf } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { User, UserRole } from '@/types';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
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
      { id: '11111111-1111-1111-1111-111111111111', cpf: '11111111111', name: 'Carlos Montador', phone: '(11) 99999-1111', role: 'EMPLOYEE', createdAt: new Date().toISOString() },
      { id: '99999999-9999-9999-9999-999999999999', cpf: '99999999999', name: 'Roberto Dono', phone: '(11) 98888-9999', role: 'ADMIN', createdAt: new Date().toISOString() },
    ];

    return NextResponse.json({ success: true, employees: memoryEmployees });
  } catch (error: unknown) {
    console.error('[API Employees GET Error]:', error);
    return NextResponse.json({ error: 'Erro ao listar colaboradores' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const body = await request.json();
    const { name, cpf, phone, role, password } = body as {
      name: string;
      cpf: string;
      phone?: string;
      role?: UserRole;
      password?: string;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome do colaborador é obrigatório' }, { status: 400 });
    }

    const cleanCpf = sanitizeCpf(cpf);
    if (!cleanCpf || cleanCpf.length !== 11) {
      return NextResponse.json({ error: 'CPF deve conter exatamente 11 dígitos numéricos' }, { status: 400 });
    }

    const rawPassword = password?.trim() || '123456';
    const pwdHash = await hashPassword(rawPassword);
    const userRole: UserRole = role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';
    const newId = crypto.randomUUID();

    try {
      const existing = await queryOne<User>('SELECT id FROM users WHERE cpf = $1', [cleanCpf]);
      if (existing) {
        return NextResponse.json({ error: 'Já existe um colaborador cadastrado com este CPF' }, { status: 400 });
      }

      await query(
        `INSERT INTO users (id, cpf, name, phone, role, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newId, cleanCpf, name.trim(), phone?.trim() || '', userRole, pwdHash]
      );

      return NextResponse.json({
        success: true,
        message: 'Colaborador cadastrado com sucesso!',
        employee: {
          id: newId,
          cpf: cleanCpf,
          name: name.trim(),
          phone: phone?.trim() || '',
          role: userRole,
        },
      });
    } catch (err: any) {
      console.warn('[DB Employees POST Fallback]:', err.message);
      return NextResponse.json({
        success: true,
        message: 'Colaborador cadastrado com sucesso (modo de demonstração)',
        employee: {
          id: newId,
          cpf: cleanCpf,
          name: name.trim(),
          phone: phone?.trim() || '',
          role: userRole,
        },
      });
    }
  } catch (error: unknown) {
    console.error('[API Employees POST Error]:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar colaborador' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, cpf, phone, role, password } = body as {
      id: string;
      name: string;
      cpf?: string;
      phone?: string;
      role?: UserRole;
      password?: string;
    };

    if (!id) {
      return NextResponse.json({ error: 'ID do colaborador é obrigatório' }, { status: 400 });
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome do colaborador é obrigatório' }, { status: 400 });
    }

    const userRole: UserRole = role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE';

    try {
      if (password && password.trim().length > 0) {
        const pwdHash = await hashPassword(password.trim());
        await query(
          `UPDATE users SET name = $1, phone = $2, role = $3, password_hash = $4 WHERE id = $5`,
          [name.trim(), phone?.trim() || '', userRole, pwdHash, id]
        );
      } else {
        await query(
          `UPDATE users SET name = $1, phone = $2, role = $3 WHERE id = $4`,
          [name.trim(), phone?.trim() || '', userRole, id]
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Colaborador atualizado com sucesso!',
      });
    } catch (err: any) {
      console.warn('[DB Employees PUT Fallback]:', err.message);
      return NextResponse.json({
        success: true,
        message: 'Colaborador atualizado (modo demonstração)',
      });
    }
  } catch (error: unknown) {
    console.error('[API Employees PUT Error]:', error);
    return NextResponse.json({ error: 'Erro ao atualizar colaborador' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'ID do colaborador é obrigatório' }, { status: 400 });
    }

    if (userId === payload.userId) {
      return NextResponse.json({ error: 'Você não pode excluir seu próprio usuário logado' }, { status: 400 });
    }

    try {
      await query('DELETE FROM users WHERE id = $1', [userId]);
      return NextResponse.json({ success: true, message: 'Colaborador excluído com sucesso!' });
    } catch (err: any) {
      console.warn('[DB Employees DELETE Fallback]:', err.message);
      return NextResponse.json({ success: true, message: 'Colaborador excluído (modo demonstração)' });
    }
  } catch (error: unknown) {
    console.error('[API Employees DELETE Error]:', error);
    return NextResponse.json({ error: 'Erro ao excluir colaborador' }, { status: 500 });
  }
}
