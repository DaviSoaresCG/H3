import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EventPoint — Gestão de Ponto, Frota e Relatos por Voz',
  description: 'Sistema de gestão de ponto com GPS, frota e relatos diários em áudio por IA para empresas de locação de eventos.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased bg-slate-900 text-slate-100 flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}
