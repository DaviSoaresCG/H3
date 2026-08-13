'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
      label: 'Frota',
      href: '/admin/frota',
      icon: 'local_shipping',
    },
    {
      label: 'Viagens',
      href: '/admin/viagens',
      icon: 'route',
    },
    {
      label: 'Fichas Técnicas',
      href: '/admin/tecnicas',
      icon: 'assignment',
    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-[280px] bg-primary-container text-on-primary-container shadow-md flex flex-col p-4 gap-2 z-40 hidden md:flex">
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-6 px-2 mt-2">
        <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center text-on-secondary font-bold text-xl shadow-soft">
          EP
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md font-extrabold text-on-primary leading-tight">
            EventPoint
          </h1>
          <p className="font-body-sm text-body-sm text-on-primary-container opacity-80 leading-tight">
            Logística Operacional
          </p>
        </div>
      </div>

      {/* Quick Action Button */}
      <Link
        href="/admin/ponto"
        className="mb-4 w-full bg-secondary text-on-secondary font-label-bold text-label-bold py-3 rounded-lg shadow-soft hover:brightness-110 active:translate-y-px active:shadow-none transition-all flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
          add
        </span>
        Novo Relatório
      </Link>

      {/* Navigation Items */}
      <nav className="flex-1 flex flex-col gap-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all duration-200 ${
                isActive
                  ? 'bg-secondary text-on-secondary shadow-sm translate-x-1'
                  : 'text-on-primary-container opacity-80 hover:opacity-100 hover:bg-on-primary-fixed-variant/40 hover:text-white'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="font-body-md text-body-md">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="pt-4 border-t border-on-primary-fixed-variant/30 flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold">
            AD
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">Admin Gestor</p>
            <p className="text-[10px] text-on-primary-container opacity-80">Logística & Frota</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-on-primary-container hover:text-alert-error transition-colors p-1.5 rounded-lg hover:bg-slate-800"
          title="Sair do sistema"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </aside>
  );
}
