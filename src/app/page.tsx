'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated) {
          if (data.user.role === 'ADMIN') {
            router.push('/admin/dashboard');
          } else {
            router.push('/ponto');
          }
        } else {
          router.push('/login');
        }
      } catch (e) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4"></div>
      <p className="text-slate-400 text-sm">Carregando EventPoint...</p>
    </div>
  );
}
