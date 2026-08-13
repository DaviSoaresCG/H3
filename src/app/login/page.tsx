'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Formatação e máscara automática de CPF (000.000.000-00)
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 9) {
      value = value.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2}).*/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/^(\d{3})(\d{3})(\d{0,3}).*/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/^(\d{3})(\d{0,3}).*/, '$1.$2');
    }
    setCpf(value);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar login');
      }

      if (data.user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/ponto');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas. Verifique seu CPF e senha.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoEmployee = () => {
    setCpf('111.111.111-11');
    setPassword('123456');
    setError('');
  };

  const fillDemoAdmin = () => {
    setCpf('999.999.999-99');
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body-md flex items-center justify-center p-4">
      {/* Login Card */}
      <main className="w-full max-w-md bg-surface-card rounded-xl border border-border-subtle p-6 sm:p-8 shadow-soft">
        {/* Header / Logo */}
        <header className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-navy-deep rounded-lg flex items-center justify-center mb-3 text-on-primary shadow-soft">
            <span
              className="material-symbols-outlined text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              event
            </span>
          </div>
          <h1 className="text-headline-md font-headline-md font-bold text-navy-deep tracking-tight">
            EventPoint
          </h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-1 text-center">
            Acesse sua conta para continuar
          </p>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 bg-error-container/60 border border-error/30 rounded-lg text-on-error-container text-body-sm font-medium flex items-center gap-2.5 animate-fadeIn">
            <span className="material-symbols-outlined text-error text-[20px]">error</span>
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Form */}
        <form className="flex flex-col gap-4" onSubmit={handleLogin}>
          {/* CPF Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-body-sm font-body-sm text-navy-deep font-semibold" htmlFor="cpf">
              CPF
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                badge
              </span>
              <input
                id="cpf"
                type="text"
                name="cpf"
                maxLength={14}
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                required
                className="w-full h-12 pl-10 pr-3 rounded border border-border-subtle bg-surface-container-lowest text-body-md font-body-md text-on-surface placeholder-on-surface-variant focus:border-navy-deep focus:ring-1 focus:ring-navy-deep outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-body-sm font-body-sm text-navy-deep font-semibold" htmlFor="password">
                Senha
              </label>
              <span className="text-label-bold font-label-bold text-secondary cursor-pointer hover:underline opacity-80">
                Esqueci minha senha
              </span>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                lock
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-12 pl-10 pr-10 rounded border border-border-subtle bg-surface-container-lowest text-body-md font-body-md text-on-surface placeholder-on-surface-variant focus:border-navy-deep focus:ring-1 focus:ring-navy-deep outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-navy-deep transition-colors p-1"
                aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-2 bg-navy-deep text-on-primary text-body-md font-body-md font-semibold rounded shadow-soft hover:bg-slate-serious active:scale-98 active:shadow-none active:translate-y-px transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                <span>Entrando...</span>
              </>
            ) : (
              <>
                <span>Entrar</span>
                <span className="material-symbols-outlined text-[20px]">login</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Access Pills */}
        <div className="mt-6 pt-5 border-t border-border-subtle space-y-2.5">
          <p className="text-[11px] text-on-surface-variant text-center font-bold uppercase tracking-wider">
            Acesso Rápido de Demonstração
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={fillDemoEmployee}
              type="button"
              className="px-3 py-2 bg-surface-container-low hover:bg-surface-container border border-border-subtle rounded-lg text-xs font-semibold text-navy-deep transition text-center active:translate-y-px"
            >
              👷 Carlos (Operacional)
            </button>
            <button
              onClick={fillDemoAdmin}
              type="button"
              className="px-3 py-2 bg-surface-container-low hover:bg-surface-container border border-border-subtle rounded-lg text-xs font-semibold text-navy-deep transition text-center active:translate-y-px"
            >
              👔 Roberto (Gestor/Admin)
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
