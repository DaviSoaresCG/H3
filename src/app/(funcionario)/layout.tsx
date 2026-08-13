import { MobileHeader } from '@/components/MobileHeader';
import { MobileBottomNav } from '@/components/MobileBottomNav';

export default function FuncionarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col">
      <MobileHeader />
      <main className="flex-1 pt-16 pb-24 px-4 max-w-lg mx-auto w-full flex flex-col">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  );
}
