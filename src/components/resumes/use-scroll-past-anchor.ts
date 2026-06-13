"use client";

import { type RefObject, useEffect, useState } from "react";

export function useScrollPastAnchor(anchorRef: RefObject<HTMLElement | null>): boolean {
  const [scrolledPast, setScrolledPast] = useState(false);

  useEffect(() => {
    const element = anchorRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setScrolledPast(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-64px 0px 0px 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [anchorRef]);

  return scrolledPast;
}
