import { transcribeAudioBuffer } from '../src/lib/whisper';
import { validateClockOutRequirements } from '../src/lib/ponto-validator';

describe('Módulo de Gravação e Transcrição por IA (Whisper & INV-01)', () => {
  describe('Transcrição de Áudio via Whisper API', () => {
    test('Retorna transcrição simulada em ambiente sem chave OPENAI_API_KEY', async () => {
      const fakeAudioBuffer = Buffer.from('fake-audio-data-bytes');
      const text = await transcribeAudioBuffer(fakeAudioBuffer, 'relato.webm');

      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(10);
      expect(text).toContain('Relato de expediente');
    });

    test('Rejeita buffers vazios com mensagem de erro clara', async () => {
      const emptyBuffer = Buffer.from('');
      await expect(transcribeAudioBuffer(emptyBuffer, 'relato.webm')).rejects.toThrow('Buffer de áudio vazio');
    });
  });

  describe('Validação de Diário de Bordo e Fallback (INV-01)', () => {
    test('Valida com sucesso quando áudio e transcrição estão presentes no CLOCK_OUT', () => {
      const result = validateClockOutRequirements({
        audioUrl: 'https://storage/relato.webm',
        transcriptionText: 'Entregamos 40 cadeiras no evento',
      });
      expect(result.valid).toBe(true);
    });

    test('Rejeita CLOCK_OUT sem áudio e sem transcrição (INV-01)', () => {
      const result = validateClockOutRequirements({});
      expect(result.valid).toBe(false);
      expect(result.error).toContain('INV-01');
    });

    test('Rejeita fallback em texto se a justificativa (fallback_reason) estiver vazia', () => {
      const result = validateClockOutRequirements({
        isFallbackText: true,
        transcriptionText: 'Relato digitado',
        fallbackReason: '   ',
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Justificativa obrigatória');
    });

    test('Aceita fallback em texto com justificativa preenchida', () => {
      const result = validateClockOutRequirements({
        isFallbackText: true,
        transcriptionText: 'Relato digitado no local do evento',
        fallbackReason: 'Microfone do celular danificado',
      });
      expect(result.valid).toBe(true);
    });
  });
});
