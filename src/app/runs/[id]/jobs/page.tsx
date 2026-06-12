export const metadata = {
  title: "Search run jobs | Job Search OS",
  description: "Inspect jobs fetched, deduped, matched, and saved during a search run.",
};

import Link from "next/link";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import ClearOutlinedIcon from "@mui/icons-material/ClearOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/app-shell";
import { ActionButton } from "@/components/action-button";
import { RunItemSourceLabel } from "@/components/run-item-source-label";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ScoreChip } from "@/components/ui/score-chip";
import { StatusChip } from "@/components/ui/status-chip";
import { formatListedAt } from "@/lib/job-search/listed-at";
import {
  normalizeRunItemSearchQuery,
  normalizeRunItemSort,
  normalizeRunItemSortDirection,
  normalizeSearchRunStage,
  runItemOrderBy,
  runItemSearchWhere,
  searchRunStageLabels,
  searchRunStagePath,
} from "@/lib/job-search/run-items";
import { prisma } from "@/lib/prisma";
import type { JobSearchRunItemStage } from "@prisma/client";
import { RunJobsMobileList } from "./run-jobs-mobile-list";
import { SortableHeader } from "./sortable-header";

export const dynamic = "force-dynamic";

const pageSize = 100;
const stages: JobSearchRunItemStage[] = ["fetched", "new", "matched", "saved"];

const postedColWidth = 120;
const openColWidth = 116;

const runJobsCompactTextCell = {
  verticalAlign: "top",
  minWidth: 0,
  overflow: { lg: "hidden", xl: "visible" },
  textOverflow: { lg: "ellipsis", xl: "clip" },
  whiteSpace: { lg: "nowrap", xl: "normal" },
  overflowWrap: { xl: "break-word" },
  wordBreak: { xl: "break-word" },
} as const;

const runJobsPostedCell = {
  verticalAlign: "top",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  width: postedColWidth,
  minWidth: postedColWidth,
  maxWidth: postedColWidth,
} as const;

const runJobsSourceCell = {
  verticalAlign: "top",
  minWidth: 0,
  overflow: "hidden",
  overflowWrap: "break-word",
  wordBreak: "break-word",
} as const;

const runJobsOpenCell = {
  verticalAlign: "top",
  whiteSpace: "nowrap",
  width: openColWidth,
  minWidth: openColWidth,
  maxWidth: openColWidth,
  pl: 1,
  pr: 3,
} as const;

const runJobsTitleCell = {
  ...runJobsCompactTextCell,
  pl: 2,
} as const;

const runJobsHeaderCell = {
  verticalAlign: "top",
  whiteSpace: "nowrap",
} as const;

const runJobsTableSx = {
  tableLayout: "fixed",
  width: "100%",
  "& .MuiTableCell-root:last-of-type": { pr: 3 },
} as const;

