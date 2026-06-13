export type WorkHistoryRoleNode = {
  kind: "role";
  id: string;
  company: string;
  title: string;
  startDate?: string | null;
  endDate?: string | null;
  children: WorkHistoryBulletNode[];
};

export type WorkHistoryBulletNode = {
  kind: "bullet";
  id: string;
  text: string;
  children: WorkHistoryBulletNode[];
};

export type WorkHistoryTree = WorkHistoryRoleNode[];

export type NodePath = number[];

export function newNodeId() {
  return `temp-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function isTempNodeId(id: string) {
  return id.startsWith("temp-");
}

export function createRoleNode(partial?: Partial<Pick<WorkHistoryRoleNode, "company" | "title" | "startDate" | "endDate">>): WorkHistoryRoleNode {
  return {
    kind: "role",
    id: newNodeId(),
    company: partial?.company ?? "Company",
    title: partial?.title ?? "Role title",
    startDate: partial?.startDate ?? null,
    endDate: partial?.endDate ?? null,
    children: [createBulletNode()],
  };
}

export function createBulletNode(text = ""): WorkHistoryBulletNode {
  return { kind: "bullet", id: newNodeId(), text, children: [] };
}

const INDENT = "  ";

export function treeToAchievements(role: WorkHistoryRoleNode): string[] {
  return flattenBulletNodes(role.children, 0);
}

function flattenBulletNodes(nodes: WorkHistoryBulletNode[], depth: number): string[] {
  const lines: string[] = [];
  for (const node of nodes) {
    const text = node.text.trim();
    if (text) lines.push(`${INDENT.repeat(depth)}${text}`);
    lines.push(...flattenBulletNodes(node.children, depth + 1));
  }
  return lines;
}

export function achievementsToBulletTree(achievements: string[]): WorkHistoryBulletNode[] {
  const roots: WorkHistoryBulletNode[] = [];
  const stack: { depth: number; node: WorkHistoryBulletNode }[] = [];

  for (const achievement of achievements) {
    const match = achievement.match(/^(\s*)(.+)$/);
    if (!match) continue;
    const depth = Math.floor(match[1].length / INDENT.length);
    const text = match[2].trim();
    if (!text) continue;

    const node = createBulletNode(text);
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
    if (depth === 0 || stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }
    stack.push({ depth, node });
  }

  return roots;
}

export function prefillRoleFromBulletText(text: string): Pick<WorkHistoryRoleNode, "company" | "title" | "startDate" | "endDate"> {
  const trimmed = text.trim();
  const dateMatch = trimmed.match(
    /((?:\d{1,2}\/\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}))\s*[-–]\s*((?:\d{1,2}\/\d{4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}))/i,
  );
  const withoutDates = dateMatch ? trimmed.replace(dateMatch[0], "").replace(/,\s*$/, "").trim() : trimmed;
  const commaParts = withoutDates.split(",");
  const company = (commaParts[0] ?? withoutDates).trim();
  const title = commaParts.length > 1 ? commaParts.slice(1).join(",").trim() : "Role title";

  return {
    company: company || "Company",
    title: title || "Role title",
    startDate: dateMatch?.[1]?.trim() ?? null,
    endDate: dateMatch?.[2]?.trim() ?? null,
  };
}

export function roleToBulletText(role: WorkHistoryRoleNode): string {
  const dates = [role.startDate, role.endDate].filter(Boolean).join(" – ");
  const base = `${role.company}${role.title ? `, ${role.title}` : ""}`;
  return dates ? `${base}, ${dates}.` : `${base}.`;
}

function cloneTree(tree: WorkHistoryTree): WorkHistoryTree {
  return tree.map((role) => ({
    ...role,
    children: cloneBulletNodes(role.children),
  }));
}

function cloneBulletNodes(nodes: WorkHistoryBulletNode[]): WorkHistoryBulletNode[] {
  return nodes.map((node) => ({
    ...node,
    children: cloneBulletNodes(node.children),
  }));
}

export function getRoleAt(tree: WorkHistoryTree, roleIndex: number): WorkHistoryRoleNode | null {
  return tree[roleIndex] ?? null;
}

export function updateRoleAt(tree: WorkHistoryTree, roleIndex: number, patch: Partial<WorkHistoryRoleNode>): WorkHistoryTree {
  return tree.map((role, index) => (index === roleIndex ? { ...role, ...patch, kind: "role" as const } : role));
}

function getBulletParentList(tree: WorkHistoryTree, path: NodePath): WorkHistoryBulletNode[] | null {
  if (path.length === 0) return null;
  const role = tree[path[0]];
  if (!role) return null;
  let container = role.children;
  for (let depth = 1; depth < path.length - 1; depth += 1) {
    const node = container[path[depth]];
    if (!node) return null;
    container = node.children;
  }
  return container;
}

function getBulletAt(tree: WorkHistoryTree, path: NodePath): WorkHistoryBulletNode | null {
  const container = getBulletParentList(tree, path);
  if (!container) return null;
  return container[path[path.length - 1]] ?? null;
}

export function updateBulletText(tree: WorkHistoryTree, path: NodePath, text: string): WorkHistoryTree {
  const next = cloneTree(tree);
  const container = getBulletParentList(next, path);
  const node = container?.[path[path.length - 1]];
  if (!container || !node) return tree;
  container[path[path.length - 1]] = { ...node, text };
  return next;
}

export function addBullet(tree: WorkHistoryTree, path: NodePath): WorkHistoryTree {
  const next = cloneTree(tree);
  const container = path.length <= 1 ? next[path[0]]?.children : getBulletParentList(next, path);
  if (!container) return tree;
  const insertAt = path.length <= 1 ? container.length : path[path.length - 1] + 1;
  container.splice(insertAt, 0, createBulletNode());
  return next;
}

export function removeBullet(tree: WorkHistoryTree, path: NodePath): WorkHistoryTree {
  if (path.length < 2) return tree;
  const next = cloneTree(tree);
  const container = getBulletParentList(next, path);
  if (!container) return tree;
  container.splice(path[path.length - 1], 1);
  return next;
}

export function moveBulletUp(tree: WorkHistoryTree, path: NodePath): WorkHistoryTree {
  const index = path[path.length - 1];
  if (index <= 0) return tree;
  const next = cloneTree(tree);
  const container = getBulletParentList(next, path);
  if (!container) return tree;
  [container[index - 1], container[index]] = [container[index], container[index - 1]];
  return next;
}

export function moveBulletDown(tree: WorkHistoryTree, path: NodePath): WorkHistoryTree {
  const next = cloneTree(tree);
  const container = getBulletParentList(next, path);
  if (!container) return tree;
  const index = path[path.length - 1];
  if (index >= container.length - 1) return tree;
  [container[index], container[index + 1]] = [container[index + 1], container[index]];
  return next;
}

export function indentBullet(tree: WorkHistoryTree, path: NodePath): WorkHistoryTree {
  const index = path[path.length - 1];
  if (index <= 0 || path.length < 2) return tree;
  const next = cloneTree(tree);
  const container = getBulletParentList(next, path);
  if (!container) return tree;
  const [node] = container.splice(index, 1);
  if (!node) return tree;
  container[index - 1].children.push(node);
  return next;
}

export function outdentBullet(tree: WorkHistoryTree, path: NodePath): WorkHistoryTree {
  if (path.length < 3) return tree;
  const next = cloneTree(tree);
  const parentContainer = getBulletParentList(next, path.slice(0, -1));
  const container = getBulletParentList(next, path);
  if (!parentContainer || !container) return tree;
  const parentIndex = path[path.length - 2];
  const [node] = container.splice(path[path.length - 1], 1);
  if (!node) return tree;
  parentContainer.splice(parentIndex + 1, 0, node);
  return next;
}

export function promoteBulletToRole(tree: WorkHistoryTree, path: NodePath): WorkHistoryTree {
  const bullet = getBulletAt(tree, path);
  if (!bullet || path.length < 2) return tree;
  const next = removeBullet(tree, path);
  const prefill = prefillRoleFromBulletText(bullet.text);
  const newRole: WorkHistoryRoleNode = {
    kind: "role",
    id: newNodeId(),
    ...prefill,
    children: bullet.children.length ? bullet.children : [createBulletNode()],
  };
  const roleIndex = path[0];
  return [...next.slice(0, roleIndex + 1), newRole, ...next.slice(roleIndex + 1)];
}

export function demoteRoleToBullet(tree: WorkHistoryTree, roleIndex: number): WorkHistoryTree {
  const role = tree[roleIndex];
  if (!role || roleIndex === 0) return tree;
  const targetRole = tree[roleIndex - 1];
  if (!targetRole) return tree;

  const next = cloneTree(tree);
  const demoted = next[roleIndex];
  if (!demoted) return tree;

  const bulletText = roleToBulletText(demoted);
  const mergedChildren = [
    ...demoted.children,
    ...demoted.children.length ? [] : [],
  ];
  const newBullet: WorkHistoryBulletNode = {
    kind: "bullet",
    id: newNodeId(),
    text: bulletText,
    children: mergedChildren,
  };

  next[roleIndex - 1].children.push(newBullet);
  next.splice(roleIndex, 1);
  return next;
}

export function moveRoleUp(tree: WorkHistoryTree, roleIndex: number): WorkHistoryTree {
  if (roleIndex <= 0) return tree;
  const next = [...tree];
  [next[roleIndex - 1], next[roleIndex]] = [next[roleIndex], next[roleIndex - 1]];
  return next;
}

export function moveRoleDown(tree: WorkHistoryTree, roleIndex: number): WorkHistoryTree {
  if (roleIndex >= tree.length - 1) return tree;
  const next = [...tree];
  [next[roleIndex], next[roleIndex + 1]] = [next[roleIndex + 1], next[roleIndex]];
  return next;
}

export function addRole(tree: WorkHistoryTree): WorkHistoryTree {
  return [...tree, createRoleNode()];
}

export function removeRole(tree: WorkHistoryTree, roleIndex: number): WorkHistoryTree {
  return tree.filter((_, index) => index !== roleIndex);
}

export function countBullets(tree: WorkHistoryTree): number {
  return tree.reduce((count, role) => count + countBulletNodes(role.children), 0);
}

function countBulletNodes(nodes: WorkHistoryBulletNode[]): number {
  return nodes.reduce((count, node) => count + 1 + countBulletNodes(node.children), 0);
}

export function treeToMarkdownLines(role: WorkHistoryRoleNode): string[] {
  return flattenBulletNodes(role.children, 0).map((line) => {
    const depth = Math.floor((line.length - line.trimStart().length) / INDENT.length);
    const text = line.trim();
    return `${INDENT.repeat(depth)}- ${text}`;
  });
}
