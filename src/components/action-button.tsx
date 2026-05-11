"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import { useState } from "react";

type ActionButtonProps = {
  children: React.ReactNode;
  href?: string;
  postTo?: string;
  body?: unknown;
  message?: string;
  method?: "POST" | "GET";
  variant?: "text" | "outlined" | "contained";
  color?: "primary" | "secondary" | "success" | "error" | "warning" | "info";
  size?: "small" | "medium" | "large";
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
};

export function ActionButton({
  children,
  href,
  postTo,
  body,
  message,
  method = "POST",
  variant = "text",
  color = "primary",
  size = "medium",
  startIcon,
  endIcon,
}: ActionButtonProps) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [severity, setSeverity] = useState<"success" | "error" | "info">("info");
  const [loading, setLoading] = useState(false);

  if (href) {
    return (
      <Button component={Link} href={href} variant={variant} color={color} size={size} startIcon={startIcon} endIcon={endIcon}>
        {children}
      </Button>
    );
  }

  async function runAction() {
    if (!postTo) {
      setSeverity("info");
      setNotice(message ?? "No action is configured for this control.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(postTo, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Action failed.");
      setSeverity("success");
      setNotice(message ?? payload.message ?? "Action completed.");
      router.refresh();
    } catch (error) {
      setSeverity("error");
      setNotice(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant={variant} color={color} size={size} startIcon={startIcon} endIcon={endIcon} disabled={loading} onClick={runAction}>
        {loading ? "Working..." : children}
      </Button>
      <Snackbar open={Boolean(notice)} autoHideDuration={4500} onClose={() => setNotice("")}>
        <Alert severity={severity} variant="filled" onClose={() => setNotice("")}>
          {notice}
        </Alert>
      </Snackbar>
    </>
  );
}
