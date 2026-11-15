'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function RootPage() {
  const router = useRouter();
  const { currentUser } = useApp();

  useEffect(() => {
    if (currentUser) {
      router.replace('/agent/quotation');
    } else {
      router.replace('/login');
    }
  }, [currentUser, router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-400 text-xs font-mono">
      Routing to Quotation Agent...
    </div>
  );
}
