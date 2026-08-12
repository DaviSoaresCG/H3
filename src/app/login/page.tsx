'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Formata CPF automaticamente no formato 000.000.000-00
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
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
    } catch (err: any) {
      setError(err.message || 'Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoEmployee = () => {
    setCpf('111.111.111-11');
    setPassword('123456');
  };

  const fillDemoAdmin = () => {
    setCpf('999.999.999-99');
    setPassword('admin123');
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center font-black text-slate-950 text-2xl mx-auto shadow-lg shadow-emerald-500/20">
            E
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">EventPoint</h2>
          <p className="text-sm text-slate-400">
            Gestão de Ponto com GPS, Frota & Relatos por Voz
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              CPF do Funcionário / Gestor
            </label>
            <input
              type="text"
              value={cpf}
              onChange={handleCpfChange}
              placeholder="000.000.000-00"
              required
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition text-base"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition text-base"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-emerald-500/20 active:scale-[0.99] disabled:opacity-50 text-base"
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>

        {/* Botoes de Preenchimento Rápido para Demonstração */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <p className="text-[11px] text-slate-500 text-center font-medium uppercase tracking-wider">
            Acesso Rápido de Teste (Demo)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={fillDemoEmployee}
              type="button"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition text-center"
            >
              👷 Carlos (Funcionário)
            </button>
            <button
              onClick={fillDemoAdmin}
              type="button"
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-lg text-xs font-medium text-slate-300 transition text-center"
            >
              👔 Roberto (Dono/Admin)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
