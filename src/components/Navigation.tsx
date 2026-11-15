'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileSpreadsheet,
  Coins,
  ShieldCheck,
  Zap,
  PlusCircle,
  UserCheck,
  Sparkles,
} from 'lucide-react';

interface NavigationProps {
  onOpenQuickAdd: () => void;
  activeRefNumber?: string;
}

export function Navigation({ onOpenQuickAdd, activeRefNumber }: NavigationProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<string>('Ali Khan (Senior Procurement)');

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenQuickAdd();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenQuickAdd]);

  const navItems = [
    {
      href: '/',
      label: 'Quotation Workspace',
      icon: FileSpreadsheet,
      active: pathname === '/',
    },
    {
      href: '/ledger',
      label: 'Price Gold Mine & WhatsApp Bot',
      icon: Coins,
      active: pathname === '/ledger',
    },
    {
      href: '/admin',
      label: 'CTO God Mode Admin',
      icon: ShieldCheck,
      active: pathname === '/admin',
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 border-b border-slate-800 backdrop-blur-md px-4 py-2 flex items-center justify-between text-xs select-none">
      {/* Left: Brand & Engine Identity */}
      <div className="flex items-center space-x-4">
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="w-7 h-7 rounded bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-black text-slate-950 shadow-md shadow-amber-500/20">
            <Zap className="w-4 h-4 fill-slate-950" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white flex items-center space-x-1.5">
              <span>OOS ENGINE</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-mono font-semibold">
                v1.2
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-wider">
              INDUSTRIAL PROCUREMENT &amp; PROPOSALS
            </div>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 ml-4 pl-4 border-l border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                  item.active
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${item.active ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right: Quick Action, Active Ref & User Profile */}
      <div className="flex items-center space-x-3">
        {/* Active Quotation Reference Badge */}
        {activeRefNumber && (
          <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded font-mono">
            <span className="text-slate-400 text-[10px]">CURRENT REF:</span>
            <span className="text-amber-400 font-bold">{activeRefNumber}</span>
          </div>
        )}

        {/* Quick Add Rate Button (Ctrl+K) */}
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium px-2.5 py-1.5 rounded shadow-sm shadow-emerald-900/30 active:scale-95 transition-all cursor-pointer"
          title="Quick Add Rate to Gold Mine (Ctrl+K)"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>+ Quick-Add Rate</span>
          <kbd className="hidden sm:inline-block bg-emerald-700/60 text-[9px] px-1 py-0.5 rounded text-emerald-100 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* User Switcher */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-800 text-slate-300">
          <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
            <UserCheck className="w-3.5 h-3.5" />
          </div>
          <select
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="Ali Khan (Senior Procurement)">Ali Khan (Procurement)</option>
            <option value="Hamza Rauf (Procurement Engineer)">Hamza Rauf (Engineer)</option>
            <option value="Tariq Mehmood (CTO)">Tariq Mehmood (CTO Admin)</option>
          </select>
        </div>
      </div>
    </header>
  );
}
