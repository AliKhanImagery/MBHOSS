'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, UserCheck, Lock, Mail, AlertTriangle, Eye, EyeOff, ArrowRight, Loader2, ShieldCheck, Calculator, Hash, Database } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

// Shown on the sign-in page. The name matches the app's existing title.
const PRODUCT = 'Qri AI';
const TAGLINE = 'Procurement operating system';

// Only things the app really does today.
const POINTS = [
  { icon: Database, title: 'Prices you can trust', text: 'The assistant only uses prices from your Data Bank, or ones you type yourself. It never makes one up.' },
  { icon: Hash, title: 'Your own quotation numbers', text: 'Each person has their own number range, issued automatically.' },
  { icon: Calculator, title: 'Engineering tools built in', text: 'Tanks, piping, tax, import costs, switchgear and motors, one click away.' },
];

export default function LoginPage() {
  const router = useRouter();
  const { loginAsAliKhan, signIn, authEnabled, authLoading, currentUser } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);
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

  const field =
    'peer w-full h-14 bg-white/70 border border-slate-200 rounded-2xl pl-11 pr-4 pt-5 pb-1 text-[15px] text-slate-900 placeholder-transparent shadow-sm transition focus:outline-none focus:border-[#FF4D6D] focus:ring-4 focus:ring-[#FF4D6D]/15 focus:bg-white';
  const label =
    'pointer-events-none absolute left-11 top-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 transition-all peer-placeholder-shown:top-[1.1rem] peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-placeholder-shown:font-medium peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:font-semibold peer-focus:text-[#FF4D6D]';

  return (
    <div className="h-[100dvh] w-screen overflow-y-auto bg-[#F4F5F7] text-slate-900">
      <div className="min-h-full grid lg:grid-cols-[1.05fr_1fr]">
        {/* ───────── Brand panel ───────── */}
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-950 text-white p-12 xl:p-16">
          {/* depth: soft glows + fine grid */}
          <div aria-hidden className="absolute -top-40 -left-32 w-[34rem] h-[34rem] rounded-full bg-[#FF4D6D]/25 blur-[120px]" />
          <div aria-hidden className="absolute -bottom-48 -right-24 w-[30rem] h-[30rem] rounded-full bg-indigo-500/20 blur-[120px]" />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(ellipse at 30% 20%, #000 20%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse at 30% 20%, #000 20%, transparent 75%)' }}
          />

          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur flex items-center justify-center">
              <Zap className="w-5 h-5 fill-white text-white" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold tracking-tight">{PRODUCT}</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/50">{TAGLINE}</div>
            </div>
          </div>

          <div className="relative max-w-xl">
            {/* decorative document, no real figures */}
            <div aria-hidden className="mb-10 w-72 rotate-[-4deg] rounded-2xl bg-white/[0.06] ring-1 ring-white/15 backdrop-blur-md p-5 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between mb-4">
                <div className="h-2.5 w-20 rounded-full bg-white/30" />
                <div className="h-5 w-14 rounded-full bg-[#FF4D6D]/80" />
              </div>
              {[70, 92, 56, 80].map((w, i) => (
                <div key={i} className="flex items-center gap-3 mb-2.5">
                  <div className="h-2 rounded-full bg-white/20" style={{ width: `${w}%` }} />
                  <div className="h-2 w-8 rounded-full bg-white/10 ml-auto" />
                </div>
              ))}
              <div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
                <div className="h-3 w-16 rounded-full bg-white/40" />
              </div>
            </div>

            <h2 className="text-4xl xl:text-[2.75rem] font-bold tracking-tight leading-[1.1]">
              Quotes, sourcing and engineering,
              <span className="block bg-gradient-to-r from-[#FF4D6D] to-[#ff9a6d] bg-clip-text text-transparent">in one calm workspace.</span>
            </h2>

            <ul className="mt-9 space-y-5">
              {POINTS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <span className="mt-0.5 w-9 h-9 flex-shrink-0 rounded-xl bg-white/[0.07] ring-1 ring-white/15 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#FF8FA3]" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="block text-[13px] leading-relaxed text-white/55">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex items-center gap-2 text-xs text-white/40">
            <ShieldCheck className="w-4 h-4" /> Private to your team. Access is set up by your admin.
          </div>
        </aside>

        {/* ───────── Sign-in ───────── */}
        <main className="relative flex items-center justify-center p-5 sm:p-10">
          <div aria-hidden className="lg:hidden absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#FF4D6D]/15 blur-[90px]" />
          <div className="relative w-full max-w-[26rem]">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center shadow-md">
                <Zap className="w-5 h-5 fill-white text-white" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold">{PRODUCT}</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{TAGLINE}</div>
              </div>
            </div>

            <div className="mb-8">
              <h1 className="text-[1.75rem] font-bold tracking-tight text-slate-900">Welcome back</h1>
              <p className="mt-1.5 text-sm text-slate-500">Sign in with the work email your admin set up for you.</p>
            </div>

            {authEnabled ? (
              <form onSubmit={submit} className="space-y-4" noValidate={false}>
                <div className="relative">
                  <Mail className="w-[18px] h-[18px] text-slate-400 absolute left-4 top-[1.15rem] z-10" />
                  <input id="email" type="email" required autoComplete="username" placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
                  <label htmlFor="email" className={label}>Work email</label>
                </div>
                <div className="relative">
                  <Lock className="w-[18px] h-[18px] text-slate-400 absolute left-4 top-[1.15rem] z-10" />
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock') ?? false)}
                    className={`${field} pr-12`}
                  />
                  <label htmlFor="password" className={label}>Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-3 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    {showPw ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                  </button>
                </div>
                {caps && <div className="text-[11px] font-semibold text-amber-700">Caps Lock is on.</div>}

                {error && (
                  <div role="alert" className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs p-3.5">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-px" /> {error}
                  </div>
                )}
                {resetMsg && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs p-3.5">{resetMsg}</div>}

                <button
                  type="submit"
                  disabled={busy}
                  className="group relative w-full h-14 rounded-2xl bg-slate-950 hover:bg-black text-white font-semibold text-[15px] shadow-lg shadow-slate-900/20 transition disabled:opacity-60 cursor-pointer overflow-hidden"
                >
                  <span aria-hidden className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[#FF4D6D] to-transparent opacity-80" />
                  <span className="relative flex items-center justify-center gap-2">
                    {busy ? (<><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>) : (<>Sign in <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></>)}
                  </span>
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button type="button" onClick={forgot} className="text-xs font-medium text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline cursor-pointer">Forgot your password?</button>
                  <span className="text-xs text-slate-400">Need access? Ask your admin.</span>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 text-xs p-3.5">
                  <b>Sign-in is switched off.</b> The app is in developer mode, so anyone with the link can get in as an admin. Turn on real sign-in before the team uses it (see docs/AUTH_ROLLOUT.md).
                </div>
                <button
                  type="button"
                  onClick={() => { loginAsAliKhan(); router.push('/'); }}
                  className="w-full h-14 px-4 bg-slate-950 hover:bg-black text-white font-semibold text-[15px] rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-[#FF4D6D]" /> Continue in developer mode
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