function RunJobsColgroup({ stage }: { stage: JobSearchRunItemStage }) {
  if (stage === "fetched") {
    return (
      <colgroup>
        <col style={{ width: "28%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "20%" }} />
        <col style={{ width: postedColWidth }} />
        <col style={{ width: "14%" }} />
        <col style={{ width: openColWidth }} />
      </colgroup>
    );
  }

  return (
    <colgroup>
      <col style={{ width: "24%" }} />
      <col style={{ width: "9%" }} />
      <col style={{ width: "17%" }} />
      <col style={{ width: postedColWidth }} />
      <col style={{ width: "13%" }} />
      <col style={{ width: 72 }} />
      <col style={{ width: openColWidth }} />
    </colgroup>
  );
}

export default async function SearchRunJobsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { stage?: string; page?: string; q?: string; sort?: string; dir?: string };
}) {
  const stage = normalizeSearchRunStage(searchParams?.stage);
  const page = Math.max(1, Number(searchParams?.page ?? "1") || 1);
  const searchQuery = normalizeRunItemSearchQuery(searchParams?.q);
  const sort = normalizeRunItemSort(searchParams?.sort, stage);
  const dir = normalizeRunItemSortDirection(searchParams?.dir, sort, stage);
  const run = await prisma.jobSearchRun.findUnique({ where: { id: params.id } });
  if (!run) notFound();

  const listOptions = { q: searchQuery, sort, dir };
  const itemWhere = {
    runId: run.id,
    stage,
    ...runItemSearchWhere(searchQuery),
  };
  const skip = (page - 1) * pageSize;
  const [items, total, stageCounts] = await Promise.all([
    prisma.jobSearchRunItem.findMany({
      where: itemWhere,
      orderBy: runItemOrderBy(sort, dir),
      skip,
      take: pageSize,
    }),
    prisma.jobSearchRunItem.count({ where: itemWhere }),
    prisma.jobSearchRunItem.groupBy({
      by: ["stage"],
      where: { runId: run.id },
      _count: { _all: true },
    }),
  ]);

  const countByStage = Object.fromEntries(stageCounts.map((entry) => [entry.stage, entry._count._all])) as Partial<Record<JobSearchRunItemStage, number>>;
  const expectedCount = stageCountForRun(run, stage);
  const stageMeta = searchRunStageLabels[stage];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasStoredItems = stages.some((entry) => (countByStage[entry] ?? 0) > 0);

  return (
    <AppShell>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Search run"
          title={stageMeta.title}
          description={stageMeta.description}
          actions={
            <ActionButton href="/dashboard" variant="outlined" startIcon={<ArrowBackOutlinedIcon />}>
              Back to dashboard
            </ActionButton>
          }
        />

        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
          <StatusChip status={run.status} />
          <Chip size="small" variant="outlined" label={run.triggeredBy} />
          <Typography variant="body2" color="text.secondary">
            Started {run.startedAt.toLocaleString()}
            {run.finishedAt ? ` · Finished ${run.finishedAt.toLocaleString()}` : ""}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }}>
          {stages.map((entry) => {
            const count = countByStage[entry] ?? 0;
            const expected = stageCountForRun(run, entry);
            const label = `${searchRunStageLabels[entry].title} (${count > 0 ? count : expected})`;
            return (
              <Chip
                key={entry}
                component={Link}
                href={searchRunStagePath(run.id, entry, searchQuery ? { q: searchQuery } : undefined)}
                clickable
                color={entry === stage ? "primary" : "default"}
                variant={entry === stage ? "filled" : "outlined"}
                label={label}
              />
            );
          })}
        </Stack>

        {stage === "fetched" ? (
          <Typography variant="body2" color="text.secondary">
            These are every unique posting pulled from sources during this run. They are not in your Jobs queue — only matched and saved jobs are.
          </Typography>
        ) : null}

        <Card>
          <CardContent>
            <Stack
              component="form"
              method="GET"
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              sx={{ alignItems: { md: "center" } }}
            >
              <input type="hidden" name="stage" value={stage} />
              <input type="hidden" name="sort" value={sort} />
              <input type="hidden" name="dir" value={dir} />
              <TextField
                fullWidth
                size="small"
                name="q"
                label="Search this run"
                placeholder="Company, title, location, profile, or source"
                defaultValue={searchQuery}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                startIcon={<SearchOutlinedIcon />}
                sx={{ minWidth: 132, whiteSpace: "nowrap", flexShrink: 0 }}
              >
                Search
              </Button>
              {searchQuery ? (
                <ActionButton
                  href={searchRunStagePath(run.id, stage, { sort, dir })}
                  variant="outlined"
                  startIcon={<ClearOutlinedIcon />}
                  sx={{ minWidth: 132, whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  Clear search
                </ActionButton>
              ) : null}
            </Stack>
            {searchQuery ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Filtering this run&apos;s {stageMeta.title.toLowerCase()} jobs matching {searchQuery}.
              </Typography>
            ) : null}
          </CardContent>
        </Card>

        {!hasStoredItems && expectedCount > 0 ? (
          <EmptyState
            title="No per-job records for this run"
            body="This search finished before job-level run tracking was enabled. Run a new search to browse fetched, matched, and saved jobs from the stats."
          />
        ) : total === 0 ? (
          <EmptyState
            title={`No ${stageMeta.title.toLowerCase()} jobs`}
            body={expectedCount > 0
              ? `The run reported ${expectedCount} at this stage, but no stored records matched.`
              : "Nothing reached this stage during the search."}
          />
        ) : (
          <>
            <Typography variant="body2" color="text.secondary">
              Showing {skip + 1}–{Math.min(skip + pageSize, total)} of {total}
              {expectedCount > total ? ` (${expectedCount} reported on dashboard)` : ""}
            </Typography>
            <Card>
              <RunJobsMobileList
                runId={run.id}
                stage={stage}
                items={items}
                activeSort={sort}
                activeDir={dir}
                searchQuery={searchQuery}
              />
              <TableContainer sx={{ display: { xs: "none", lg: "block" } }}>
              <Table sx={runJobsTableSx}>
                <RunJobsColgroup stage={stage} />
                <TableHead>
                  <TableRow>
                    <SortableHeader runId={run.id} stage={stage} column="title" label="Title" activeSort={sort} activeDir={dir} searchQuery={searchQuery} cellSx={{ ...runJobsHeaderCell, ...runJobsTitleCell }} />
                    <SortableHeader runId={run.id} stage={stage} column="company" label="Company" activeSort={sort} activeDir={dir} searchQuery={searchQuery} cellSx={runJobsHeaderCell} />
                    <SortableHeader runId={run.id} stage={stage} column="location" label="Location" activeSort={sort} activeDir={dir} searchQuery={searchQuery} cellSx={runJobsHeaderCell} />
                    <SortableHeader runId={run.id} stage={stage} column="listedAt" label="Posted" activeSort={sort} activeDir={dir} searchQuery={searchQuery} cellSx={{ ...runJobsHeaderCell, ...runJobsPostedCell }} />
                    <SortableHeader runId={run.id} stage={stage} column="sourceName" label="Source" activeSort={sort} activeDir={dir} searchQuery={searchQuery} cellSx={runJobsHeaderCell} />
                    {stage !== "fetched" ? (
                      <SortableHeader runId={run.id} stage={stage} column="overallScore" label="Score" align="right" activeSort={sort} activeDir={dir} searchQuery={searchQuery} cellSx={{ ...runJobsHeaderCell, width: 72, minWidth: 72, maxWidth: 72 }} />
                    ) : null}
                    <TableCell align="right" sx={{ ...runJobsHeaderCell, ...runJobsOpenCell }}>Open</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ ...runJobsTitleCell, fontWeight: 700 }} title={item.title}>
                        {item.jobPostingId ? (
                          <Link
                            href={`/jobs?job=${item.jobPostingId}`}
                            style={{ color: "inherit", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis" }}
                          >
                            {item.title}
                          </Link>
                        ) : (
                          item.title
                        )}
                      </TableCell>
                      <TableCell sx={runJobsCompactTextCell} title={item.company}>
                        {item.company}
                      </TableCell>
                      <TableCell sx={{ ...runJobsCompactTextCell, color: "text.secondary" }} title={item.location ?? undefined}>
                        {item.location ?? "—"}
                      </TableCell>
                      <TableCell sx={{ ...runJobsPostedCell, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                        {formatListedAt(item.listedAt)}
                      </TableCell>
                      <TableCell sx={runJobsSourceCell}>
                        <RunItemSourceLabel label={item.sourceName} />
                      </TableCell>
                      {stage !== "fetched" ? (
                        <TableCell align="right" sx={{ ...runJobsPostedCell, width: 72, minWidth: 72, maxWidth: 72 }}>
                          {typeof item.overallScore === "number" ? <ScoreChip score={item.overallScore} /> : "—"}
                        </TableCell>
                      ) : null}
                      <TableCell align="right" sx={runJobsOpenCell}>
                        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                        {item.applicationUrl ? (
                          <ActionButton href={item.applicationUrl} target="_blank" size="small" variant="outlined" startIcon={<OpenInNewOutlinedIcon />}>
                            Posting
                          </ActionButton>
                        ) : item.jobPostingId ? (
                          <ActionButton href={`/jobs?job=${item.jobPostingId}`} size="small" variant="outlined">
                            In queue
                          </ActionButton>
                        ) : (
                          "—"
                        )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </TableContainer>
            </Card>

            {totalPages > 1 ? (
              <Stack direction="row" spacing={1} sx={{ justifyContent: "space-between", alignItems: "center" }}>
                {page > 1 ? (
                  <ActionButton href={searchRunStagePath(run.id, stage, { ...listOptions, page: page - 1 })} variant="outlined">
                    Previous
                  </ActionButton>
                ) : (
                  <Box />
                )}
                <Typography variant="body2" color="text.secondary">
                  Page {page} of {totalPages}
                </Typography>
                {page < totalPages ? (
                  <ActionButton href={searchRunStagePath(run.id, stage, { ...listOptions, page: page + 1 })} variant="outlined">
                    Next
                  </ActionButton>
                ) : (
                  <Box />
                )}
              </Stack>
            ) : null}
          </>
        )}
      </Stack>
    </AppShell>
  );
}

function stageCountForRun(
  run: {
    jobsFetched: number;
    jobsAfterDedupe: number;
    jobsAfterFilters: number;
    jobsSaved: number;
  },
  stage: JobSearchRunItemStage,
) {
  if (stage === "fetched") return run.jobsFetched;
  if (stage === "new") return run.jobsAfterDedupe;
  if (stage === "matched") return run.jobsAfterFilters;
  return run.jobsSaved;
}
