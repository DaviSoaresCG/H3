import OpenAI, { toFile } from 'openai';
import { ENV } from '@/lib/constants';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: ENV.OPENAI_API_KEY || 'dummy_key',
    });
  }
  return openaiClient;
}

/**
 * Envia um buffer de arquivo de áudio (.m4a / .mp3 / .wav / .webm) para a OpenAI Whisper API
 * e retorna o texto transcrito em Português do Brasil.
 */
export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  filename: string = 'audio.webm'
): Promise<string> {
  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error('Buffer de áudio vazio');
  }

  // Se não houver chave configurada em ambiente de testes/dev, simula transcrição amigável
  if (!ENV.OPENAI_API_KEY || ENV.OPENAI_API_KEY === 'your_openai_api_key_here') {
    return '[Transcrição de Teste]: Relato de expediente gravado com sucesso. Equipamentos entregues no buffet sem avarias.';
  }

  try {
    const openai = getOpenAIClient();
    const file = await toFile(audioBuffer, filename, { type: 'audio/webm' });

    const response = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'pt',
      prompt: 'Relatório diário de trabalho de montagem de evento e transporte de equipamentos.',
    });

    return response.text;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[Whisper API Error]:', errorMsg);
    throw new Error(`Falha ao transcrever áudio via Whisper API: ${errorMsg}`);
  }
}
