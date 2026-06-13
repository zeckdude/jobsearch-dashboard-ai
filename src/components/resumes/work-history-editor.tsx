"use client";

import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import TurnLeftIcon from "@mui/icons-material/TurnLeft";
import { ResumeSectionEmptyAlert } from "@/components/resumes/resume-section-empty-alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import {
  addBullet,
  createBulletNode,
  getBulletContainer,
  indentBullet,
  moveBulletDown,
  moveBulletUp,
  outdentBullet,
  removeBullet,
  type ResumeBulletNode,
  updateBulletText,
} from "@/lib/resumes/resume-bullet-tree";

export type WorkHistoryRole = {
  key: string;
  company: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  bullets: ResumeBulletNode[];
};

type WorkHistoryEditorProps = {
  roles: WorkHistoryRole[];
  editing: boolean;
  onChange: (roles: WorkHistoryRole[]) => void;
  summary?: string;
  renderBulletActions?: (bulletId: string) => ReactNode;
};

export function WorkHistoryEditor({
  roles,
  editing,
  onChange,
  summary,
  renderBulletActions,
}: WorkHistoryEditorProps) {
  const bulletCount = roles.reduce((count, role) => count + countBullets(role.bullets), 0);

  function updateRole(roleKey: string, patch: Partial<WorkHistoryRole>) {
    onChange(roles.map((role) => (role.key === roleKey ? { ...role, ...patch } : role)));
  }

  function updateRoleBullets(roleKey: string, bullets: ResumeBulletNode[]) {
    updateRole(roleKey, { bullets });
  }

  function addRole() {
    onChange([
      ...roles,
      {
        key: `role-${Date.now()}`,
        company: "Company",
        title: "Role title",
        startDate: null,
        endDate: null,
        bullets: [createBulletNode("")],
      },
    ]);
  }

  function removeRole(roleKey: string) {
    onChange(roles.filter((role) => role.key !== roleKey));
  }

  return (
    <Box>
      <Typography variant="h3">Work history</Typography>
      {summary ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {summary}
        </Typography>
      ) : null}
      <Stack spacing={2} sx={{ mt: 1.5 }}>
        {roles.map((role) => {
          const dateLine = [role.startDate, role.endDate].filter(Boolean).join(" – ");
          return (
            <Box key={role.key} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2 }}>
              {editing ? (
                <Stack spacing={1.5} sx={{ mb: 1.25 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 1.5 }}>
                    <TextField
                      label="Company"
                      value={role.company}
                      onChange={(event) => updateRole(role.key, { company: event.target.value })}
                    />
                    <TextField
                      label="Role title"
                      value={role.title}
                      onChange={(event) => updateRole(role.key, { title: event.target.value })}
                    />
                    <TextField
                      label="Start date"
                      value={role.startDate ?? ""}
                      onChange={(event) => updateRole(role.key, { startDate: event.target.value || null })}
                    />
                    <TextField
                      label="End date"
                      value={role.endDate ?? ""}
                      onChange={(event) => updateRole(role.key, { endDate: event.target.value || null })}
                    />
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => updateRoleBullets(role.key, addBullet(role.bullets))}>
                      Add bullet
                    </Button>
                    <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => removeRole(role.key)}>
                      Remove role
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {role.company} — {role.title}
                  </Typography>
                  {dateLine ? (
                    <Typography variant="body2" color="text.secondary">
                      {dateLine}
                    </Typography>
                  ) : null}
                </>
              )}

              <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                {role.bullets.map((bullet, index) => (
                  <BulletNode
                    key={bullet.id}
                    bullet={bullet}
                    path={[index]}
                    depth={0}
                    editing={editing}
                    bullets={role.bullets}
                    onBulletsChange={(bullets) => updateRoleBullets(role.key, bullets)}
                    renderBulletActions={renderBulletActions}
                  />
                ))}
              </Stack>
            </Box>
          );
        })}
        {roles.length === 0 ? (
          <ResumeSectionEmptyAlert>No work history yet.</ResumeSectionEmptyAlert>
        ) : null}
        {editing ? (
          <Button variant="outlined" startIcon={<AddIcon />} onClick={addRole} sx={{ alignSelf: "flex-start" }}>
            Add role
          </Button>
        ) : null}
      </Stack>
      {!summary ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {roles.length} roles · {bulletCount} bullets
        </Typography>
      ) : null}
    </Box>
  );
}

type BulletNodeProps = {
  bullet: ResumeBulletNode;
  path: number[];
  depth: number;
  editing: boolean;
  bullets: ResumeBulletNode[];
  onBulletsChange: (bullets: ResumeBulletNode[]) => void;
  renderBulletActions?: (bulletId: string) => ReactNode;
};

function BulletNode({
  bullet,
  path,
  depth,
  editing,
  bullets,
  onBulletsChange,
  renderBulletActions,
}: BulletNodeProps) {
  const container = getBulletContainer(bullets, path) ?? [];
  const index = path[path.length - 1] ?? 0;
  const canMoveUp = index > 0;
  const canMoveDown = index < container.length - 1;
  const canIndent = depth === 0 && index > 0;
  const canOutdent = depth > 0;

  return (
    <Box sx={{ pl: depth > 0 ? 2.5 : 0 }}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        {editing ? (
          <Stack direction="row" spacing={0.25} sx={{ pt: 1, flexShrink: 0 }}>
            <Tooltip title="Move up">
              <span>
                <IconButton size="small" disabled={!canMoveUp} onClick={() => onBulletsChange(moveBulletUp(bullets, path))}>
                  <ArrowUpwardIcon fontSize="inherit" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Move down">
              <span>
                <IconButton size="small" disabled={!canMoveDown} onClick={() => onBulletsChange(moveBulletDown(bullets, path))}>
                  <ArrowDownwardIcon fontSize="inherit" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Make sub-bullet">
              <span>
                <IconButton size="small" disabled={!canIndent} onClick={() => onBulletsChange(indentBullet(bullets, path))}>
                  <SubdirectoryArrowRightIcon fontSize="inherit" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Move out one level">
              <span>
                <IconButton size="small" disabled={!canOutdent} onClick={() => onBulletsChange(outdentBullet(bullets, path))}>
                  <TurnLeftIcon fontSize="inherit" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Add bullet below">
              <IconButton size="small" onClick={() => onBulletsChange(addBullet(bullets, path))}>
                <AddIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Remove">
              <IconButton size="small" onClick={() => onBulletsChange(removeBullet(bullets, path))}>
                <DeleteOutlineIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : null}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <TextField
              value={bullet.text}
              multiline
              minRows={2}
              fullWidth
              placeholder="Bullet text"
              onChange={(event) => onBulletsChange(updateBulletText(bullets, path, event.target.value))}
            />
          ) : (
            <Typography component="p" variant="body2" sx={{ m: 0 }}>
              {depth > 0 ? "◦" : "•"} {bullet.text}
            </Typography>
          )}
          {renderBulletActions?.(bullet.id)}
        </Box>
      </Stack>
      {bullet.children.map((child, childIndex) => (
        <Box key={child.id} sx={{ mt: 1.25 }}>
          <BulletNode
            bullet={child}
            path={[...path, childIndex]}
            depth={depth + 1}
            editing={editing}
            bullets={bullets}
            onBulletsChange={onBulletsChange}
            renderBulletActions={renderBulletActions}
          />
        </Box>
      ))}
    </Box>
  );
}

function countBullets(nodes: ResumeBulletNode[]): number {
  return nodes.reduce((count, node) => count + 1 + countBullets(node.children), 0);
}
