"use client";

import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight";
import TurnLeftIcon from "@mui/icons-material/TurnLeft";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import { ResumeSectionEmptyAlert } from "@/components/resumes/resume-section-empty-alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { ResumeDateField } from "@/components/resumes/resume-date-field";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { WorkHistoryShortcutsButton, WorkHistoryShortcutsDialog } from "@/components/resumes/work-history-shortcuts-dialog";
import {
  addBullet,
  addRole,
  countBullets,
  demoteRoleToBullet,
  indentBullet,
  moveBulletDown,
  moveBulletUp,
  moveRoleDown,
  moveRoleUp,
  outdentBullet,
  promoteBulletToRole,
  removeBullet,
  removeRole,
  updateBulletText,
  updateRoleAt,
  type NodePath,
  type WorkHistoryBulletNode,
  type WorkHistoryRoleNode,
  type WorkHistoryTree,
} from "@/lib/resumes/work-history-tree";

type WorkHistoryTreeEditorProps = {
  tree: WorkHistoryTree;
  editing: boolean;
  onChange: (tree: WorkHistoryTree) => void;
  summary?: string;
  renderBulletActions?: (bulletId: string) => ReactNode;
};

type RowAction = {
  id: string;
  label: string;
  description: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
};

const compactFieldSx = {
  "& .MuiInput-root": { fontSize: "0.9rem" },
  "& .MuiInputLabel-root": { fontSize: "0.85rem" },
};

const bulletFieldSx = {
  flex: 1,
  "& .MuiInputBase-root": {
    fontSize: "0.875rem",
    lineHeight: 1.5,
    alignItems: "flex-start",
    py: 0.25,
  },
  "& .MuiInputBase-input": { py: 0.25 },
  "& .MuiInput-underline:before": { borderBottomColor: "transparent" },
  "& .MuiInput-underline:hover:not(.Mui-disabled):before": { borderBottomColor: "divider" },
  "& .MuiInput-underline:after": { borderBottomColor: "primary.light" },
};

const rowFocusSx = {
  borderRadius: 1,
  outline: "none",
  "&:focus-visible": {
    boxShadow: (theme: { palette: { primary: { main: string } } }) => `inset 3px 0 0 ${theme.palette.primary.main}`,
    bgcolor: "action.hover",
  },
};

function buildRoleMenuActions(
  tree: WorkHistoryTree,
  roleIndex: number,
  onChange: (tree: WorkHistoryTree) => void,
): RowAction[] {
  return [
    {
      id: "role-up",
      label: "Move job up",
      description: "Reorder this job earlier in your history",
      icon: <ArrowUpwardIcon fontSize="small" />,
      disabled: roleIndex === 0,
      onClick: () => onChange(moveRoleUp(tree, roleIndex)),
    },
    {
      id: "role-down",
      label: "Move job down",
      description: "Reorder this job later in your history",
      icon: <ArrowDownwardIcon fontSize="small" />,
      disabled: roleIndex >= tree.length - 1,
      onClick: () => onChange(moveRoleDown(tree, roleIndex)),
    },
    {
      id: "role-demote",
      label: "Merge into job above",
      description: "Turn this job into a bullet under the previous job — useful for mis-split entries",
      icon: <UnfoldLessIcon fontSize="small" />,
      disabled: roleIndex === 0,
      onClick: () => onChange(demoteRoleToBullet(tree, roleIndex)),
    },
    {
      id: "role-add-bullet",
      label: "Add bullet",
      description: "Add a new achievement under this job",
      icon: <AddIcon fontSize="small" />,
      onClick: () => onChange(addBullet(tree, [roleIndex])),
    },
    {
      id: "role-remove",
      label: "Remove job",
      description: "Delete this job and all of its bullets",
      icon: <DeleteOutlineIcon fontSize="small" />,
      onClick: () => onChange(removeRole(tree, roleIndex)),
    },
  ];
}

