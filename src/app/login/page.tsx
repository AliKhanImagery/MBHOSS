'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, ShieldCheck, ArrowRight, UserCheck, Lock, Mail } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function LoginPage() {
  const router = useRouter();
  const { loginAsAliKhan } = useApp();
  const [email, setEmail] = useState('ali.khan@qriprocurement.com');
  const [password, setPassword] = useState('••••••••••••');

  const handleBypass = () => {
    loginAsAliKhan();
    router.push('/agent/quotation');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginAsAliKhan();
    router.push('/agent/quotation');
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden select-none">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-500/10 blur-[140px] pointer-events-none rounded-full" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/25 mb-1">
            <Zap className="w-7 h-7 fill-slate-950" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center justify-center space-x-2">
            <span>Qri Procurement OS</span>
            <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-mono font-bold">
              v2.0
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Agentic Procurement Router &amp; Live Quotation Operating System
          </p>
        </div>

        {/* ONE-CLICK SUPER ADMIN BYPASS BUTTON */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleBypass}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer border border-amber-300/40"
          >
            <UserCheck className="w-4 h-4 text-slate-950" />
            <span>⚡ Bypass Login as Ali Khan (Super Admin)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-[10px] text-center text-slate-500 font-mono">
            * Instant 1-click developer bypass to access AI Agent &amp; Live Document
          </p>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-wider font-mono">
            Or standard sign in
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Standard Form */}
        <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Work Email Address:
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Password:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer border border-slate-700"
          >
            Sign In with Credentials
          </button>
        </form>

        {/* Footer Features */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Offline-First Dev Mode</span>
          </span>
          <span>Local Storage Active</span>
        </div>
      </div>
    </div>
  );
}
