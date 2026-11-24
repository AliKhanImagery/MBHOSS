'use client';

// The bell: quotes waiting for MY approval, and answers (approved / sent back) on quotes I own.
// Everything is worked out from the saved quotes, so nothing extra is stored in the database.
// "Seen" is remembered on this device only.
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, RotateCcw, Hourglass } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { inboxFor } from '@/lib/quote-approval';
import { attention } from '@/lib/project-cases';

const seenKey = (uid: string) => `qri_seen_inbox_${uid}`;
const readSeen = (uid: string): string[] => {
  try { const v = JSON.parse(localStorage.getItem(seenKey(uid)) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
};

export default function NotificationBell({ variant }: { variant: 'rail' | 'phone' }) {
  const router = useRouter();
  const { currentUser, activeCases, projectCases, loadCase, refreshFromCloud } = useApp();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  const uid = currentUser?.id ?? '';
  useEffect(() => { if (uid) setSeen(readSeen(uid)); }, [uid]);

  const items = useMemo(
    () => inboxFor(activeCases, currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : null, new Date()),
    [activeCases, currentUser?.id, currentUser?.name, currentUser?.role]
  );
  const todayIso = new Date().toISOString().slice(0, 10);
  const reminders = useMemo(() => attention(projectCases, todayIso).filter((a) => a.reason !== 'no_next_action'), [projectCases, todayIso]);
  const unread = items.filter((i) => i.needsAction || !seen.includes(i.key)).length + reminders.length;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void refreshFromCloud(); // pick up anything a colleague just did
    else markSeen();
  };
  const markSeen = () => {
    if (!uid) return;
    const all = [...new Set([...seen, ...items.map((i) => i.key)])].slice(-200);
    setSeen(all);
    try { localStorage.setItem(seenKey(uid), JSON.stringify(all)); } catch { /* private mode: fine */ }
  };
  const goCase = (id: string) => { setOpen(false); markSeen(); router.push(`/tracker?case=${id}`); };
  const go = (caseId: string) => { setOpen(false); markSeen(); loadCase(caseId); router.push('/agent/quotation'); };

  const icon = (k: string) => (k === 'approve' ? <Hourglass className="w-4 h-4 text-blue-600" /> : k === 'approved' ? <Check className="w-4 h-4 text-emerald-600" /> : <RotateCcw className="w-4 h-4 text-amber-600" />);

  const button = variant === 'rail' ? (
    <button onClick={toggle} className="relative w-10 h-10 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer" title="Notifications" aria-label="Notifications">
      <Bell className="w-[18px] h-[18px]" />
      {unread > 0 && <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-[#FF4D6D] text-white text-[9px] font-mono font-bold flex items-center justify-center">{unread}</span>}
    </button>
  ) : (
    <button onClick={toggle} className="relative w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center" title="Notifications" aria-label="Notifications">
      <Bell className="w-3.5 h-3.5 text-slate-600" />
      {unread > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#FF4D6D] text-white text-[9px] font-mono font-bold flex items-center justify-center">{unread}</span>}
    </button>
  );

  return (
    <>
      {button}
      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={toggle} />
          <div role="dialog" aria-label="Notifications" className={`fixed z-[61] bg-white border border-slate-200 rounded-2xl shadow-2xl w-[calc(100vw-1.5rem)] max-w-sm text-xs ${variant === 'rail' ? 'left-[4.5rem] bottom-16' : 'right-3 top-12'}`}>
            <div className="px-4 py-3 border-b border-slate-100 font-bold text-slate-900 text-sm">Notifications</div>
            {reminders.length > 0 && (
              <ul className="divide-y divide-slate-100 border-b border-slate-100">
                {reminders.map(({ c, reason }) => (
                  <li key={c.id}>
                    <button onClick={() => goCase(c.id)} className="w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 cursor-pointer">
                      <span className={`font-bold w-16 flex-shrink-0 ${reason === 'overdue' ? 'text-rose-700' : 'text-amber-700'}`}>{reason === 'overdue' ? 'Overdue' : 'Today'}</span>
                      <span className="flex-1 min-w-0"><span className="block font-semibold text-slate-800 truncate">{c.title}</span><span className="block text-slate-600 truncate">{c.nextAction}{c.nextActionDue ? ` · ${c.nextActionDue}` : ''}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {items.length === 0 && reminders.length === 0 ? (
              <div className="p-5 text-center text-slate-500">Nothing needs you right now.</div>
            ) : items.length === 0 ? null : (
              <ul className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
                {items.map((i) => (
                  <li key={i.key}>
                    <button onClick={() => go(i.caseId)} className="w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 cursor-pointer">
                      <span className="mt-0.5">{icon(i.kind)}</span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-baseline gap-2"><span className="font-mono font-bold text-[#FF4D6D]">{i.caseRef}</span><span className="font-semibold text-slate-800 truncate">{i.clientName}</span></span>
                        <span className="block text-slate-600 mt-0.5">{i.text}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{i.at.slice(0, 10)}</span>
                      </span>
                      {(i.needsAction || !seen.includes(i.key)) && <span className="mt-1.5 w-2 h-2 rounded-full bg-[#FF4D6D] flex-shrink-0" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  );
}
