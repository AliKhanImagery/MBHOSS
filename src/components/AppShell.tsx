'use client';

import React from 'react';
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
      href: '/',
      label: 'Procurement Dashboard',
      shortLabel: 'Home',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
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
    <div className="flex flex-col md:flex-row h-[100dvh] w-screen overflow-hidden bg-[#F4F5F7] text-slate-900 select-none">
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

        {/* Bottom: Sign Out */}
        <div className="flex flex-col items-center w-full px-2">
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
        {/* Minimalist Top App Bar (ZERO Navigation Repetition) */}
        <header className="h-14 sm:h-16 px-4 sm:px-8 bg-white border-b border-slate-200/80 flex items-center justify-between flex-shrink-0 z-20">
          {/* Left: Section Title in Helvetica */}
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-sans">
              {currentSection.label}
            </h1>
            <span className="hidden sm:inline-flex items-center space-x-1.5 text-xs text-slate-400 font-medium pl-2 border-l border-slate-200">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>
              <span>Online • LocalStore</span>
            </span>
          </div>

          {/* Right Controls: Live Pipeline Metric, Quick Search, Notification, User Pill */}
          <div className="flex items-center space-x-3">
            {/* Live Pipeline Metric Pill in Header */}
            <div className="hidden lg:flex items-center space-x-2 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-full text-xs font-mono shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-slate-500 font-medium">Pipeline:</span>
              <span className="font-bold text-slate-900">
                Rs. {new Intl.NumberFormat('en-PK').format(activeCases.reduce((sum, c) => sum + (c.totalPKR || 0), 0))}
              </span>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            {/* Notification Bell */}
            <button
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 flex items-center justify-center transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center space-x-2.5 bg-slate-100 border border-slate-200 pl-1.5 pr-3 py-1 rounded-full shadow-xs">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                {currentUser?.avatar || 'AK'}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser?.name || 'Ali Khan'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium leading-none">
                  {currentUser?.role || 'Super Admin'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Workspace Content (Full Screen Space, Edge-to-Edge) */}
        <div
          className={`flex-1 flex flex-col overflow-hidden ${
            pathname.startsWith('/agent') ? 'p-2 sm:p-3' : 'p-3 sm:p-6'
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
