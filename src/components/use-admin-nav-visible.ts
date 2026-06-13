"use client";

import { useEffect, useState } from "react";

const ADMIN_NAV_KEY = "adminNavVisible";
export const ADMIN_NAV_CHANGE_EVENT = "admin-nav-change";

export function useAdminNavVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function readFlag() {
      setVisible(localStorage.getItem(ADMIN_NAV_KEY) === "1");
    }

    readFlag();

    fetch("/api/admin/session")
      .then((response) => response.json())
      .then((payload: { active?: boolean }) => {
        if (!payload.active) {
          localStorage.removeItem(ADMIN_NAV_KEY);
          setVisible(false);
        }
      })
      .catch(() => undefined);

    window.addEventListener(ADMIN_NAV_CHANGE_EVENT, readFlag);
    return () => window.removeEventListener(ADMIN_NAV_CHANGE_EVENT, readFlag);
  }, []);

  return visible;
}

export function markAdminNavVisible() {
  localStorage.setItem(ADMIN_NAV_KEY, "1");
  window.dispatchEvent(new CustomEvent(ADMIN_NAV_CHANGE_EVENT));
}

export function clearAdminNavVisible() {
  localStorage.removeItem(ADMIN_NAV_KEY);
  window.dispatchEvent(new CustomEvent(ADMIN_NAV_CHANGE_EVENT));
}
