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
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#F4F5F7] p-4 relative overflow-hidden select-none">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-slate-950 items-center justify-center text-white font-black shadow-md mb-1">
            <Zap className="w-6 h-6 fill-white text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center justify-center space-x-2">
            <span>Qri Procurement OS</span>
            <span className="text-[10px] px-2 py-0.5 bg-rose-50 text-[#FF4D6D] border border-rose-200 rounded-full font-mono font-bold">
              v2.0
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Agentic Procurement Router &amp; Live Quotation Operating System
          </p>
        </div>

        {/* ONE-CLICK SUPER ADMIN BYPASS BUTTON */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleBypass}
            className="w-full py-3 px-4 bg-slate-900 hover:bg-black text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-[#FF4D6D]" />
            <span>Bypass Login as Ali Khan (Super Admin)</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
          <p className="text-[11px] text-center text-slate-400 font-mono">
            * 1-click developer bypass to access AI Agent &amp; Live Document
          </p>
        </div>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-100"></div>
          <span className="flex-shrink mx-3 text-[10px] text-slate-400 uppercase tracking-wider font-mono">
            Or standard sign in
          </span>
          <div className="flex-grow border-t border-slate-100"></div>
        </div>

        {/* Standard Form */}
        <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Work Email Address:
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer border border-slate-200"
          >
            Sign In with Credentials
          </button>
        </form>

        {/* Footer Features */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Offline-First Dev Mode</span>
          </span>
          <span>Local Storage Active</span>
        </div>
      </div>
    </div>
  );
}
