import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Armchair, Database, ExternalLink, LayoutDashboard, LogOut,
  Package, ReceiptText, Settings, ShoppingCart, UtensilsCrossed,
} from 'lucide-react';
import supabase from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Stats } from '../../lib/types';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/register', label: 'Register', icon: ShoppingCart, end: false },
  { to: '/admin/orders', label: 'Orders', icon: ReceiptText, end: false, badge: true },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed, end: false },
  { to: '/admin/tables', label: 'Tables', icon: Armchair, end: false },
  { to: '/admin/inventory', label: 'Inventory', icon: Package, end: false },
  { to: '/admin/schema', label: 'Schema SQL', icon: Database, end: false },
  // Admin-only in practice: /api/settings PUT is guarded server-side by
  // requireAdmin (api/settings.js). There's no client-side role in
  // AuthContext yet to hide this link for non-admin staff, so any staff
  // member can open the page but only admins can actually save changes.
  { to: '/admin/settings', label: 'Settings', icon: Settings, end: false },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-lg shadow-md shadow-orange-500/40">🍽️</div>
      <div>
        <p className="font-display text-[15px] font-extrabold leading-none text-white">Restolink</p>
        <p className="text-[10px] font-medium tracking-wide text-zinc-500">POS · RMS</p>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Real active-order total from /api/stats, not a count over the latest
  // 60 fetched orders — that cap meant the badge silently stopped
  // climbing once there were more than 60 orders in play.
  const [activeCount, setActiveCount] = useState(0);
  useEffect(() => {
    const load = () => fetch('/api/stats').then((r) => r.json()).then((s: Stats) => setActiveCount(s.active_orders)).catch(console.error);
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition ${
      isActive ? 'bg-brand-500 text-white shadow-md shadow-orange-500/30' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'
    }`;

  return (
    <div className="min-h-screen bg-zinc-100">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-zinc-950 p-4 lg:flex">
        <Brand />
        <nav className="mt-8 flex-1 space-y-1.5">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={linkCls}>
              <n.icon size={17} />
              {n.label}
              {n.badge && activeCount > 0 && (
                <span className="ml-auto rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">{activeCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100">
          <ExternalLink size={15} /> Customer e-menu
        </a>
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 font-display text-sm font-bold text-white">
            {(user?.email || 'S')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white">{user?.email}</p>
            <p className="text-[10px] text-zinc-500">Administrator</p>
          </div>
          <button onClick={signOut} className="text-zinc-500 transition hover:text-red-400" aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="sticky top-0 z-40 bg-zinc-950 px-4 pb-2 pt-3 lg:hidden">
        <div className="flex items-center justify-between">
          <Brand />
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noreferrer" className="text-zinc-400"><ExternalLink size={17} /></a>
            <button onClick={signOut} className="text-zinc-400" aria-label="Sign out"><LogOut size={17} /></button>
          </div>
        </div>
        <nav className="no-scrollbar -mx-1 mt-3 flex gap-1 overflow-x-auto px-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to} to={n.to} end={n.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  isActive ? 'bg-brand-500 text-white' : 'text-zinc-400'
                }`
              }
            >
              <n.icon size={13} /> {n.label}
              {n.badge && activeCount > 0 && <span className="rounded-full bg-white/20 px-1.5 text-[10px] font-bold">{activeCount}</span>}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="min-h-screen lg:pl-64">
        <Outlet />
      </main>
    </div>
  );
}
