export type ResumeBulletNode = {
  id: string;
  text: string;
  children: ResumeBulletNode[];
};

const CHILD_PREFIX = "  ";

export function createBulletNode(text = ""): ResumeBulletNode {
  return { id: newBulletId(), text, children: [] };
}

export function newBulletId() {
  return `temp-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function isTempBulletId(id: string) {
  return id.startsWith("temp-");
}

export function achievementsToTree(achievements: string[]): ResumeBulletNode[] {
  const nodes: ResumeBulletNode[] = [];
  let current: ResumeBulletNode | null = null;

  for (const achievement of achievements) {
    const childText = stripChildPrefix(achievement);
    if (!childText) continue;

    const node = createBulletNode(childText);
    if (isChildAchievement(achievement) && current) {
      current.children.push(node);
      continue;
    }

    nodes.push(node);
    current = node;
  }

  return nodes;
}

export function treeToAchievements(nodes: ResumeBulletNode[]): string[] {
  const achievements: string[] = [];

  for (const node of nodes) {
    const text = node.text.trim();
    if (text) achievements.push(text);
    for (const child of node.children) {
      const childText = child.text.trim();
      if (childText) achievements.push(`${CHILD_PREFIX}${childText}`);
    }
  }

  return achievements;
}

export function treeToMarkdownLines(nodes: ResumeBulletNode[]): string[] {
  return nodes.flatMap((node) => {
    const lines: string[] = [];
    if (node.text.trim()) lines.push(`- ${node.text.trim()}`);
    for (const child of node.children) {
      if (child.text.trim()) lines.push(`  - ${child.text.trim()}`);
    }
    return lines;
  });
}

export function treeToFlatLines(nodes: ResumeBulletNode[]): string[] {
  const lines: string[] = [];
  for (const node of nodes) {
    if (node.text.trim()) lines.push(node.text.trim());
    for (const child of node.children) {
      if (child.text.trim()) lines.push(`${CHILD_PREFIX}${child.text.trim()}`);
    }
  }
  return lines;
}

export function bulletsToTree<T extends { id: string; text: string }>(bullets: T[]): ResumeBulletNode[] {
  const nodes: ResumeBulletNode[] = [];
  let current: ResumeBulletNode | null = null;

  for (const bullet of bullets) {
    const childText = stripChildPrefix(bullet.text);
    if (!childText) continue;

    const node: ResumeBulletNode = { id: bullet.id, text: childText, children: [] };
    if (isChildAchievement(bullet.text) && current) {
      current.children.push(node);
      continue;
    }

    nodes.push(node);
    current = node;
  }

  return nodes;
}

export function updateBulletText(nodes: ResumeBulletNode[], path: number[], text: string): ResumeBulletNode[] {
  return updateAtPath(nodes, path, (node) => ({ ...node, text }));
}

export function addBullet(nodes: ResumeBulletNode[], path?: number[]): ResumeBulletNode[] {
  const next = cloneTree(nodes);
  const node = createBulletNode("");

  if (!path || path.length === 0) {
    next.push(node);
    return next;
  }

  if (path.length === 1) {
    next.splice(path[0] + 1, 0, node);
    return next;
  }

  const parent = getNodeAt(next, path.slice(0, -1));
  if (!parent) {
    next.push(node);
    return next;
  }

  parent.children.splice(path[path.length - 1] + 1, 0, node);
  return next;
}

export function removeBullet(nodes: ResumeBulletNode[], path: number[]): ResumeBulletNode[] {
  if (path.length === 0) return nodes;
  const next = cloneTree(nodes);

  if (path.length === 1) {
    next.splice(path[0], 1);
    return next;
  }

  const parent = getNodeAt(next, path.slice(0, -1));
  if (!parent) return next;
  parent.children.splice(path[path.length - 1], 1);
  return next;
}

export function moveBulletUp(nodes: ResumeBulletNode[], path: number[]): ResumeBulletNode[] {
  if (path.length === 0) return nodes;
  const next = cloneTree(nodes);
  const index = path[path.length - 1];
  if (index <= 0) return nodes;

  const container = getBulletContainer(next, path);
  if (!container) return nodes;
  [container[index - 1], container[index]] = [container[index], container[index - 1]];
  return next;
}

export function moveBulletDown(nodes: ResumeBulletNode[], path: number[]): ResumeBulletNode[] {
  if (path.length === 0) return nodes;
  const next = cloneTree(nodes);
  const container = getBulletContainer(next, path);
  if (!container) return nodes;

  const index = path[path.length - 1];
  if (index >= container.length - 1) return nodes;
  [container[index], container[index + 1]] = [container[index + 1], container[index]];
  return next;
}

export function indentBullet(nodes: ResumeBulletNode[], path: number[]): ResumeBulletNode[] {
  if (path.length !== 1 || path[0] === 0) return nodes;

  const next = cloneTree(nodes);
  const index = path[0];
  const [node] = next.splice(index, 1);
  if (!node) return nodes;

  next[index - 1].children.push(node);
  return next;
}

export function outdentBullet(nodes: ResumeBulletNode[], path: number[]): ResumeBulletNode[] {
  if (path.length !== 2) return nodes;

  const next = cloneTree(nodes);
  const parent = getNodeAt(next, [path[0]]);
  if (!parent) return nodes;

  const [node] = parent.children.splice(path[1], 1);
  if (!node) return nodes;

  next.splice(path[0] + 1, 0, node);
  return next;
}

function isChildAchievement(value: string) {
  return /^\s{2,}/.test(value);
}

function stripChildPrefix(value: string) {
  return value.replace(/^\s+/, "").trim();
}

function cloneTree(nodes: ResumeBulletNode[]): ResumeBulletNode[] {
  return nodes.map((node) => ({
    ...node,
    children: cloneTree(node.children),
  }));
}

export function getBulletContainer(nodes: ResumeBulletNode[], path: number[]): ResumeBulletNode[] | null {
  if (path.length === 1) return nodes;
  const parent = getNodeAt(nodes, path.slice(0, -1));
  return parent?.children ?? null;
}

function getNodeAt(nodes: ResumeBulletNode[], path: number[]): ResumeBulletNode | null {
  let current: ResumeBulletNode | undefined;
  let container = nodes;

  for (let depth = 0; depth < path.length; depth += 1) {
    current = container[path[depth]];
    if (!current) return null;
    container = current.children;
  }

  return current ?? null;
}

function updateAtPath(
  nodes: ResumeBulletNode[],
  path: number[],
  updater: (node: ResumeBulletNode) => ResumeBulletNode,
): ResumeBulletNode[] {
  if (path.length === 0) return nodes;

  const next = cloneTree(nodes);
  const node = getNodeAt(next, path);
  if (!node) return nodes;

  const updated = updater(node);
  const container = getBulletContainer(next, path);
  if (!container) return nodes;
  container[path[path.length - 1]] = { ...updated, children: cloneTree(updated.children) };
  return next;
}
