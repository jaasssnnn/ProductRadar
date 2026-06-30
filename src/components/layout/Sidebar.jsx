'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Upload, BarChart2, TrendingUp, Activity, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { createClient } from '../../lib/supabase/client';

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { escalatedCount } = useApp();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const navItems = [
    { to: '/upload',    icon: Upload,    label: 'Upload' },
    { to: '/dashboard', icon: BarChart2, label: 'Dashboard' },
    { to: '/insights',  icon: TrendingUp, label: 'Insights' },
    { to: '/changes',   icon: Activity,  label: 'Changes', badge: escalatedCount },
  ];

  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col px-4 py-8 bg-black border-r border-white/10 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-10">
        <img src="/logo.png" alt="ProductRadar" className="w-9 h-9" />
        <span className="text-sm font-extrabold text-white tracking-tight">ProductRadar</span>
      </div>

      <p className="px-3 mb-3 text-[11px] font-bold uppercase tracking-widest text-white/25">Main</p>

      <nav className="flex flex-col gap-1.5 flex-1">
        {navItems.map(({ to, icon: Icon, label, badge }) => {
          const isActive = pathname === to || (to !== '/upload' && pathname.startsWith(to));
          return (
            <Link
              key={to}
              href={to}
              className={`flex items-center gap-3 px-4 py-3 rounded-chip text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:bg-white/5 hover:text-white/70'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.6} />
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center bg-red-500/20 text-red-400">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-white/10 pt-4 mt-4">
          <div className="flex items-center gap-3 px-3 mb-2">
            <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-bold text-white/70">{initials}</span>
            </div>
            <p className="text-xs text-white/40 font-medium truncate flex-1">
              {user.user_metadata?.full_name || user.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-chip text-xs font-semibold text-white/25 hover:bg-white/5 hover:text-white/50 transition-all"
          >
            <LogOut size={14} strokeWidth={1.6} />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
