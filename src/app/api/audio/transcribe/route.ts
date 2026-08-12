import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { transcribeAudioBuffer } from '@/lib/whisper';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('eventpoint_token')?.value;
    const payload = token ? verifyToken(token) : null;

    if (!payload) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo de áudio não enviado' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Transcreve usando Whisper API Proxy
    const text = await transcribeAudioBuffer(buffer, file.name || 'audio.webm');

    return NextResponse.json({
      success: true,
      text,
      durationSeconds: 30, // Estimativa padrão
    });
  } catch (error: any) {
    console.error('[API Transcribe Error]:', error);
    return NextResponse.json(
      { error: 'Falha ao transcrever o áudio. Tente novamente ou use a justificativa em texto.' },
      { status: 500 }
    );
  }
}
