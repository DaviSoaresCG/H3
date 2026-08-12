import { hashPassword, comparePassword, generateToken, verifyToken, sanitizeCpf } from '../src/lib/auth';

describe('Módulo de Segurança e Autenticação (Auth)', () => {
  test('Sanitização de CPF remove caracteres especiais mantendo apenas dígitos', () => {
    expect(sanitizeCpf('123.456.789-00')).toBe('12345678900');
    expect(sanitizeCpf(' 123-456 789.00 ')).toBe('12345678900');
  });

  test('Criptografia e comparação de senhas com bcrypt funciona com segurança', async () => {
    const rawPassword = 'MinhaSenhaSegura123!';
    const hash = await hashPassword(rawPassword);

    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith('$2')).toBe(true); // Prefixo padrão do bcrypt

    const isMatch = await comparePassword(rawPassword, hash);
    const isWrongMatch = await comparePassword('SenhaErrada', hash);

    expect(isMatch).toBe(true);
    expect(isWrongMatch).toBe(false);
  });

  test('Geração e verificação de JWT mantém a integridade das roles de usuário', () => {
    const payload = {
      userId: 'user-uuid-123',
      cpf: '12345678900',
      name: 'Carlos Montador',
      role: 'EMPLOYEE' as const,
    };

    const token = generateToken(payload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.cpf).toBe(payload.cpf);
    expect(decoded?.role).toBe(payload.role);
  });

  test('Token JWT adulterado ou inválido é rejeitado', () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload';
    const result = verifyToken(invalidToken);
    expect(result).toBeNull();
  });
});
