import Sidebar from '@/src/components/layout/Sidebar';

export default function MainLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar />
      <div className="flex-1 ml-56 flex flex-col min-h-screen">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