function HoverActionRail({
  dragAttributes,
  dragListeners,
  onMenuOpen,
  isDragging,
}: {
  dragAttributes?: DraggableAttributes;
  dragListeners?: SyntheticListenerMap;
  onMenuOpen: (anchor: HTMLElement) => void;
  isDragging?: boolean;
}) {
  return (
    <Stack
      className="row-action-rail"
      spacing={0}
      sx={{
        flexShrink: 0,
        width: 28,
        pt: 0.75,
        alignItems: "center",
        opacity: isDragging ? 1 : 0,
        transition: "opacity 120ms ease",
        "@media (hover: hover)": {
          ".work-history-bullet-row:hover &, .work-history-bullet-row:focus-within &": { opacity: 1 },
        },
        "@media (hover: none)": { opacity: 0.55 },
      }}
    >
      <Tooltip title="Drag to reorder">
        <IconButton
          size="small"
          sx={{ cursor: "grab", p: 0.25 }}
          {...dragAttributes}
          {...dragListeners}
          aria-label="Drag row"
        >
          <DragIndicatorIcon sx={{ fontSize: 18, color: "text.disabled" }} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Row actions">
        <IconButton
          size="small"
          sx={{ p: 0.25 }}
          onClick={(event) => onMenuOpen(event.currentTarget)}
          aria-label="Row actions"
        >
          <MoreVertIcon sx={{ fontSize: 18, color: "text.secondary" }} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

export function WorkHistoryTreeEditor({
  tree,
  editing,
  onChange,
  summary,
  renderBulletActions,
}: WorkHistoryTreeEditorProps) {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuActions, setMenuActions] = useState<RowAction[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const bulletCount = useMemo(() => countBullets(tree), [tree]);

  const openMenu = (anchor: HTMLElement, actions: RowAction[]) => {
    setMenuAnchor(anchor);
    setMenuActions(actions);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuActions([]);
  };

  const runMenuAction = (action: RowAction) => {
    closeMenu();
    action.onClick();
  };

  const handleRoleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tree.findIndex((role) => role.id === active.id);
    const newIndex = tree.findIndex((role) => role.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(tree, oldIndex, newIndex));
  }, [onChange, tree]);

  const handleBulletDragEnd = useCallback((roleIndex: number, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const role = tree[roleIndex];
    if (!role) return;
    const oldIndex = role.children.findIndex((bullet) => bullet.id === active.id);
    const newIndex = role.children.findIndex((bullet) => bullet.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...tree];
    next[roleIndex] = {
      ...role,
      children: arrayMove(role.children, oldIndex, newIndex),
    };
    onChange(next);
  }, [onChange, tree]);

  const handleKeyDown = (event: React.KeyboardEvent, actions: {
    up?: () => void;
    down?: () => void;
    indent?: () => void;
    outdent?: () => void;
    promote?: () => void;
    demote?: () => void;
    remove?: () => void;
    addBelow?: () => void;
  }) => {
    if (!editing || !event.altKey) return;
    if (event.key === "ArrowUp" && event.shiftKey && actions.promote) {
      event.preventDefault();
      event.stopPropagation();
      actions.promote();
      return;
    }
    if (event.key === "ArrowDown" && event.shiftKey && actions.demote) {
      event.preventDefault();
      event.stopPropagation();
      actions.demote();
      return;
    }
    if (event.key === "ArrowUp" && !event.shiftKey && actions.up) {
      event.preventDefault();
      event.stopPropagation();
      actions.up();
      return;
    }
    if (event.key === "ArrowDown" && !event.shiftKey && actions.down) {
      event.preventDefault();
      event.stopPropagation();
      actions.down();
      return;
    }
    if (event.key === "ArrowRight" && actions.indent) {
      event.preventDefault();
      event.stopPropagation();
      actions.indent();
      return;
    }
    if (event.key === "ArrowLeft" && actions.outdent) {
      event.preventDefault();
      event.stopPropagation();
      actions.outdent();
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ mb: 0.5, alignItems: { sm: "center" }, justifyContent: "space-between" }}
      >
        <Typography variant="h3">Work history</Typography>
        <WorkHistoryShortcutsButton onClick={() => setShortcutsOpen(true)} editing={editing} />
      </Stack>

      {summary ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {summary}
        </Typography>
      ) : null}

      <WorkHistoryShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        editing={editing}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleRoleDragEnd}>
        <SortableContext items={tree.map((role) => role.id)} strategy={verticalListSortingStrategy}>
          <Stack spacing={1.5} sx={{ mt: 1.5 }}>
            {tree.map((role, roleIndex) => (
              <SortableRoleCard
                key={role.id}
                id={role.id}
                disabled={!editing}
                menuActions={buildRoleMenuActions(tree, roleIndex, onChange)}
                onOpenMenu={openMenu}
              >
                <RoleSection
                  role={role}
                  roleIndex={roleIndex}
                  editing={editing}
                  tree={tree}
                  onChange={onChange}
                  onOpenMenu={openMenu}
                  onKeyDown={handleKeyDown}
                  onBulletDragEnd={(event) => handleBulletDragEnd(roleIndex, event)}
                  renderBulletActions={renderBulletActions}
                />
              </SortableRoleCard>
            ))}
          </Stack>
        </SortableContext>
      </DndContext>

      {tree.length === 0 ? <ResumeSectionEmptyAlert>No work history yet.</ResumeSectionEmptyAlert> : null}

      {editing ? (
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => onChange(addRole(tree))} sx={{ mt: 1.5 }}>
          Add job
        </Button>
      ) : null}

      {!summary ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {tree.length} jobs · {bulletCount} bullets
        </Typography>
      ) : null}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        {menuActions.map((action) => (
          <MenuItem key={action.id} disabled={action.disabled} onClick={() => runMenuAction(action)}>
            <ListItemIcon>{action.icon}</ListItemIcon>
            <ListItemText primary={action.label} secondary={action.description} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}

function BulletDragList({
  role,
  editing,
  onDragEnd,
  children,
}: {
  role: WorkHistoryTree[number];
  editing: boolean;
  onDragEnd: (event: DragEndEvent) => void;
  children: ReactNode;
}) {
  const bulletSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!editing) return <>{children}</>;

  return (
    <DndContext sensors={bulletSensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={role.children.map((bullet) => bullet.id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

function SortableRoleCard({
  id,
  disabled,
  children,
  menuActions,
  onOpenMenu,
}: {
  id: string;
  disabled: boolean;
  children: ReactNode;
  menuActions: RowAction[];
  onOpenMenu: (anchor: HTMLElement, actions: RowAction[]) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });

  return (
    <Box
      ref={setNodeRef}
      className="work-history-job-card"
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.88 : 1 }}
      sx={{
        display: "flex",
        gap: 0.5,
        borderRadius: 2,
        px: { xs: 1, sm: 1.5 },
        py: 1.5,
        bgcolor: "action.hover",
        borderLeft: "3px solid",
        borderLeftColor: "divider",
      }}
    >
      {!disabled ? (
        <Stack spacing={0} sx={{ flexShrink: 0, width: 28, alignItems: "center", pt: 0.25 }}>
          <Tooltip title="Drag to reorder this job">
            <IconButton
              size="small"
              sx={{ cursor: "grab", p: 0.25 }}
              {...attributes}
              {...listeners}
              aria-label="Drag job"
            >
              <DragIndicatorIcon sx={{ fontSize: 18, color: "text.disabled" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Job actions">
            <IconButton
              size="small"
              sx={{ p: 0.25 }}
              onClick={(event) => onOpenMenu(event.currentTarget, menuActions)}
              aria-label="Job actions"
            >
              <MoreVertIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            </IconButton>
          </Tooltip>
        </Stack>
      ) : null}
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

function RoleSection({
  role,
  roleIndex,
  editing,
  tree,
  onChange,
  onOpenMenu,
  onKeyDown,
  onBulletDragEnd,
  renderBulletActions,
}: {
  role: WorkHistoryRoleNode;
  roleIndex: number;
  editing: boolean;
  tree: WorkHistoryTree;
  onChange: (tree: WorkHistoryTree) => void;
  onOpenMenu: (anchor: HTMLElement, actions: RowAction[]) => void;
  onKeyDown: (event: React.KeyboardEvent, actions: Record<string, (() => void) | undefined>) => void;
  onBulletDragEnd: (event: DragEndEvent) => void;
  renderBulletActions?: (bulletId: string) => ReactNode;
}) {
  const dateLine = [role.startDate, role.endDate].filter(Boolean).join(" – ");

  return (
    <Box
      className="work-history-job-focus"
      tabIndex={editing ? 0 : -1}
      onKeyDown={(event) => onKeyDown(event, {
        up: roleIndex > 0 ? () => onChange(moveRoleUp(tree, roleIndex)) : undefined,
        down: roleIndex < tree.length - 1 ? () => onChange(moveRoleDown(tree, roleIndex)) : undefined,
        demote: roleIndex > 0 ? () => onChange(demoteRoleToBullet(tree, roleIndex)) : undefined,
        addBelow: () => onChange(addBullet(tree, [roleIndex])),
      })}
      sx={rowFocusSx}
    >
      {editing ? (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 1.5, mb: 1.25 }}>
          <TextField
            variant="standard"
            label="Company"
            value={role.company}
            onChange={(event) => onChange(updateRoleAt(tree, roleIndex, { company: event.target.value }))}
            sx={compactFieldSx}
          />
          <TextField
            variant="standard"
            label="Role title"
            value={role.title}
            onChange={(event) => onChange(updateRoleAt(tree, roleIndex, { title: event.target.value }))}
            sx={compactFieldSx}
          />
          <ResumeDateField
            label="Start date"
            value={role.startDate}
            onChange={(next) => onChange(updateRoleAt(tree, roleIndex, { startDate: next }))}
            sx={compactFieldSx}
          />
          <ResumeDateField
            label="End date"
            value={role.endDate}
            onChange={(next) => onChange(updateRoleAt(tree, roleIndex, { endDate: next }))}
            sx={compactFieldSx}
          />
        </Box>
      ) : (
        <>
          <Typography variant="subtitle1" fontWeight={700}>{role.company} — {role.title}</Typography>
          {dateLine ? <Typography variant="body2" color="text.secondary">{dateLine}</Typography> : null}
        </>
      )}

      <BulletDragList role={role} editing={editing} onDragEnd={onBulletDragEnd}>
        <Stack spacing={0.5} sx={{ mt: editing ? 0.5 : 1.25 }}>
          {role.children.map((bullet, bulletIndex) => (
            <BulletSection
              key={bullet.id}
              bullet={bullet}
              path={[roleIndex, bulletIndex]}
              depth={0}
              editing={editing}
              tree={tree}
              onChange={onChange}
              onOpenMenu={onOpenMenu}
              onKeyDown={onKeyDown}
              renderBulletActions={renderBulletActions}
            />
          ))}
        </Stack>
      </BulletDragList>
    </Box>
  );
}

function buildBulletMenuActions(
  tree: WorkHistoryTree,
  path: NodePath,
  depth: number,
  onChange: (tree: WorkHistoryTree) => void,
): RowAction[] {
  const index = path[path.length - 1];
  const roleIndex = path[0];
  const role = tree[roleIndex];
  const container = depth === 0 ? role?.children : undefined;
  const canMoveUp = index > 0;
  const canMoveDown = container ? index < container.length - 1 : false;
  const canIndent = depth === 0 && index > 0;
  const canOutdent = depth > 0;
  const canPromote = path.length >= 2;

  return [
    { id: "up", label: "Move up", description: "Move this bullet above the previous one", icon: <ArrowUpwardIcon fontSize="small" />, disabled: !canMoveUp, onClick: () => onChange(moveBulletUp(tree, path)) },
    { id: "down", label: "Move down", description: "Move this bullet below the next one", icon: <ArrowDownwardIcon fontSize="small" />, disabled: !canMoveDown, onClick: () => onChange(moveBulletDown(tree, path)) },
    { id: "indent", label: "Nest as sub-bullet", description: "Make this a sub-point under the bullet above", icon: <SubdirectoryArrowRightIcon fontSize="small" />, disabled: !canIndent, onClick: () => onChange(indentBullet(tree, path)) },
    { id: "outdent", label: "Move out one level", description: "Promote this sub-bullet to a top-level bullet", icon: <TurnLeftIcon fontSize="small" />, disabled: !canOutdent, onClick: () => onChange(outdentBullet(tree, path)) },
    { id: "promote", label: "Promote to own job", description: "Turn this bullet into a separate job entry", icon: <UnfoldMoreIcon fontSize="small" />, disabled: !canPromote, onClick: () => onChange(promoteBulletToRole(tree, path)) },
    { id: "add", label: "Add bullet below", description: "Insert a new bullet after this one", icon: <AddIcon fontSize="small" />, onClick: () => onChange(addBullet(tree, path)) },
    { id: "remove", label: "Remove bullet", description: "Delete this bullet and any sub-bullets", icon: <DeleteOutlineIcon fontSize="small" />, onClick: () => onChange(removeBullet(tree, path)) },
  ];
}

function BulletSection({
  bullet,
  path,
  depth,
  editing,
  tree,
  onChange,
  onOpenMenu,
  onKeyDown,
  renderBulletActions,
}: {
  bullet: WorkHistoryBulletNode;
  path: NodePath;
  depth: number;
  editing: boolean;
  tree: WorkHistoryTree;
  onChange: (tree: WorkHistoryTree) => void;
  onOpenMenu: (anchor: HTMLElement, actions: RowAction[]) => void;
  onKeyDown: (event: React.KeyboardEvent, actions: Record<string, (() => void) | undefined>) => void;
  renderBulletActions?: (bulletId: string) => ReactNode;
}) {
  const index = path[path.length - 1];
  const roleIndex = path[0];
  const role = tree[roleIndex];
  const container = depth === 0 ? role?.children : undefined;
  const canMoveUp = index > 0;
  const canMoveDown = container ? index < container.length - 1 : false;
  const canIndent = depth === 0 && index > 0;
  const canOutdent = depth > 0;
  const canPromote = path.length >= 2;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: bullet.id,
    disabled: !editing,
  });

  const bulletMenuActions = buildBulletMenuActions(tree, path, depth, onChange);

  return (
    <Box
      sx={{
        pl: depth > 0 ? 1.5 : 0,
        ml: depth > 0 ? 1 : 0,
        borderLeft: depth > 0 ? "2px solid" : "none",
        borderColor: depth > 0 ? "divider" : undefined,
      }}
    >
      <Box
        ref={setNodeRef}
        className="work-history-bullet-row"
        style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.88 : 1 }}
        tabIndex={editing ? 0 : -1}
        onKeyDown={(event) => onKeyDown(event, {
          up: canMoveUp ? () => onChange(moveBulletUp(tree, path)) : undefined,
          down: canMoveDown ? () => onChange(moveBulletDown(tree, path)) : undefined,
          indent: canIndent ? () => onChange(indentBullet(tree, path)) : undefined,
          outdent: canOutdent ? () => onChange(outdentBullet(tree, path)) : undefined,
          promote: canPromote ? () => onChange(promoteBulletToRole(tree, path)) : undefined,
          addBelow: () => onChange(addBullet(tree, path)),
        })}
        sx={{
          display: "flex",
          gap: 0.25,
          alignItems: "flex-start",
          ...rowFocusSx,
        }}
      >
        {editing ? (
          <HoverActionRail
            dragAttributes={attributes}
            dragListeners={listeners}
            isDragging={isDragging}
            onMenuOpen={(anchor) => onOpenMenu(anchor, bulletMenuActions)}
          />
        ) : null}
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", gap: 0.75, alignItems: "flex-start" }}>
          {!editing ? (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ mt: 0.25, flexShrink: 0 }}>
              {depth > 0 ? "◦" : "•"}
            </Typography>
          ) : null}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <TextField
                value={bullet.text}
                multiline
                minRows={1}
                fullWidth
                variant="standard"
                placeholder="Describe an achievement or responsibility"
                onChange={(event) => onChange(updateBulletText(tree, path, event.target.value))}
                sx={bulletFieldSx}
              />
            ) : (
              <Typography component="p" variant="body2" sx={{ m: 0 }}>
                {bullet.text}
              </Typography>
            )}
            {renderBulletActions?.(bullet.id)}
          </Box>
        </Box>
      </Box>
      {bullet.children.map((child, childIndex) => (
        <Box key={child.id} sx={{ mt: 0.5 }}>
          <BulletSection
            bullet={child}
            path={[...path, childIndex]}
            depth={depth + 1}
            editing={editing}
            tree={tree}
            onChange={onChange}
            onOpenMenu={onOpenMenu}
            onKeyDown={onKeyDown}
            renderBulletActions={renderBulletActions}
          />
        </Box>
      ))}
    </Box>
  );
}
