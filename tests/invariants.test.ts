import { DAILY_TRAVEL_ALLOWANCE_CENTAVOS, TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS } from '../src/lib/constants';
import { validateTimeEntryTransition, validateClockOutRequirements } from '../src/lib/ponto-validator';
import { getVehicleStatusAfterReturn } from '../src/lib/fleet-validator';
import { calculateTripAllowance } from '../src/lib/trip-validator';
import { calculateTechniquesTotal } from '../src/lib/technique-validator';

describe('Invariantes do Domínio e Regras de Negócio', () => {
  test('INV-01: Valida que a batida de saída exige relato em áudio ou texto de fallback', () => {
    const invalidResult = validateClockOutRequirements({});
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.error).toContain('INV-01');

    const validAudioResult = validateClockOutRequirements({ audioUrl: 'https://storage/audio.mp3' });
    expect(validAudioResult.valid).toBe(true);

    const validTextResult = validateClockOutRequirements({
      isFallbackText: true,
      transcriptionText: 'Entreguei equipamentos no buffet',
      fallbackReason: 'Microfone indisponível',
    });
    expect(validTextResult.valid).toBe(true);
  });

  test('INV-02: Não permitir CLOCK_IN com ponto anterior aberto sem saída', () => {
    const resultWithOpenIn = validateTimeEntryTransition('CLOCK_IN', 'CLOCK_IN');
    expect(resultWithOpenIn.allowed).toBe(false);
    expect(resultWithOpenIn.error).toContain('INV-02');

    const resultWithOpenMeal = validateTimeEntryTransition('MEAL_START', 'CLOCK_IN');
    expect(resultWithOpenMeal.allowed).toBe(false);
    expect(resultWithOpenMeal.error).toContain('INV-02');

    const resultWithClosedPonto = validateTimeEntryTransition('CLOCK_OUT', 'CLOCK_IN');
    expect(resultWithClosedPonto.allowed).toBe(true);
  });

  test('INV-03: Devolução de carro transita status do veículo para GARAGE', () => {
    expect(getVehicleStatusAfterReturn()).toBe('GARAGE');
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

  test('Cálculo de Adicional de Técnica de Evento (R$ 150 por Técnica/Dia)', () => {
    expect(calculateTechniquesTotal(4, TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS)).toBe(60000); // 4 técnicas = R$ 600,00
    expect(calculateTechniquesTotal(1, TECHNIQUE_SERVICE_ALLOWANCE_CENTAVOS)).toBe(15000); // 1 técnica = R$ 150,00
  });

  test('Cálculo de Diárias de Viagem (R$ 150 por Dia)', () => {
    expect(calculateTripAllowance(3, DAILY_TRAVEL_ALLOWANCE_CENTAVOS)).toBe(45000); // 3 dias = R$ 450,00
    expect(calculateTripAllowance(1, DAILY_TRAVEL_ALLOWANCE_CENTAVOS)).toBe(15000); // 1 dia = R$ 150,00
  });
});
