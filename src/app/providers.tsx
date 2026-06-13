"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { JoleneAgentButton } from "@/components/jolene-agent-button";
import { FloatingChromeOffsetProvider } from "@/components/floating-chrome-offset-context";
import { WorkflowCoachProvider } from "@/components/workflow-coach/WorkflowCoachContext";
import { WorkflowCoachButton } from "@/components/workflow-coach/WorkflowCoachButton";
import { WorkflowCoachDrawer } from "@/components/workflow-coach/WorkflowCoachDrawer";
import { theme } from "./theme";
import React from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <FloatingChromeOffsetProvider>
        <WorkflowCoachProvider>
          {children}
          <WorkflowCoachButton />
          <WorkflowCoachDrawer />
        </WorkflowCoachProvider>
        <JoleneAgentButton />
      </FloatingChromeOffsetProvider>
    </ThemeProvider>
  );
}
