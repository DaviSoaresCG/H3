import { signToken, verifyToken, hashPassword, comparePassword } from '../src/lib/auth';

describe('Módulo de Perfil do Colaborador (Ticket 01)', () => {
  describe('Assinatura e Verificação de Sessão JWT Atualizada', () => {
    test('Atualiza token JWT com novo nome e preserva CPF e role', () => {
      const originalPayload = {
        userId: 'u-123',
        cpf: '12345678900',
        name: 'Carlos Antigo',
        role: 'EMPLOYEE' as const,
      };

      const originalToken = signToken(originalPayload);
      const decodedOriginal = verifyToken(originalToken);
      expect(decodedOriginal?.name).toBe('Carlos Antigo');

      // Atualiza nome e avatarUrl
      const updatedToken = signToken({
        ...originalPayload,
        name: 'Carlos Miguel Atualizado',
        avatarUrl: 'data:image/jpeg;base64,mockAvatarData',
      });

      const decodedUpdated = verifyToken(updatedToken);
      expect(decodedUpdated?.name).toBe('Carlos Miguel Atualizado');
      expect(decodedUpdated?.cpf).toBe('12345678900');
      expect(decodedUpdated?.role).toBe('EMPLOYEE');
      expect(decodedUpdated?.avatarUrl).toBe('data:image/jpeg;base64,mockAvatarData');
    });
  });

  describe('Criptografia de Senha no Perfil', () => {
    test('Gera hash bcrypt válido para a nova senha e valida comparação', async () => {
      const newPassword = 'senhaSegura2026';
      const hash = await hashPassword(newPassword);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(newPassword);

      const isValid = await comparePassword(newPassword, hash);
      expect(isValid).toBe(true);

      const isInvalid = await comparePassword('senhaErrada', hash);
      expect(isInvalid).toBe(false);
    });
  });
});
