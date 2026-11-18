'use client';

import { ChromeProvider, useChrome } from '@/components/ChromeContext';
import { Onboarding, TOUR_EVENT } from '@/components/Onboarding';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Sparkles,
  FolderKanban,
  Database,
  Users,
  LogOut,
  Zap,
  FileCog,
  Wrench,
  Search,
  Bell,
  RefreshCw,
  Send,
  ArrowLeft, HelpCircle,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { AUTH_ENABLED } from '@/lib/auth-config';
import { authLinkType } from '@/lib/supabase';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ChromeProvider>
      <AppShellInner>{children}</AppShellInner>
    </ChromeProvider>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { hideTopBar } = useChrome();
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, logout, activeCases, cloudStatus, refreshFromCloud, authLoading } = useApp();

  // Invite and password-reset links must land on the set-password screen, not the app
  useEffect(() => {
    if (AUTH_ENABLED && authLinkType && pathname !== '/set-password') router.replace('/set-password');
  }, [pathname, router]);

  // If on login or set-password page, do not show navigation shell
  if (pathname === '/login' || pathname === '/set-password') {
    return <>{children}</>;
  }

  // Real sign-in is checking the saved session: do not flash pages or bounce to login yet
  if (authLoading) {
    return <div className="h-[100dvh] w-screen flex items-center justify-center bg-[#F4F5F7] text-sm text-slate-500">Loading…</div>;
  }

  const navItems = [
    {
      href: '/',
      label: 'Procurement Dashboard',
      shortLabel: 'Home',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      href: '/agent/quotation',
      label: 'Make a Quotation',
      shortLabel: 'Quote',
      icon: Sparkles,
      active: pathname.startsWith('/agent'),
    },
    {
      href: '/cases',
      label: 'Sales Navigator',
      shortLabel: 'Cases',
      icon: FolderKanban,
      active: pathname === '/cases',
      count: activeCases.filter((c) => !c.templateState?.lifecycle?.archived).length,
    },
    {
      href: '/sourcing',
      label: 'Smart RFQ Dispatcher',
      shortLabel: 'Dispatch',
      icon: Send,
      active: pathname.startsWith('/sourcing'),
    },
    {
      href: '/tools',
      label: 'Engineering Tools',
      shortLabel: 'Tools',
      icon: Wrench,
      active: pathname.startsWith('/tools'),
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
      label: 'Quote Template',
      shortLabel: 'Template',
      icon: FileCog,
      active: pathname.startsWith('/settings'),
    },
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/');
  };

  const syncDot =
    cloudStatus === 'connected' ? 'bg-emerald-500' : cloudStatus === 'syncing' ? 'bg-amber-500 animate-pulse' : 'bg-slate-400';
  const syncTitle =
    cloudStatus === 'connected' ? 'Saved to the cloud. Click to sync again.' : cloudStatus === 'syncing' ? 'Syncing…' : 'Offline: working from this computer. Click to try syncing.';
  const isHome = pathname === '/';

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden bg-[#F4F5F7] text-slate-900 select-none">
      <Onboarding />
      {/* =========================================================================
          1. MINIMALIST LEFT SIDE NAVIGATION RAIL (Full Height, Edge-to-Edge)
      ========================================================================= */}
      <aside className="hidden md:flex w-16 lg:w-20 bg-white border-r border-slate-200/80 flex-col items-center py-5 justify-between flex-shrink-0 z-30 shadow-xs">
        {/* Top: Logo & Search Circle & Nav Icons */}
        <div className="flex flex-col items-center space-y-6 w-full">
          {/* Top Brand Logo */}
          <Link
            href="/"
            className="w-10 h-10 rounded-2xl bg-slate-950 hover:bg-[#FF4D6D] text-white flex items-center justify-center shadow-md transition-all active:scale-95"
            title="Qri Quantix OS"
          >
            <Zap className="w-5 h-5 fill-white text-white" />
          </Link>

          {/* Circular Search Trigger */}
          <button
            onClick={() => router.push('/settings/databank')}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center border border-slate-200 transition-all active:scale-95 cursor-pointer"
            title="Search Data Bank"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Primary Nav Icons (Tools inside Left Panel!) */}
          <nav className="flex flex-col items-center space-y-3 w-full px-2 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all group relative ${
                    item.active
                      ? 'bg-slate-950 text-white shadow-md shadow-slate-950/20 font-bold scale-105'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title={item.label}
                >
                  <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${item.active ? 'text-[#FF4D6D]' : ''}`} />
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

        {/* Bottom: sync, notifications, profile, sign out */}
        <div className="flex flex-col items-center w-full px-2 space-y-2.5">
          <button
            onClick={() => refreshFromCloud()}
            className="relative w-10 h-10 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title={syncTitle}
          >
            <RefreshCw className={`w-[18px] h-[18px] ${cloudStatus === 'syncing' ? 'animate-spin text-amber-600' : ''}`} />
            <span className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${syncDot}`} />
          </button>
          <button
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => window.dispatchEvent(new Event(TOUR_EVENT))}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Take the quick tour"
          >
            <HelpCircle className="w-[18px] h-[18px]" />
          </button>
          <div
            className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center cursor-default"
            title={`${currentUser?.name ?? ''}${currentUser?.role ? ' · ' + currentUser.role : ''}`}
          >
            {currentUser?.avatar || (currentUser?.name ?? '?').slice(0, 2).toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN WORKSPACE (Full Screen Space, Edge-to-Edge)
      ========================================================================= */}
      <div className="flex-1 flex flex-col h-[calc(100dvh-3.5rem)] md:h-[100dvh] overflow-hidden bg-[#F4F5F7]">
        {/* One slim top bar: back button on the left, the page's own buttons beside it.
            On the home page it only shows on phones (profile and sync live in the left rail on larger screens). */}
        <header className={`h-11 px-3 sm:px-4 bg-white border-b border-slate-200/80 items-center gap-2 flex-shrink-0 z-20 print:hidden ${isHome || hideTopBar ? 'flex md:hidden' : 'flex'}`}>
          {!isHome && (
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer flex-shrink-0"
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back</span>
            </button>
          )}
          <div id="topbar-actions" className="flex flex-1 min-w-0 flex-wrap items-center gap-2 justify-end sm:justify-start" />
          {/* Phones only: sync and profile (the left rail is hidden on phones) */}
          <div className="md:hidden flex items-center gap-2 flex-shrink-0 ml-auto">
            <button onClick={() => refreshFromCloud()} className="relative w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" title={syncTitle}>
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${cloudStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span className={`absolute top-0 right-0 w-2 h-2 rounded-full ${syncDot}`} />
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-[11px] flex items-center justify-center" title={`${currentUser?.name ?? ''} · ${currentUser?.role ?? ''}`}>
              {currentUser?.avatar || (currentUser?.name ?? '?').slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Workspace Content (Full Screen Space, Edge-to-Edge) */}
        <div
          className={`flex-1 flex flex-col overflow-hidden ${
            pathname.startsWith('/agent') || pathname.startsWith('/tools')
              ? 'p-2 sm:p-3 sm:pt-2'
              : 'p-3 sm:p-6'
          }`}
        >
          {children}
        </div>
      </div>

      {/* =========================================================================
          3. MOBILE BOTTOM NAVIGATION (Phones Only, Fixed Bottom)
      ========================================================================= */}
      <nav className="md:hidden h-14 bg-white border-t border-slate-200 px-2 flex items-center justify-around z-40 pb-[env(safe-area-inset-bottom)] flex-shrink-0 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-xs transition-all relative ${
                item.active ? 'text-[#FF4D6D] font-bold scale-105' : 'text-slate-400 hover:text-slate-600'
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
