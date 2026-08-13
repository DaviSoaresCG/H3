'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function MobileBottomNav() {
  const pathname = usePathname();

  const tabs = [
    {
      label: 'Ponto',
      href: '/ponto',
      icon: 'timer',
    },
    {
      label: 'Frota',
      href: '/frota',
      icon: 'directions_car',
    },
    {
      label: 'Viagens',
      href: '/viagens',
      icon: 'route',
    },
    {
      label: 'Técnicas',
      href: '/tecnicas',
      icon: 'assignment',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center px-2 pb-4 pt-2 bg-surface border-t border-border-subtle shadow-lg rounded-t-xl md:hidden">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || (tab.href !== '/ponto' && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center transition-all duration-200 ${
              isActive
                ? 'bg-secondary-container text-on-secondary-container rounded-full px-4 py-1 font-bold'
                : 'text-on-surface-variant px-3 py-1 hover:bg-surface-container-low rounded-lg'
            }`}
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {tab.icon}
            </span>
            <span className="text-[11px] font-label-bold mt-0.5">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
