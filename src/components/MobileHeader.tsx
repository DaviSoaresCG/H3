'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User } from '@/types';

interface MobileHeaderProps {
  userName?: string;
  avatarUrl?: string | null;
}

export function MobileHeader({ userName: propUserName, avatarUrl: propAvatarUrl }: MobileHeaderProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setCurrentUser(data.user);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchUserData();

    // Sincroniza em tempo real caso o usuário edite o perfil
    const handleProfileUpdate = () => {
      fetchUserData();
    };

    window.addEventListener('user-profile-updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('user-profile-updated', handleProfileUpdate);
    };
  }, [fetchUserData]);

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

  const displayName = propUserName || currentUser?.name || 'Colaborador';
  const displayAvatar = propAvatarUrl !== undefined ? propAvatarUrl : currentUser?.avatarUrl;
  const initial = displayName.trim().charAt(0).toUpperCase() || 'C';

  return (
    <header className="bg-surface border-b border-surface-variant flex justify-between items-center w-full px-4 h-16 fixed top-0 left-0 right-0 z-40 md:hidden shadow-xs">
      {/* Colaborador: Foto de Perfil & Nome */}
      <Link href="/perfil" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
        <div className="w-9 h-9 rounded-full bg-navy-deep text-primary-container flex items-center justify-center font-black text-sm shadow-xs border border-surface-variant overflow-hidden flex-shrink-0">
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>

        <span className="text-headline-md font-headline-md font-bold text-on-surface truncate max-w-[210px]">
          {displayName}
        </span>
      </Link>

      {/* Ação de Logout */}
      <button
        onClick={handleLogout}
        className="text-on-surface-variant hover:text-alert-error p-2 rounded-full hover:bg-surface-container transition-colors flex items-center justify-center"
        title="Sair da conta"
        aria-label="Sair da conta"
      >
        <span className="material-symbols-outlined text-[22px]">logout</span>
      </button>
    </header>
  );
}
