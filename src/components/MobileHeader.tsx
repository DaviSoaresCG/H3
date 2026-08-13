'use client';

import { useRouter } from 'next/navigation';

interface MobileHeaderProps {
  gpsStatus?: 'OK' | 'UNAVAILABLE';
}

export function MobileHeader({ gpsStatus = 'OK' }: MobileHeaderProps) {
  const router = useRouter();

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

  const isGpsOk = gpsStatus === 'OK';

  return (
    <header className="bg-surface border-b border-border-subtle flex justify-between items-center w-full px-4 h-16 fixed top-0 left-0 right-0 z-40 md:hidden shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-navy-deep text-white flex items-center justify-center font-black text-sm shadow-sm">
          EP
        </div>
        <span className="text-headline-md font-headline-md font-bold text-primary">EventPoint</span>
      </div>

      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1 bg-surface-card border border-border-subtle px-2.5 py-1 rounded-full shadow-sm text-[11px] font-bold ${
            isGpsOk ? 'text-success-vibrant' : 'text-alert-warning'
          }`}
        >
          <span
            className="material-symbols-outlined text-[14px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {isGpsOk ? 'satellite_alt' : 'signal_disconnected'}
          </span>
          <span>{isGpsOk ? 'GPS ATIVO' : 'SEM GPS'}</span>
        </div>

        <button
          onClick={handleLogout}
          className="text-on-surface-variant hover:text-alert-error p-1.5 rounded-full hover:bg-surface-container transition-colors"
          title="Sair da conta"
          aria-label="Sair"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </header>
  );
}
