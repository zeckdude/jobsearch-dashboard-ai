"use client";

import FindReplaceOutlinedIcon from "@mui/icons-material/FindReplaceOutlined";
import { ActionButton } from "@/components/action-button";

export function DetectJobQualityControl() {
  return (
    <ActionButton
      postTo="/api/jobs/detect-duplicates"
      body={{ limit: 1000 }}
      variant="outlined"
      startIcon={<FindReplaceOutlinedIcon />}
      loadingLabel="Checking..."
      message="Duplicate and stale job check finished."
    >
      Check duplicates
    </ActionButton>
  );
}
