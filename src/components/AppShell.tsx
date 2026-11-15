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
  Wrench,
  Search,
  Bell,
  Sun,
  Moon,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, activeCases } = useApp();

  // If on login page, do not show navigation shell
  if (pathname === '/login') {
    return <>{children}</>;
  }

  const navItems = [
    {
      href: '/agent/quotation',
      label: 'Quotation Agent',
      shortLabel: 'Agent',
      icon: Sparkles,
      active: pathname.startsWith('/agent'),
    },
    {
      href: '/cases',
      label: 'Sales Navigator',
      shortLabel: 'Cases',
      icon: FolderKanban,
      active: pathname === '/cases',
      count: activeCases.length,
    },
    {
      href: '/settings/databank',
      label: 'Data Bank',
      shortLabel: 'Data',
      icon: Database,
      active: pathname === '/settings/databank',
    },
    {
      href: '/tools',
      label: 'Engineering Tools',
      shortLabel: 'Tools',
      icon: Wrench,
      active: pathname === '/tools',
      badge: 'New',
    },
    {
      href: '/settings/templates',
      label: 'Settings & Rules',
      shortLabel: 'Settings',
      icon: FileCog,
      active: pathname.startsWith('/settings'),
    },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-[#101114] text-slate-100 select-none p-1 sm:p-2 md:p-3">
      {/* =========================================================================
          TOP OUTER HEADER (Desktop/Tablet Branding Bar)
      ========================================================================= */}
      <header className="hidden sm:flex h-9 px-3 items-center justify-between text-xs text-slate-400 flex-shrink-0 mb-1.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-5 h-5 rounded-md bg-[#FF4D6D] flex items-center justify-center text-white font-black shadow-sm">
            <Zap className="w-3 h-3 fill-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white flex items-center space-x-1.5">
            <span>Qri Quantix</span>
            <span className="text-[9px] px-1.5 py-0.2 bg-white/10 text-slate-300 rounded-full font-mono">
              OS v2.0
            </span>
          </span>
        </div>

        <div className="flex items-center space-x-4 text-[11px] font-medium text-slate-400">
          <span className="hidden md:inline">Procurement &amp; Commercial Engine</span>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>
            <span className="font-mono text-[10px]">Online • LocalStore</span>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN FLOATING ISLAND CANVAS (Light Silver-Gray #EBEBF0)
      ========================================================================= */}
      <div className="flex-1 flex flex-col rounded-2xl sm:rounded-[28px] md:rounded-[32px] bg-[#EBEBF0] text-[#111216] shadow-2xl overflow-hidden border border-white/10 relative">
        {/* Island Top Navigation Bar */}
        <div className="h-14 sm:h-16 px-3 sm:px-5 bg-[#EBEBF0] border-b border-[#D8D8E0] flex items-center justify-between flex-shrink-0 z-30">
          {/* Left: Quick Search Button & Brand Mark */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => router.push('/settings/databank')}
              className="w-9 h-9 rounded-full bg-[#111216] hover:bg-slate-800 text-white flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer flex-shrink-0"
              title="Search Data Bank"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Desktop / Tablet Horizontal Pill Navigation */}
            <nav className="hidden md:flex items-center space-x-1 bg-[#DFDFE6] p-1 rounded-full border border-[#D0D0DA]">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                    item.active
                      ? 'bg-[#FF4D6D] text-white shadow-sm shadow-[#FF4D6D]/30'
                      : 'text-[#505460] hover:text-[#111216] hover:bg-[#D5D5DC]'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        item.active ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-800'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right: User Avatar & Session Controls */}
          <div className="flex items-center space-x-2.5">
            <Link
              href="/tools"
              className="hidden lg:flex items-center space-x-1 px-3 py-1 rounded-full bg-[#111216] hover:bg-slate-800 text-white text-[11px] font-semibold transition-colors"
            >
              <Wrench className="w-3 h-3 text-[#FF4D6D]" />
              <span>Tools</span>
            </Link>

            {/* User Profile Pill */}
            <div className="flex items-center space-x-2 bg-white/80 border border-[#D5D5DF] pl-1 pr-2.5 py-1 rounded-full shadow-xs">
              <div className="w-6 h-6 rounded-full bg-[#111216] text-[#FF4D6D] font-bold text-[10px] flex items-center justify-center">
                {currentUser?.avatar || 'AK'}
              </div>
              <span className="text-xs font-bold text-[#111216] hidden sm:inline truncate max-w-[100px]">
                {currentUser?.name || 'Ali Khan'}
              </span>
            </div>

            {/* Logout Trigger */}
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-full bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-[#D5D5DF] flex items-center justify-center transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content Workspace inside the Island Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#EBEBF0]">
          {children}
        </div>
      </div>

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION (Natural Thumb Arc with Coral Active Indicator)
      ========================================================================= */}
      <nav className="md:hidden h-14 bg-[#101114]/95 backdrop-blur-md border-t border-slate-800/80 px-2 flex items-center justify-around z-40 pb-[env(safe-area-inset-bottom)] flex-shrink-0 mt-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] transition-all relative ${
                item.active ? 'text-[#FF4D6D] font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.shortLabel}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className="absolute top-0.5 right-3 w-3.5 h-3.5 rounded-full bg-[#FF4D6D] text-white text-[8px] font-mono font-bold flex items-center justify-center">
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
