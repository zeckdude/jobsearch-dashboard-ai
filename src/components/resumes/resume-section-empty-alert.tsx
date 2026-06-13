"use client";

import Alert from "@mui/material/Alert";
import type { ReactNode } from "react";

type ResumeSectionEmptyAlertProps = {
  children: ReactNode;
};

/** Inline empty-state notice inside resume section editors (work history, education, etc.). */
export function ResumeSectionEmptyAlert({ children }: ResumeSectionEmptyAlertProps) {
  return <Alert severity="info" sx={{ mt: 1.5 }}>{children}</Alert>;
}
