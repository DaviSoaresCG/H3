import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  verifyJwtEdge,
  sanitizeCpf,
  validateCpf,
} from '../src/lib/auth';

describe('Módulo de Segurança e Autenticação (Auth & RBAC)', () => {
  describe('Sanitização e Validação de CPF', () => {
    test('Sanitização de CPF remove caracteres especiais mantendo apenas dígitos', () => {
      expect(sanitizeCpf('123.456.789-00')).toBe('12345678900');
      expect(sanitizeCpf(' 123-456 789.00 ')).toBe('12345678900');
      expect(sanitizeCpf('abc123def456ghi78900')).toBe('12345678900');
    });

    test('Validação de CPF aceita CPFs matematicamente válidos', () => {
      // CPFs válidos conhecidos para teste
      expect(validateCpf('52998224725')).toBe(true);
      expect(validateCpf('529.982.247-25')).toBe(true);
    });

    test('Validação de CPF rejeita sequências repetidas, formatos curtos e dígitos incorretos', () => {
      expect(validateCpf('')).toBe(false);
      expect(validateCpf('111.111.111-11')).toBe(false);
      expect(validateCpf('000.000.000-00')).toBe(false);
      expect(validateCpf('123.456')).toBe(false);
      expect(validateCpf('12345678900')).toBe(false); // Dígitos verificadores inválidos
    });
  });

  describe('Criptografia de Senhas (bcrypt)', () => {
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
  });

  describe('Geração e Verificação de JWT e Sessão RBAC', () => {
    test('Geração e verificação de JWT mantém a integridade das roles de EMPLOYEE', async () => {
      const payload = {
        userId: '11111111-1111-1111-1111-111111111111',
        cpf: '52998224725',
        name: 'Carlos Montador',
        role: 'EMPLOYEE' as const,
      };

      const token = generateToken(payload);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);

      // Verificação padrão (Node)
      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.cpf).toBe(payload.cpf);
      expect(decoded?.name).toBe(payload.name);
      expect(decoded?.role).toBe('EMPLOYEE');

      // Verificação criptográfica Edge (Web Crypto)
      const edgeDecoded = await verifyJwtEdge(token);
      expect(edgeDecoded).not.toBeNull();
      expect(edgeDecoded?.userId).toBe(payload.userId);
      expect(edgeDecoded?.role).toBe('EMPLOYEE');
    });

    test('Geração e verificação de JWT mantém a integridade das roles de ADMIN', async () => {
      const payload = {
        userId: '99999999-9999-9999-9999-999999999999',
        cpf: '52998224725',
        name: 'Roberto Dono',
        role: 'ADMIN' as const,
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.role).toBe('ADMIN');

      const edgeDecoded = await verifyJwtEdge(token);
      expect(edgeDecoded).not.toBeNull();
      expect(edgeDecoded?.role).toBe('ADMIN');
    });

    test('Token JWT adulterado ou com assinatura forjada é rejeitado', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload';
      expect(verifyToken(invalidToken)).toBeNull();

      const edgeResult = await verifyJwtEdge(invalidToken);
      expect(edgeResult).toBeNull();
    });
  });
});
