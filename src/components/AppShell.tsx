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
      href: '/tools',
      label: 'Engineering Tools',
      shortLabel: 'Tools',
      icon: Wrench,
      active: pathname === '/tools',
    },
    {
      href: '/settings/databank',
      label: 'Data Bank',
      shortLabel: 'Data',
      icon: Database,
      active: pathname === '/settings/databank',
    },
    {
      href: '/settings/templates',
      label: 'Settings & Rules',
      shortLabel: 'Settings',
      icon: FileCog,
      active: pathname.startsWith('/settings'),
    },
  ];

  const currentSection = navItems.find((n) => n.active) || navItems[0];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden bg-[#0E0F12] text-slate-100 select-none p-1 sm:p-2.5 md:p-3.5">
      {/* =========================================================================
          1. OUTER HEADER (Desktop/Tablet Branding Bar - Matches Reference Top)
      ========================================================================= */}
      <header className="hidden sm:flex h-9 px-3 items-center justify-between text-sm text-slate-300 flex-shrink-0 mb-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-5 h-5 rounded-md bg-[#FF4D6D] flex items-center justify-center text-white font-black shadow-sm">
            <Zap className="w-3.5 h-3.5 fill-white" />
          </div>
          <span className="font-bold text-base tracking-tight text-white flex items-center space-x-2">
            <span>Quantix</span>
            <span className="text-xs px-2 py-0.5 bg-white/10 text-slate-300 rounded-full font-mono">
              Qri OS
            </span>
          </span>
        </div>

        <div className="flex items-center space-x-4 text-xs font-semibold text-slate-400">
          <span className="text-slate-300">{currentSection.label}</span>
          <div className="flex items-center space-x-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>
            <span className="font-mono text-xs">Live • LocalStore</span>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. MAIN FLOATING ISLAND CANVAS (Light Silver-Gray #ECECF1)
      ========================================================================= */}
      <div className="flex-1 flex flex-row rounded-2xl sm:rounded-[28px] md:rounded-[32px] bg-[#ECECF1] text-[#111216] shadow-2xl overflow-hidden border border-white/10 relative">
        {/* =======================================================================
            2A. LEFT SIDE PANEL NAVIGATION (Matches Reference Left Navigation Rail)
        ======================================================================= */}
        <aside className="hidden md:flex w-16 lg:w-20 bg-[#ECECF1] border-r border-[#D8D8E2] flex-col items-center py-5 justify-between flex-shrink-0 z-30 select-none">
          {/* Top: Logo & Search Circle & Nav Icons */}
          <div className="flex flex-col items-center space-y-6 w-full">
            {/* Top Brand Mark */}
            <Link
              href="/agent/quotation"
              className="w-10 h-10 rounded-2xl bg-[#111216] text-white flex items-center justify-center shadow-md hover:scale-105 transition-transform"
              title="Qri Quantix OS"
            >
              <Zap className="w-5 h-5 fill-white text-white" />
            </Link>

            {/* Circular Search Button */}
            <button
              onClick={() => router.push('/settings/databank')}
              className="w-10 h-10 rounded-full bg-[#111216] text-white hover:bg-slate-800 flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer"
              title="Search Data Bank"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Navigation Icons (Including Tools in Navigation Panel!) */}
            <nav className="flex flex-col items-center space-y-3 w-full px-2 pt-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all group relative ${
                      item.active
                        ? 'bg-[#111216] text-[#FF4D6D] shadow-md shadow-black/20 font-bold scale-105'
                        : 'text-[#505460] hover:text-[#111216] hover:bg-black/5'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                    {item.count !== undefined && item.count > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF4D6D] text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-sm">
                        {item.count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom: Sign Out */}
          <div className="flex flex-col items-center w-full px-2">
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-[#686C78] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </aside>

        {/* =======================================================================
            2B. WORKSPACE (To the right of the Left Navigation Rail)
        ======================================================================= */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#ECECF1]">
          {/* Top Horizontal Bar: Pill Nav + Session Controls */}
          <div className="h-14 sm:h-16 px-4 sm:px-6 bg-[#ECECF1] border-b border-[#D8D8E2]/80 flex items-center justify-between flex-shrink-0 z-20">
            {/* Horizontal Pill Navigation (Matches Reference) */}
            <nav className="hidden sm:flex items-center space-x-1.5 overflow-x-auto py-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center space-x-2 ${
                    item.active
                      ? 'bg-[#FF4D6D] text-white shadow-md shadow-[#FF4D6D]/30'
                      : 'text-[#4A4E58] hover:text-[#111216] hover:bg-[#DCDCE4]'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                        item.active ? 'bg-white/20 text-white' : 'bg-slate-300 text-slate-800'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            {/* Mobile Header Title */}
            <div className="sm:hidden font-bold text-base text-[#111216] truncate">
              {currentSection.label}
            </div>

            {/* Right Controls: Theme Pill, Bell, Avatar */}
            <div className="flex items-center space-x-2.5">
              {/* Theme Toggle Pill */}
              <div className="hidden lg:flex items-center bg-white border border-[#D5D5DF] rounded-full p-1 shadow-xs">
                <button className="px-2 py-1 rounded-full text-xs font-semibold bg-[#111216] text-white">
                  <Moon className="w-3.5 h-3.5" />
                </button>
                <button className="px-2 py-1 rounded-full text-xs font-semibold text-slate-500 hover:text-black">
                  <Sun className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Notification Bell */}
              <button
                className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-[#D5D5DF] flex items-center justify-center shadow-xs transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
              </button>

              {/* User Avatar Circle */}
              <div className="flex items-center space-x-2 bg-white border border-[#D5D5DF] pl-1 pr-3 py-1 rounded-full shadow-xs">
                <div className="w-7 h-7 rounded-full bg-[#111216] text-[#FF4D6D] font-extrabold text-xs flex items-center justify-center">
                  {currentUser?.avatar || 'AK'}
                </div>
                <span className="text-xs sm:text-sm font-bold text-[#111216] hidden sm:inline truncate max-w-[110px]">
                  {currentUser?.name || 'Ali Khan'}
                </span>
              </div>
            </div>
          </div>

          {/* Subheader: Page Title & Actions (Matches Reference 'Procurement Dashboard' text-3xl) */}
          <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/settings/databank')}
                className="md:hidden w-8 h-8 rounded-full bg-[#111216] text-white flex items-center justify-center"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#111216]">
                {currentSection.label}
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-1.5 rounded-full bg-[#111216] hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <span>Refresh</span>
                <span className="text-slate-400">↻</span>
              </button>
            </div>
          </div>

          {/* Main Content Workspace */}
          <div className="flex-1 flex flex-col overflow-hidden p-2 sm:p-4 md:p-6 pt-1 sm:pt-2">
            {children}
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. MOBILE BOTTOM NAVIGATION (Including Tools inside Navigation)
      ========================================================================= */}
      <nav className="md:hidden h-14 bg-[#101114]/95 backdrop-blur-md border-t border-slate-800/80 px-2 flex items-center justify-around z-40 pb-[env(safe-area-inset-bottom)] flex-shrink-0 mt-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-xs transition-all relative ${
                item.active ? 'text-[#FF4D6D] font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
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
