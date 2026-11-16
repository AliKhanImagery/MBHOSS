'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** Pages put their toolbar buttons here; they appear in the app's single slim top bar. */
export function TopBarActions({ children }: { children: React.ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById('topbar-actions'));
  }, []);
  return slot ? createPortal(children, slot) : null;
}
