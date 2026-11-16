'use client';

// A short first-run tour. Shown once per person (remembered on this device), skippable at any
// time, and it can be replayed from the help button in the side rail. Every sentence here
// describes something the app really does.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, X, Sparkles, Hash, ListChecks, Wrench, ShieldCheck, Hand } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatRef } from '@/lib/quote-range';

export const TOUR_EVENT = 'qri:tour';
const keyFor = (userId: string) => `qri_tour_done_v1_${userId}`;

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
}

export function Onboarding() {
  const { currentUser, isAdmin } = useApp();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const primary = useRef<HTMLButtonElement>(null);

  const finish = () => {
    setOpen(false);
    try { if (currentUser) localStorage.setItem(keyFor(currentUser.id), '1'); } catch { /* ignore */ }
  };

  // First visit: open after a short pause so the page has settled.
  useEffect(() => {
    if (!currentUser) return;
    let seen = false;
    try { seen = localStorage.getItem(keyFor(currentUser.id)) === '1'; } catch { /* ignore */ }
    if (seen) return;
    const t = setTimeout(() => { setI(0); setOpen(true); }, 700);
    return () => clearTimeout(t);
  }, [currentUser]);

  // Replay from the help button
  useEffect(() => {
    const on = () => { setI(0); setOpen(true); };
    window.addEventListener(TOUR_EVENT, on);
    return () => window.removeEventListener(TOUR_EVENT, on);
  }, []);

  const range = currentUser?.features?.quoteRange;
  const first = (currentUser?.name ?? '').split(' ')[0];

  const steps: Step[] = useMemo(() => {
    const s: Step[] = [
      {
        icon: Hand,
        title: first ? `Welcome, ${first}` : 'Welcome',
        body: 'This is your team’s workspace for quotations, sourcing cases and engineering calculators. A one-minute look around, and you can skip it any time.',
      },
      {
        icon: Sparkles,
        title: 'Tell the assistant what to put on the quote',
        body: 'Type it in plain words, like “Client is Acme Foods, payment 30 days”. It only uses prices from your Data Bank, or ones you type yourself. If something is missing, it asks you instead of guessing.',
      },
      {
        icon: Hash,
        title: 'Your quotation numbers',
        body: range
          ? <>Your numbers run from <b>{formatRef(range, range.start)}</b> to <b>{formatRef(range, range.end)}</b>. The next free one is filled in for you, so you never have to type it.</>
          : 'Your admin has not given you a quotation number range yet. Ask them before you make a quotation.',
      },
      {
        icon: ListChecks,
        title: 'Check before you download',
        body: 'The panel beside the quotation lists what must be fixed (red) and what is worth a second look (amber). The terms and conditions are yours to edit, line by line, for each quotation.',
      },
      {
        icon: Wrench,
        title: 'Tools and saved quotations',
        body: 'Tools has six calculators for tanks, piping, tax, import costs, switchgear and motors. Cases keeps every quotation you save, so you can open it again later.',
      },
    ];
    if (isAdmin) {
      s.push({
        icon: ShieldCheck,
        title: 'For admins',
        body: 'Under Template you set the company’s quotation format. Under Users you give each person their number range and switch features on or off. Keep Data Bank prices current, because every quote depends on them.',
      });
    }
    return s;
  }, [first, range, isAdmin]);

  useEffect(() => { if (open) primary.current?.focus(); }, [open, i]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') finish(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentUser]);

  if (!open || !currentUser) return null;
  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 print:hidden" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={finish} />
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl shadow-slate-900/30 ring-1 ring-slate-200 p-6 sm:p-7 select-text">
        <button onClick={finish} aria-label="Skip the tour" className="absolute top-4 right-4 w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer">
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-md mb-4">
          <Icon className="w-5 h-5 text-[#FF8FA3]" />
        </div>
        <h2 id="tour-title" className="text-lg font-bold tracking-tight text-slate-900 pr-8">{step.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-1.5" aria-label={`Step ${i + 1} of ${steps.length}`}>
            {steps.map((_, n) => (
              <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-6 bg-[#FF4D6D]' : 'w-1.5 bg-slate-200'}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {i > 0 ? (
              <button onClick={() => setI(i - 1)} className="h-10 px-3 rounded-full text-sm font-semibold text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer"><ArrowLeft className="w-4 h-4" /> Back</button>
            ) : (
              <button onClick={finish} className="h-10 px-3 rounded-full text-sm font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer">Skip</button>
            )}
            <button
              ref={primary}
              onClick={() => (last ? finish() : setI(i + 1))}
              className="h-10 px-5 rounded-full bg-slate-950 hover:bg-black text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              {last ? 'Got it' : 'Next'} {!last && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
