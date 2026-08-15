'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MobileHeader } from '@/components/MobileHeader';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { User } from '@/types';

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setName(data.user.name || '');
          setPhone(data.user.phone || '');
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Erro ao carregar perfil:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFeedback({ type: 'error', text: 'Nome completo é obrigatório' });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setFeedback({ type: 'error', text: 'A confirmação de senha não confere com a nova senha' });
      return;
    }

    if (newPassword && newPassword.length < 4) {
      setFeedback({ type: 'error', text: 'A nova senha deve ter pelo menos 4 dígitos' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          password: newPassword ? newPassword.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar alterações');
      }

      setFeedback({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      if (data.user) {
        setUser(data.user);
      }
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao salvar alterações' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    document.cookie = 'eventpoint_token=; path=/; credentials=include; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/login');
    router.refresh();
  };

  const formatCpfDisplay = (cpf?: string) => {
    if (!cpf) return '---';
    const clean = cpf.replace(/\D/g, '');
    if (clean.length === 11) {
      return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
    }
    return cpf;
  };

  const initials = user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-background text-on-background pb-28 pt-20">
      <MobileHeader userName={user?.name} gpsStatus="OK" />

      <main className="max-w-lg mx-auto px-4 space-y-6">
        {/* Toast Feedback */}
        {feedback && (
          <div
            className={`w-full p-3.5 rounded-xl border text-body-sm font-medium flex items-center gap-2.5 animate-fadeIn shadow-soft ${
              feedback.type === 'success'
                ? 'bg-secondary-container/50 border-secondary text-on-secondary-container'
                : 'bg-error-container/60 border-error text-on-error-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="flex-1">{feedback.text}</span>
          </div>
        )}

        {/* Card do Perfil / Avatar */}
        <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-6 shadow-sm flex flex-col items-center text-center border-t-4 border-t-primary-container">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full bg-navy-deep text-primary-container flex items-center justify-center font-black text-3xl shadow-sm border-4 border-surface-variant">
              {initials}
            </div>
            <div className="absolute bottom-0 right-0 bg-success-vibrant text-white w-6 h-6 rounded-full flex items-center justify-center border-2 border-surface-container-lowest">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                check
              </span>
            </div>
          </div>

          <h2 className="text-headline-md font-headline-md font-bold text-on-surface">
            {user?.name || 'Carregando...'}
          </h2>
          <div className="mt-1">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-surface-container text-on-surface-variant border border-surface-variant">
              {user?.role === 'ADMIN' ? '👑 Gestor Administrador' : '🛠️ Colaborador Operacional'}
            </span>
          </div>
        </div>

        {/* Formulário de Edição */}
        <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-surface-variant pb-3">
            <span className="material-symbols-outlined text-navy-deep text-[22px]">manage_accounts</span>
            <h3 className="text-headline-md font-headline-md font-bold text-on-surface">
              Dados do Cadastro
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-8 text-on-surface-variant animate-pulse">
              Carregando dados...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome Completo */}
              <div className="space-y-1.5">
                <label className="block text-label-bold font-label-bold text-on-surface-variant uppercase">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full h-12 px-4 border border-surface-variant rounded-lg focus:border-navy-deep focus:ring-1 focus:ring-navy-deep outline-none bg-surface-container-lowest text-on-surface font-semibold"
                  required
                />
              </div>

              {/* CPF (Somente Leitura) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-label-bold font-label-bold text-on-surface-variant uppercase">
                    CPF (Identificador Único)
                  </label>
                  <span className="text-[10px] font-bold text-outline uppercase flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">lock</span>
                    Protegido
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  readOnly
                  value={formatCpfDisplay(user?.cpf)}
                  className="w-full h-12 px-4 border border-surface-variant rounded-lg bg-surface-container text-on-surface-variant font-mono font-bold cursor-not-allowed"
                />
                <span className="text-[11px] text-outline block">
                  O CPF é utilizado para identificação fiscal e não pode ser alterado.
                </span>
              </div>

              {/* Telefone */}
              <div className="space-y-1.5">
                <label className="block text-label-bold font-label-bold text-on-surface-variant uppercase">
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full h-12 px-4 border border-surface-variant rounded-lg focus:border-navy-deep focus:ring-1 focus:ring-navy-deep outline-none bg-surface-container-lowest text-on-surface font-semibold"
                />
              </div>

              {/* Bloco de Alteração de Senha */}
              <div className="pt-3 border-t border-surface-variant space-y-3">
                <div className="flex items-center gap-1.5 text-navy-deep font-bold text-sm">
                  <span className="material-symbols-outlined text-[18px]">key</span>
                  <span>Alterar Senha de Acesso</span>
                </div>
                <span className="text-[11px] text-on-surface-variant block">
                  Deixe os campos em branco se não desejar modificar sua senha atual.
                </span>

                <div className="space-y-1.5">
                  <label className="block text-label-bold font-label-bold text-on-surface-variant uppercase text-xs">
                    Nova Senha
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo de 4 dígitos"
                    className="w-full h-11 px-4 border border-surface-variant rounded-lg focus:border-navy-deep focus:ring-1 focus:ring-navy-deep outline-none bg-surface-container-lowest text-on-surface text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-label-bold font-label-bold text-on-surface-variant uppercase text-xs">
                    Confirmar Nova Senha
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full h-11 px-4 border border-surface-variant rounded-lg focus:border-navy-deep focus:ring-1 focus:ring-navy-deep outline-none bg-surface-container-lowest text-on-surface text-sm"
                  />
                </div>
              </div>

              {/* Botão Salvar */}
              <button
                type="submit"
                disabled={saving}
                className="w-full h-12 rounded-xl bg-navy-deep text-white hover:bg-slate-serious active:translate-y-px transition font-bold shadow-soft flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[20px]">save</span>
                <span>{saving ? 'Salvando Alterações...' : 'Salvar Alterações'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Card de Logout e Informações do App */}
        <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-body-sm font-bold text-on-surface">EventPoint PWA</span>
            <span className="text-[11px] text-on-surface-variant">Versão 1.2.0 — Operacional</span>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl border border-error text-error hover:bg-error-container/40 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Sair</span>
          </button>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
