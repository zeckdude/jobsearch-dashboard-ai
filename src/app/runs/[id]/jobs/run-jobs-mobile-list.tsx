import Link from "next/link";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ActionButton } from "@/components/action-button";
import { RunItemSourceLabel } from "@/components/run-item-source-label";
import { ScoreChip } from "@/components/ui/score-chip";
import { formatListedAt } from "@/lib/job-search/listed-at";
import {
  nextRunItemSortDirection,
  normalizeRunItemSortDirection,
  searchRunStagePath,
  type RunItemSortColumn,
  type RunItemSortDirection,
} from "@/lib/job-search/run-items";
import type { JobSearchRunItemStage } from "@prisma/client";

export type RunJobMobileItem = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  listedAt: Date | null;
  sourceName: string | null;
  applicationUrl: string | null;
  jobPostingId: string | null;
  overallScore: number | null;
};

const sortOptions: Array<{ column: RunItemSortColumn; label: string; hideOnFetched?: boolean }> = [
  { column: "title", label: "Title" },
  { column: "company", label: "Company" },
  { column: "listedAt", label: "Posted" },
  { column: "sourceName", label: "Source" },
  { column: "overallScore", label: "Score", hideOnFetched: true },
];

function MobileSortChips({
  runId,
  stage,
  activeSort,
  activeDir,
  searchQuery,
}: {
  runId: string;
  stage: JobSearchRunItemStage;
  activeSort: RunItemSortColumn;
  activeDir: RunItemSortDirection;
  searchQuery: string;
}) {
  const visible = sortOptions.filter((option) => !(option.hideOnFetched && stage === "fetched"));

  return (
    <Stack spacing={0.75}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
        Sort by
      </Typography>
      <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
        {visible.map((option) => {
          const isActive = activeSort === option.column;
          const nextDir = isActive
            ? nextRunItemSortDirection(option.column, activeDir)
            : normalizeRunItemSortDirection(undefined, option.column, stage);
          return (
            <Chip
              key={option.column}
              component={Link}
              href={searchRunStagePath(runId, stage, {
                q: searchQuery,
                sort: option.column,
                dir: nextDir,
              })}
              clickable
              size="small"
              color={isActive ? "primary" : "default"}
              variant={isActive ? "filled" : "outlined"}
              label={isActive ? `${option.label} ${activeDir === "asc" ? "↑" : "↓"}` : option.label}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}

function RunJobMobileCard({
  item,
  showScore,
}: {
  item: RunJobMobileItem;
  showScore: boolean;
}) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.35, overflowWrap: "break-word" }}>
              {item.jobPostingId ? (
                <Link href={`/jobs?job=${item.jobPostingId}`} style={{ color: "inherit", textDecoration: "none" }}>
                  {item.title}
                </Link>
              ) : (
                item.title
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, lineHeight: 1.4, overflowWrap: "break-word" }}>
              {item.company}
              {item.location ? ` · ${item.location}` : ""}
            </Typography>
          </Box>

          <Stack
            spacing={0.75}
            sx={{
              flexShrink: 0,
              width: "40%",
              maxWidth: 176,
              alignItems: "flex-end",
              textAlign: "right",
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              {formatListedAt(item.listedAt)}
            </Typography>
            <RunItemSourceLabel label={item.sourceName} align="right" />
            {showScore && typeof item.overallScore === "number" ? <ScoreChip score={item.overallScore} /> : null}
            {item.applicationUrl ? (
              <ActionButton
                href={item.applicationUrl}
                target="_blank"
                size="small"
                variant="outlined"
                startIcon={<OpenInNewOutlinedIcon />}
              >
                Open
              </ActionButton>
            ) : item.jobPostingId ? (
              <ActionButton href={`/jobs?job=${item.jobPostingId}`} size="small" variant="outlined">
                Queue
              </ActionButton>
            ) : null}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function RunJobsMobileList({
  runId,
  stage,
  items,
  activeSort,
  activeDir,
  searchQuery,
}: {
  runId: string;
  stage: JobSearchRunItemStage;
  items: RunJobMobileItem[];
  activeSort: RunItemSortColumn;
  activeDir: RunItemSortDirection;
  searchQuery: string;
}) {
  const showScore = stage !== "fetched";

  return (
    <Stack spacing={1.25} sx={{ display: { xs: "flex", lg: "none" }, p: 1.5 }}>
      <MobileSortChips
        runId={runId}
        stage={stage}
        activeSort={activeSort}
        activeDir={activeDir}
        searchQuery={searchQuery}
      />
      {items.map((item) => (
        <RunJobMobileCard key={item.id} item={item} showScore={showScore} />
      ))}
    </Stack>
  );
}
