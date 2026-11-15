'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles,
  FolderKanban,
  Database,
  Users,
  LogOut,
  Zap,
  Layers,
  ChevronRight,
  ShieldAlert,
  FileCog,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, activeCases } = useApp();

  // If on login page, do not show navigation sidebar
  if (pathname === '/login') {
    return <>{children}</>;
  }

  const navItems = [
    {
      href: '/agent/quotation',
      label: 'Quotation Agent',
      icon: Sparkles,
      active: pathname.startsWith('/agent'),
      badge: 'AI Core',
    },
    {
      href: '/cases',
      label: 'Active Cases',
      icon: FolderKanban,
      active: pathname === '/cases',
      count: activeCases.length,
    },
    {
      href: '/settings/databank',
      label: 'Data Bank',
      icon: Database,
      active: pathname === '/settings/databank',
    },
    {
      href: '/settings/templates',
      label: 'Template Rules',
      icon: FileCog,
      active: pathname === '/settings/templates',
      badge: 'Rules',
    },
    {
      href: '/settings/users',
      label: 'User Access',
      icon: Users,
      active: pathname === '/settings/users',
    },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Sleek Icon-based Sidebar */}
      <aside className="w-16 md:w-60 flex-shrink-0 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between z-30 transition-all duration-200">
        {/* Top: Brand Header */}
        <div>
          <div className="h-14 border-b border-slate-800/80 px-3 md:px-4 flex items-center justify-between">
            <Link href="/agent/quotation" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <Zap className="w-4 h-4 fill-slate-950" />
              </div>
              <div className="hidden md:block">
                <div className="font-extrabold text-sm tracking-tight text-white flex items-center space-x-1.5">
                  <span>Qri OS</span>
                  <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded font-mono font-bold">
                    v2.0
                  </span>
                </div>
                <div className="text-[9px] text-slate-400 tracking-wider font-mono uppercase">
                  Procurement Agent
                </div>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-2 space-y-1 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                    item.active
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
                  }`}
                  title={item.label}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                        item.active ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span className="hidden md:inline">{item.label}</span>
                  </div>

                  {/* Badges / Counters */}
                  <div className="hidden md:flex items-center">
                    {item.badge && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">
                        {item.badge}
                      </span>
                    )}
                    {item.count !== undefined && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                        {item.count}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: User Card & Sign Out */}
        <div className="p-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-bold text-xs flex-shrink-0">
                {currentUser?.avatar || 'AK'}
              </div>
              <div className="hidden md:block truncate">
                <div className="text-xs font-bold text-slate-100 truncate">
                  {currentUser?.name || 'Guest'}
                </div>
                <div className="text-[10px] text-amber-400/90 font-mono truncate">
                  {currentUser?.role || 'Super Admin'}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Page Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
        {children}
      </div>
    </div>
  );
}
