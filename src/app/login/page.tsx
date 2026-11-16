'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, UserCheck, Lock, Mail, AlertTriangle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const { loginAsAliKhan, signIn, authEnabled, authLoading, currentUser } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // already signed in
  useEffect(() => {
    if (!authLoading && currentUser) router.replace('/');
  }, [authLoading, currentUser, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await signIn(email, password);
    setBusy(false);
    if (res.ok) router.push('/');
    else setError(res.error ?? 'Could not sign in.');
  };

  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const forgot = async () => {
    setError(null);
    setResetMsg(null);
    if (!email.trim()) {
      setError('Type your work email above first, then press "Forgot your password?".');
      return;
    }
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/set-password` });
    setResetMsg('If that email is set up for this app, a link to choose a new password is on its way. Check your inbox.');
  };

  const field = 'w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white';

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#F4F5F7] p-4">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-slate-950 items-center justify-center text-white shadow-md mb-1">
            <Zap className="w-6 h-6 fill-white text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Sign in</h1>
          <p className="text-xs text-slate-500">Use the work email your admin set up for you.</p>
        </div>

        {authEnabled ? (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="email">Work email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input id="email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
              </div>
            </div>
            {error && (
              <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs p-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}
            <button type="submit" disabled={busy} className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-xl disabled:opacity-50 cursor-pointer">
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            {resetMsg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs p-3">{resetMsg}</div>}
            <button type="button" onClick={forgot} className="w-full text-[11px] text-slate-500 hover:text-slate-900 underline cursor-pointer">Forgot your password?</button>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs p-3">
              <b>Sign-in is switched off.</b> The app is in developer mode, so anyone with the link can get in as an admin. Turn on real sign-in before the team uses it (see docs/AUTH_ROLLOUT.md).
            </div>
            <button
              type="button"
              onClick={() => { loginAsAliKhan(); router.push('/'); }}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-[#FF4D6D]" /> Continue in developer mode
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
