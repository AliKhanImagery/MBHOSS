'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Lock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Opened from an invite or "forgot password" email. Lets the person choose their own password.
export default function SetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState<'checking' | 'yes' | 'no'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (alive && data.session) setReady('yes');
    };
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (alive && session) setReady('yes');
    });
    // the link logs the person in within a moment; if it never does, the link is no good
    const t = setTimeout(() => {
      if (alive) setReady((r) => (r === 'checking' ? 'no' : r));
    }, 4000);
    return () => {
      alive = false;
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Please use at least 8 characters.');
    if (password !== confirm) return setError('The two passwords are not the same.');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) return setError('Could not save the password. The link may have expired. Go to the sign-in page and use "Forgot your password?".');
    // full reload so the app starts clean without the link in the address bar
    window.location.replace('/');
  };

  const field = 'w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#FF4D6D] focus:bg-white';

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-[#F4F5F7] p-4">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-slate-950 items-center justify-center text-white shadow-md mb-1">
            <Zap className="w-6 h-6 fill-white text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Choose your password</h1>
          <p className="text-xs text-slate-500">You will use it with your work email to sign in.</p>
        </div>

        {ready === 'checking' && <p className="text-sm text-slate-500 text-center">Checking your link…</p>}

        {ready === 'no' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs p-3">
              This link has expired or was already used. Go to the sign-in page and press <b>Forgot your password?</b> to get a new one, or ask an admin.
            </div>
            <button type="button" onClick={() => router.push('/login')} className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-xl cursor-pointer">
              Go to sign in
            </button>
          </div>
        )}

        {ready === 'yes' && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="pw">New password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input id="pw" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1" htmlFor="pw2">Type it again</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input id="pw2" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} />
              </div>
            </div>
            {error && (
              <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs p-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}
            <button type="submit" disabled={busy} className="w-full py-3 bg-slate-900 hover:bg-black text-white font-bold text-sm rounded-xl disabled:opacity-50 cursor-pointer">
              {busy ? 'Saving…' : 'Save password and continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
