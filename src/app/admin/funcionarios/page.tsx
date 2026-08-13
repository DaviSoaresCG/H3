'use client';

import { useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '@/types';
import { formatDateBR } from '@/lib/date-utils';

export default function AdminFuncionariosPage() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal Criar Colaborador
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCpf, setNewCpf] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('EMPLOYEE');
  const [newPassword, setNewPassword] = useState('123456');
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Modal Editar Colaborador
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('EMPLOYEE');
  const [editPassword, setEditPassword] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Confirmação Excluir
  const [deletingEmployee, setDeletingEmployee] = useState<User | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/employees');
      const data = await res.json();
      if (data.success && data.employees) {
        setEmployees(data.employees);
      }
    } catch (e) {
      console.error('Erro ao listar colaboradores:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCpf.trim()) return;

    setSubmittingCreate(true);
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          cpf: newCpf.trim(),
          phone: newPhone.trim(),
          role: newRole,
          password: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar colaborador');
      }

      setFeedback({ type: 'success', text: 'Colaborador cadastrado com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
      setShowCreateModal(false);
      setNewName('');
      setNewCpf('');
      setNewPhone('');
      setNewRole('EMPLOYEE');
      setNewPassword('123456');
      await fetchEmployees();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao cadastrar colaborador' });
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleOpenEdit = (emp: User) => {
    setEditingEmployee(emp);
    setEditName(emp.name);
    setEditPhone(emp.phone || '');
    setEditRole(emp.role);
    setEditPassword('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !editName.trim()) return;

    setSubmittingEdit(true);
    try {
      const res = await fetch('/api/admin/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEmployee.id,
          name: editName.trim(),
          phone: editPhone.trim(),
          role: editRole,
          password: editPassword.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar colaborador');
      }

      setFeedback({ type: 'success', text: 'Colaborador atualizado com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
      setEditingEmployee(null);
      await fetchEmployees();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao atualizar colaborador' });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEmployee) return;

    setSubmittingDelete(true);
    try {
      const res = await fetch(`/api/admin/employees?id=${deletingEmployee.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir colaborador');
      }

      setFeedback({ type: 'success', text: 'Colaborador removido com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
      setDeletingEmployee(null);
      await fetchEmployees();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Erro ao excluir colaborador' });
    } finally {
      setSubmittingDelete(false);
    }
  };

  const formatCpf = (cpf: string) => {
    if (!cpf || cpf.length !== 11) return cpf;
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`w-full p-3.5 rounded-lg border text-body-sm font-medium flex items-center gap-2.5 animate-fadeIn shadow-soft ${
            feedback.type === 'success'
              ? 'bg-secondary-container/40 border-secondary text-on-secondary-container'
              : 'bg-error-container/60 border-error text-on-error-container'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {feedback.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="flex-1">{feedback.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline-lg font-headline-lg font-black text-navy-deep tracking-tight">
            Gestão de Colaboradores
          </h1>
          <p className="text-body-sm font-body-sm text-on-surface-variant mt-0.5">
            Cadastre funcionários, defina cargos operacionais, credenciais de acesso por CPF e senhas.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-navy-deep hover:bg-slate-serious text-on-primary px-4 py-2.5 rounded-lg font-bold text-body-sm transition-all shadow-soft flex items-center gap-2 active:scale-98"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Novo Colaborador</span>
        </button>
      </div>

      {/* Grid de Funcionários */}
      <div className="bg-surface-card rounded-xl border border-border-subtle overflow-hidden shadow-soft">
        <div className="p-4 border-b border-border-subtle bg-surface-container-lowest flex justify-between items-center">
          <h3 className="font-headline-md font-bold text-navy-deep">
            Equipe Cadastrada
          </h3>
          <span className="font-label-caps text-on-surface-variant bg-surface-container px-3 py-1 rounded-full font-bold text-xs">
            {employees.length} COLABORADORES
          </span>
        </div>

        {loading ? (
          <div className="text-center py-16 text-on-surface-variant text-body-sm animate-pulse">
            Carregando colaboradores...
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant text-body-sm">
            Nenhum colaborador cadastrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-border-subtle text-label-bold font-label-bold text-on-surface-variant uppercase tracking-wider text-xs">
                  <th className="px-5 py-3.5">Nome do Colaborador</th>
                  <th className="px-5 py-3.5">CPF (Login)</th>
                  <th className="px-5 py-3.5">Telefone</th>
                  <th className="px-5 py-3.5">Perfil / Cargo</th>
                  <th className="px-5 py-3.5">Data Cadastro</th>
                  <th className="px-5 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-body-sm text-navy-deep font-medium">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-navy-deep font-bold text-xs">
                        {emp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{emp.name}</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-on-surface-variant">
                      {formatCpf(emp.cpf)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-on-surface-variant">
                      {emp.phone || '---'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded text-label-bold font-label-bold uppercase text-xs ${
                          emp.role === 'ADMIN'
                            ? 'bg-navy-deep text-white'
                            : 'bg-secondary-container text-on-secondary-container'
                        }`}
                      >
                        {emp.role === 'ADMIN' ? 'Administrador' : 'Colaborador (PWA)'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-on-surface-variant">
                      {emp.createdAt ? formatDateBR(emp.createdAt.slice(0, 10)) : '---'}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        className="px-2.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-navy-deep text-xs font-bold rounded-lg transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => setDeletingEmployee(emp)}
                        className="px-2.5 py-1.5 text-error hover:bg-error-container/40 text-xs font-bold rounded-lg transition"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Criar Colaborador */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-md rounded-xl p-6 border border-border-subtle shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
              <h3 className="text-headline-md font-bold text-navy-deep">Cadastrar Colaborador</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-on-surface-variant hover:text-navy-deep">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">CPF (Apenas Números) *</label>
                <input
                  type="text"
                  maxLength={14}
                  value={newCpf}
                  onChange={(e) => setNewCpf(e.target.value)}
                  placeholder="Ex: 12345678901"
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md font-mono text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Ex: (11) 99999-8888"
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                />
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Perfil de Acesso *</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md font-semibold text-navy-deep focus:border-navy-deep outline-none"
                >
                  <option value="EMPLOYEE">Colaborador Operacional (Ponto Mobile / Diários / Frota)</option>
                  <option value="ADMIN">Administrador (Acesso ao Painel Admin e Relatórios)</option>
                </select>
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Senha Inicial *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Padrão: 123456"
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div className="pt-3 border-t border-border-subtle flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high text-navy-deep font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="flex-1 py-2.5 bg-navy-deep text-white font-bold rounded-lg shadow-soft active:translate-y-px disabled:opacity-50"
                >
                  {submittingCreate ? 'Salvando...' : 'Salvar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Colaborador */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-md rounded-xl p-6 border border-border-subtle shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-border-subtle">
              <h3 className="text-headline-md font-bold text-navy-deep">Editar Colaborador</h3>
              <button onClick={() => setEditingEmployee(null)} className="text-on-surface-variant hover:text-navy-deep">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                />
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">Perfil de Acesso *</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md font-semibold text-navy-deep focus:border-navy-deep outline-none"
                >
                  <option value="EMPLOYEE">Colaborador Operacional</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-navy-deep mb-1">
                  Redefinir Senha (Opcional)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Deixe em branco para manter a atual"
                  className="w-full p-3 rounded-lg border border-border-subtle bg-surface-container-lowest text-body-md text-on-surface focus:border-navy-deep outline-none"
                />
              </div>

              <div className="pt-3 border-t border-border-subtle flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high text-navy-deep font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="flex-1 py-2.5 bg-navy-deep text-white font-bold rounded-lg shadow-soft active:translate-y-px disabled:opacity-50"
                >
                  {submittingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {deletingEmployee && (
        <div className="fixed inset-0 z-50 bg-navy-deep/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-surface-card w-full max-w-md rounded-xl p-6 border border-border-subtle shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-error">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <h3 className="text-headline-md font-bold text-navy-deep">Excluir Colaborador?</h3>
            </div>

            <p className="text-body-sm text-on-surface-variant">
              Deseja realmente remover o acesso de <strong>"{deletingEmployee.name}"</strong> (CPF: {formatCpf(deletingEmployee.cpf)})?
            </p>

            <div className="pt-3 border-t border-border-subtle flex gap-3">
              <button
                type="button"
                onClick={() => setDeletingEmployee(null)}
                className="flex-1 py-2.5 bg-surface-container hover:bg-surface-container-high text-navy-deep font-semibold rounded-lg"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submittingDelete}
                className="flex-1 py-2.5 bg-error text-white font-bold rounded-lg shadow-soft active:translate-y-px disabled:opacity-50"
              >
                {submittingDelete ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
