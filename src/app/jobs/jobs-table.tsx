"use client";

import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ActionButton } from "@/components/action-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreChip } from "@/components/ui/score-chip";
import { StatusChip } from "@/components/ui/status-chip";

export type JobsTableMatch = {
  id: string;
  jobId: string;
  score: number;
  title: string;
  company: string;
  location: string;
  status: string;
  profileName: string;
  sourceName: string;
  strongestMatches: string[];
};

type StatusView = "active" | "rejected" | "archived" | "all";

export function JobsTable({ matches, statusView }: { matches: JobsTableMatch[]; statusView: StatusView }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [severity, setSeverity] = useState<"success" | "error" | "info">("info");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = matches.length > 0 && selectedIds.length === matches.length;
  const partiallySelected = selectedIds.length > 0 && selectedIds.length < matches.length;

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? matches.map((match) => match.id) : []);
  }

  function toggleOne(matchId: string, checked: boolean) {
    setSelectedIds((current) => checked ? [...current, matchId] : current.filter((id) => id !== matchId));
  }

  function changeStatusView(nextView: StatusView | null) {
    if (!nextView || nextView === statusView) return;
    setSelectedIds([]);
    router.push(nextView === "active" ? "/jobs" : `/jobs?statusView=${nextView}`);
  }

  async function updateSelected(status: "approved" | "rejected") {
    if (selectedIds.length === 0) {
      setSeverity("info");
      setNotice("Select at least one job first.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/jobs/bulk/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchIds: selectedIds, status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Batch update failed.");
      setSeverity("success");
      setNotice(payload.message ?? "Batch update complete.");
      setSelectedIds([]);
      router.refresh();
    } catch (error) {
      setSeverity("error");
      setNotice(error instanceof Error ? error.message : "Batch update failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          sx={{ p: 1.5, alignItems: { md: "center" }, justifyContent: "space-between", borderBottom: 1, borderColor: "divider" }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Checkbox
              checked={allSelected}
              indeterminate={partiallySelected}
              onChange={(event) => toggleAll(event.target.checked)}
              slotProps={{ input: { "aria-label": "Select all visible jobs" } }}
            />
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              {selectedIds.length ? `${selectedIds.length} selected` : `${matches.length} visible jobs`}
            </Typography>
          </Stack>
          <Stack direction={{ xs: "column", lg: "row" }} spacing={1} sx={{ alignItems: { lg: "center" } }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={statusView}
              onChange={(_, value) => changeStatusView(value)}
              aria-label="Job status view"
            >
              <ToggleButton value="active">Active</ToggleButton>
              <ToggleButton value="rejected">Rejected</ToggleButton>
              <ToggleButton value="archived">Archived</ToggleButton>
              <ToggleButton value="all">All</ToggleButton>
            </ToggleButtonGroup>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" color="success" disabled={loading || selectedIds.length === 0} onClick={() => void updateSelected("approved")}>
                Approve selected
              </Button>
              <Button variant="outlined" color="error" disabled={loading || selectedIds.length === 0} onClick={() => void updateSelected("rejected")}>
                Reject selected
              </Button>
              <Button variant="text" disabled={loading || selectedIds.length === 0} onClick={() => setSelectedIds([])}>
                Deselect all
              </Button>
            </Stack>
          </Stack>
        </Stack>

        <TableContainer>
          <Table sx={{ minWidth: 1040 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">Select</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Matched profile</TableCell>
                <TableCell>Signals</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {matches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <EmptyState title="No matched jobs yet" body="Add a manual job or run a search to populate the review queue." />
                  </TableCell>
                </TableRow>
              ) : (
                matches.map((match) => {
                  const selected = selectedSet.has(match.id);
                  return (
                    <TableRow key={match.id} selected={selected} hover sx={{ "&:hover .job-title": { color: "primary.main" } }}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selected}
                          onChange={(event) => toggleOne(match.id, event.target.checked)}
                          slotProps={{ input: { "aria-label": `Select ${match.company} ${match.title}` } }}
                        />
                      </TableCell>
                      <TableCell>
                        <ScoreChip score={match.score} />
                      </TableCell>
                      <TableCell>
                        <Typography className="job-title" sx={{ fontWeight: 850 }}>{match.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {match.company} · {match.location}
                        </Typography>
                      </TableCell>
                      <TableCell><StatusChip status={match.status} /></TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{match.profileName}</Typography>
                        <Typography variant="caption" color="text.secondary">{match.sourceName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap" }} useFlexGap>
                          {match.strongestMatches.slice(0, 3).map((signal, index) => (
                            <Chip key={`${match.id}-${signal}-${index}`} size="small" variant="outlined" label={signal} />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end", minWidth: 224 }}>
                          <ActionButton href={`/jobs/${match.jobId}`} size="small" endIcon={<OpenInNewIcon />}>Open</ActionButton>
                          <ActionButton postTo={`/api/jobs/${match.jobId}/approve`} body={{ matchId: match.id }} size="small" color="success">Approve</ActionButton>
                          <ActionButton postTo={`/api/jobs/${match.jobId}/reject`} body={{ matchId: match.id }} size="small" color="error">Reject</ActionButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
      <Snackbar open={Boolean(notice)} autoHideDuration={5000} onClose={() => setNotice("")}>
        <Alert severity={severity} variant="filled" onClose={() => setNotice("")}>
          {notice}
        </Alert>
      </Snackbar>
    </>
  );
}
