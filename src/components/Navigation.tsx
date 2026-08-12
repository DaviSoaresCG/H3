'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export function Navigation({ userRole }: { userRole?: 'EMPLOYEE' | 'ADMIN' }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    document.cookie = 'eventpoint_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    router.push('/login');
  };

  if (pathname === '/login') return null;

  return (
    <>
      {/* Top Header para Admin e Mobile */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 sticky top-0 z-50 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-lg shadow-sm">
            E
          </div>
          <div>
            <h1 className="font-bold text-white tracking-tight leading-none text-base">EventPoint</h1>
            <span className="text-[10px] text-emerald-400 font-medium tracking-wide uppercase">
              {userRole === 'ADMIN' ? 'Painel do Gestor' : 'App Mobile Operacional'}
            </span>
          </div>
        </div>

        {/* Links de navegação no Desktop para Admin */}
        {userRole === 'ADMIN' && (
          <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
            <Link
              href="/admin/dashboard"
              className={`px-3 py-1.5 rounded-md transition ${
                pathname === '/admin/dashboard' ? 'bg-slate-700 text-emerald-400' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              📊 Ao Vivo
            </Link>
            <Link
              href="/admin/frota"
              className={`px-3 py-1.5 rounded-md transition ${
                pathname === '/admin/frota' ? 'bg-slate-700 text-emerald-400' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              🚗 Frota & Manutenção
            </Link>
            <Link
              href="/admin/ponto"
              className={`px-3 py-1.5 rounded-md transition ${
                pathname === '/admin/ponto' ? 'bg-slate-700 text-emerald-400' : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              📄 Espelho & Folha
            </Link>
          </nav>
        )}

        <button
          onClick={handleLogout}
          className="text-xs text-slate-400 hover:text-rose-400 bg-slate-700/40 hover:bg-slate-700 px-2.5 py-1.5 rounded-md border border-slate-700 transition"
        >
          Sair 🚪
        </button>
      </header>

      {/* Mobile Bottom Navigation Bar para Funcionários */}
      {userRole !== 'ADMIN' && (
        <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-50 flex items-center justify-around py-2 px-2 shadow-lg md:hidden">
          <Link
            href="/ponto"
            className={`flex flex-col items-center justify-center w-full py-1 text-xs font-medium rounded-lg transition ${
              pathname === '/ponto' ? 'text-emerald-400 bg-slate-700/60' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">⏱️</span>
            <span>Ponto & Áudio</span>
          </Link>
          <Link
            href="/frota"
            className={`flex flex-col items-center justify-center w-full py-1 text-xs font-medium rounded-lg transition ${
              pathname === '/frota' ? 'text-emerald-400 bg-slate-700/60' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">🚗</span>
            <span>Frota</span>
          </Link>
          <Link
            href="/tecnicas"
            className={`flex flex-col items-center justify-center w-full py-1 text-xs font-medium rounded-lg transition ${
              pathname === '/tecnicas' ? 'text-emerald-400 bg-slate-700/60' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg">🎧</span>
            <span>Técnicas</span>
          </Link>
        </nav>
      )}
    </>
  );
}
