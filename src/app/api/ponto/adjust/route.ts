import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/db';
import { validateManualAdjustment } from '@/lib/timesheet-calculator';
import { StoredTimeEntry } from '@/types';

interface GlobalWithMemory {
  memoryTimeEntries?: StoredTimeEntry[];
}

const globalStore = globalThis as unknown as GlobalWithMemory;
const memoryTimeEntries: StoredTimeEntry[] = globalStore.memoryTimeEntries || [];

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Acesso restrito ao administrador para ajuste manual de ponto (INV-04)' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { timeEntryId, newTimestamp, adjustmentReason } = body as {
      timeEntryId: string;
      newTimestamp: string;
      adjustmentReason: string;
    };

    const validation = validateManualAdjustment({
      role: payload.role,
      timeEntryId,
      newTimestamp,
      adjustmentReason,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    try {
      await query(
        `UPDATE time_entries 
         SET timestamp = $1, is_adjusted = TRUE, adjusted_by = $2, adjustment_reason = $3
         WHERE id = $4`,
        [newTimestamp, payload.userId, adjustmentReason.trim(), timeEntryId]
      );
    } catch {
      // Fallback em memória
      const entry = memoryTimeEntries.find((e) => e.id === timeEntryId);
      if (entry) {
        entry.timestamp = newTimestamp;
        entry.is_adjusted = true;
        entry.adjusted_by = payload.userId;
        entry.adjustment_reason = adjustmentReason.trim();
      }
    }

    return NextResponse.json({
      success: true,
      timeEntryId,
      newTimestamp,
      isAdjusted: true,
      adjustmentReason: adjustmentReason.trim(),
    });
  } catch (error: unknown) {
    console.error('[API Ponto Adjust Error]:', error);
    return NextResponse.json({ error: 'Erro ao realizar ajuste manual de ponto' }, { status: 500 });
  }
}
