"use client";

import CloseFullscreenOutlinedIcon from "@mui/icons-material/CloseFullscreenOutlined";
import OpenInFullOutlinedIcon from "@mui/icons-material/OpenInFullOutlined";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState, type ReactNode } from "react";
import { ResumePdfViewer, type ResumePdfViewerProps } from "@/components/resumes/resume-pdf-viewer";

type ResumePdfViewerShellProps = ResumePdfViewerProps & {
  toolbar?: ReactNode;
};

function ExpandHeaderButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip title="Expand preview">
      <IconButton aria-label="Expand preview" onClick={onClick} size="small">
        <OpenInFullOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}

export function ResumePdfViewerShell(props: ResumePdfViewerShellProps) {
  const [expanded, setExpanded] = useState(false);
  const { toolbar, ...viewerProps } = props;

  return (
    <>
      <Stack spacing={1}>
        {toolbar ? (
          <Box sx={{ minWidth: 0 }}>{toolbar}</Box>
        ) : null}
        <ResumePdfViewer
          {...viewerProps}
          headerTrailing={<ExpandHeaderButton onClick={() => setExpanded(true)} />}
        />
      </Stack>

      <Dialog fullScreen open={expanded} onClose={() => setExpanded(false)}>
        <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: "background.default" }}>
          <Stack spacing={2} sx={{ maxWidth: 900, mx: "auto" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="h3">{viewerProps.title ?? "Resume preview"}</Typography>
                {viewerProps.subtitle ? (
                  <Typography variant="body2" color="text.secondary">{viewerProps.subtitle}</Typography>
                ) : null}
              </Box>
              <Tooltip title="Close expanded preview">
                <IconButton aria-label="Close expanded preview" onClick={() => setExpanded(false)}>
                  <CloseFullscreenOutlinedIcon />
                </IconButton>
              </Tooltip>
            </Stack>
            <ResumePdfViewer
              {...viewerProps}
              title={undefined}
              subtitle={undefined}
              maxWidth={900}
            />
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
