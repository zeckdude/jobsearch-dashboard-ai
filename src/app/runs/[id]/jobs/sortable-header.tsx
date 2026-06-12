import Link from "next/link";
import TableCell from "@mui/material/TableCell";
import type { SxProps, Theme } from "@mui/material/styles";
import type { JobSearchRunItemStage } from "@prisma/client";
import {
  nextRunItemSortDirection,
  normalizeRunItemSortDirection,
  type RunItemSortColumn,
  type RunItemSortDirection,
  searchRunStagePath,
} from "@/lib/job-search/run-items";

export function SortableHeader({
  runId,
  stage,
  column,
  label,
  align,
  activeSort,
  activeDir,
  searchQuery,
  cellSx,
}: {
  runId: string;
  stage: JobSearchRunItemStage;
  column: RunItemSortColumn;
  label: string;
  align?: "left" | "right";
  activeSort: RunItemSortColumn;
  activeDir: RunItemSortDirection;
  searchQuery: string;
  cellSx?: SxProps<Theme>;
}) {
  const isActive = activeSort === column;
  const nextDir = isActive
    ? nextRunItemSortDirection(column, activeDir)
    : normalizeRunItemSortDirection(undefined, column, stage);
  const href = searchRunStagePath(runId, stage, {
    q: searchQuery,
    sort: column,
    dir: nextDir,
  });

  return (
    <TableCell align={align} sx={cellSx}>
      <Link
        href={href}
        style={{
          color: "inherit",
          textDecoration: "none",
          fontWeight: isActive ? 800 : 700,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {label}
        <span aria-hidden style={{ fontSize: 12, opacity: isActive ? 1 : 0.35 }}>
          {isActive ? (activeDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </Link>
    </TableCell>
  );
}
