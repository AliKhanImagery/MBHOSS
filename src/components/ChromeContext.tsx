'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ChromeState {
  hideTopBar: boolean;
  setHideTopBar: (v: boolean) => void;
}

const Ctx = createContext<ChromeState>({ hideTopBar: false, setHideTopBar: () => {} });

export function ChromeProvider({ children }: { children: React.ReactNode }) {
  const [hideTopBar, setHideTopBar] = useState(false);
  return <Ctx.Provider value={{ hideTopBar, setHideTopBar }}>{children}</Ctx.Provider>;
}

export const useChrome = () => useContext(Ctx);

/** A page calls this to hide the slim top bar on larger screens (it brings its own header with a Back button). */
export function useHideTopBar(hide: boolean) {
  const { setHideTopBar } = useChrome();
  useEffect(() => {
    setHideTopBar(hide);
    return () => setHideTopBar(false);
  }, [hide, setHideTopBar]);
}
