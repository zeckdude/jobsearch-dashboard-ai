"use client";

import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";
import Chip from "@mui/material/Chip";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NeedsMeLiveRefresh() {
  const router = useRouter();
  const refreshTimer = useRef<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  useEffect(() => {
    const events = new EventSource("/api/agent-user-requests/stream");

    events.addEventListener("ready", () => {
      setConnected(true);
    });
    events.addEventListener("needs-me", (event) => {
      const payload = parseStreamPayload(event);
      setConnected(true);
      setLastUpdate(payload?.at ?? new Date().toISOString());
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        router.refresh();
      }, 150);
    });
    events.addEventListener("heartbeat", () => {
      setConnected(true);
    });
    events.onerror = () => {
      setConnected(false);
    };

    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      events.close();
    };
  }, [router]);

  return (
    <Chip
      size="small"
      color={connected ? "success" : "warning"}
      variant="outlined"
      icon={<SyncOutlinedIcon />}
      label={lastUpdate ? `Live updated ${new Date(lastUpdate).toLocaleTimeString()}` : connected ? "Live alerts on" : "Live reconnecting"}
    />
  );
}

function parseStreamPayload(event: Event) {
  try {
    return JSON.parse((event as MessageEvent).data) as { at?: string };
  } catch {
    return null;
  }
}
