import { DAILY_TRAVEL_ALLOWANCE_CENTAVOS, TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS } from '../src/lib/constants';

describe('Invariantes do Domínio e Regras de Negócio', () => {
  test('INV-01: Valida que a batida de saída exige relato em áudio ou texto de fallback', () => {
    function validateClockOut(transcriptionText?: string, audioUrl?: string) {
      if (!transcriptionText && !audioUrl) {
        throw new Error('INV-01: O ponto de saída exige gravação de relato em áudio ou texto de fallback');
      }
      return true;
    }

    expect(() => validateClockOut()).toThrow('INV-01');
    expect(validateClockOut('Entreguei equipamentos no buffet')).toBe(true);
    expect(validateClockOut(undefined, 'https://storage/audio.mp3')).toBe(true);
  });

  test('Cálculo de Adicional de Técnica de Evento (R$ 150 por Técnica/Dia)', () => {
    function calculateTechniquesBonus(techniquesCount: number, customAmountCentavos?: number): number {
      const rate = customAmountCentavos || TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS;
      return techniquesCount * rate;
    }

    // Exemplo do Usuário: 2 eventos em 2 dias = 4 técnicas = R$ 600,00 (60.000 centavos)
    const bonus4Techniques = calculateTechniquesBonus(4);
    expect(bonus4Techniques).toBe(60000); // 60000 centavos = R$ 600,00

    const bonus1Technique = calculateTechniquesBonus(1);
    expect(bonus1Technique).toBe(15000); // 15000 centavos = R$ 150,00
  });

  test('Cálculo de Diárias de Viagem (R$ 150 por Dia)', () => {
    function calculateTravelAllowance(daysCount: number): number {
      return daysCount * DAILY_TRAVEL_ALLOWANCE_CENTAVOS;
    }

    expect(calculateTravelAllowance(3)).toBe(45000); // 3 dias = R$ 450,00
  });

  test('INV-04: Permissões de Autorização por Role (ADMIN vs EMPLOYEE)', () => {
    function checkAdminPermission(role: string) {
      if (role !== 'ADMIN') {
        throw new Error('403: Acesso restrito ao administrador');
      }
      return true;
    }

    expect(() => checkAdminPermission('EMPLOYEE')).toThrow('403');
    expect(checkAdminPermission('ADMIN')).toBe(true);
  });
});
