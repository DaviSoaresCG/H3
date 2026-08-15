import { AdminSidebar } from '@/components/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col md:flex-row">
      <AdminSidebar />
      <div className="flex-1 md:pl-[280px] flex flex-col min-w-0 pt-16 md:pt-0">
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
