'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignora erro de rede no logout
    }
    document.cookie = 'eventpoint_token=; path=/; credentials=include; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/login');
    router.refresh();
  };

  const navItems = [
    {
      label: 'Dashboard',
      href: '/admin/dashboard',
      icon: 'dashboard',
    },
    {
      label: 'Espelho & Relatos',
      href: '/admin/ponto',
      icon: 'description',
    },
    {
      label: 'Viagens & Diárias',
      href: '/admin/viagens',
      icon: 'route',
    },
    {
      label: 'Fichas Técnicas',
      href: '/admin/tecnicas',
      icon: 'assignment',
    },
    {
      label: 'Frota de Veículos',
      href: '/admin/frota',
      icon: 'local_shipping',
    },
    {
      label: 'Colaboradores',
      href: '/admin/funcionarios',
      icon: 'badge',
    },
    {
      label: 'Sede & Geofence',
      href: '/admin/empresa',
      icon: 'business',
    },
  ];

  const renderNavLinks = () => (
    <>
      {/* Quick Action Button */}
      <Link
        href="/admin/ponto"
        onClick={() => setMobileOpen(false)}
        className="mb-3 w-full bg-primary-container text-on-yellow-text font-black py-2.5 rounded-xl shadow-soft hover:brightness-95 active:translate-y-px transition-all flex items-center justify-center gap-2 text-xs tracking-wide"
      >
        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          add
        </span>
        <span>Novo Relatório</span>
      </Link>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-2 pb-1">
          Operacional & Ponto
        </div>
        {navItems.slice(0, 4).map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all duration-200 text-xs ${
                isActive
                  ? 'bg-primary-container text-on-yellow-text shadow-sm translate-x-1 font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/90 hover:translate-x-0.5'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${isActive ? 'text-on-yellow-text' : 'text-slate-400'}`}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-3 pb-1">
          Cadastros & Configurações
        </div>
        {navItems.slice(4).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all duration-200 text-xs ${
                isActive
                  ? 'bg-primary-container text-on-yellow-text shadow-sm translate-x-1 font-extrabold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/90 hover:translate-x-0.5'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${isActive ? 'text-on-yellow-text' : 'text-slate-400'}`}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between px-2 mt-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-primary-container flex items-center justify-center text-xs font-black border border-slate-700">
            AD
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">Admin Gestor</p>
            <p className="text-[10px] text-slate-400">Painel Geral</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-slate-400 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
          title="Sair do sistema"
          aria-label="Sair"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Top Navbar (Admin) */}
      <header className="bg-navy-deep border-b border-slate-800 flex justify-between items-center w-full px-4 h-16 fixed top-0 left-0 right-0 z-40 md:hidden shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-container text-on-yellow-text rounded-xl flex items-center justify-center font-black text-sm shadow-sm">
            EP
          </div>
          <span className="text-headline-md font-headline-md font-bold text-white">
            EventPoint Admin
          </span>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
          aria-label="Menu"
        >
          <span className="material-symbols-outlined text-[24px]">
            {mobileOpen ? 'close' : 'menu'}
          </span>
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-fadeIn"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer Menu */}
      <aside
        className={`fixed top-16 left-0 bottom-0 w-[280px] bg-navy-deep text-white shadow-2xl flex flex-col p-4 z-50 md:hidden transform transition-transform duration-200 border-r border-slate-800 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderNavLinks()}
      </aside>

      {/* Desktop Persistent Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-[280px] bg-navy-deep text-white shadow-xl flex-col p-4 z-40 hidden md:flex border-r border-slate-800/60">
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-5 px-2 mt-2">
          <div className="w-10 h-10 bg-primary-container text-on-yellow-text rounded-xl flex items-center justify-center font-black text-xl shadow-soft">
            EP
          </div>
          <div>
            <h1 className="font-headline-md text-headline-md font-extrabold text-white leading-tight">
              EventPoint
            </h1>
            <p className="font-body-sm text-body-sm text-slate-400 leading-tight">
              Gestão & Logística
            </p>
          </div>
        </div>

        {renderNavLinks()}
      </aside>
    </>
  );
}
