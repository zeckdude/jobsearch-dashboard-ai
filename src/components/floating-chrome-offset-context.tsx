"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type FloatingChromeOffsetContextValue = {
  bottomOffset: number;
  setBottomOffset: (offset: number) => void;
};

const FloatingChromeOffsetContext = createContext<FloatingChromeOffsetContextValue>({
  bottomOffset: 0,
  setBottomOffset: () => undefined,
});

export function FloatingChromeOffsetProvider({ children }: { children: ReactNode }) {
  const [bottomOffset, setBottomOffset] = useState(0);
  const value = useMemo(() => ({ bottomOffset, setBottomOffset }), [bottomOffset]);
  return <FloatingChromeOffsetContext.Provider value={value}>{children}</FloatingChromeOffsetContext.Provider>;
}

export function useFloatingChromeOffset() {
  return useContext(FloatingChromeOffsetContext);
}
