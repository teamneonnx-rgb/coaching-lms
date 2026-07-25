import type { Block, BlockType, Breakpoint } from "@/lib/pages/types";
import { getBlockDef } from "@/lib/pages/registry";

// Pure, immutable operations on a block tree. Every op clones the input and
// returns a new tree, so the editor's undo/redo can snapshot cheaply.

export function newBlock(type: BlockType): Block {
  const def = getBlockDef(type);
  const block: Block = { id: crypto.randomUUID(), type, props: { ...(def?.defaults ?? {}) } };
  if (def?.isContainer) block.children = [];
  return block;
}

// Base props live on desktop; tablet/mobile are overrides merged on top.
export function resolveProps(block: Block, bp: Breakpoint): Record<string, unknown> {
  const override = bp !== "desktop" ? block.responsive?.[bp] ?? {} : {};
  return { ...block.props, ...override };
}

const clone = (tree: Block[]): Block[] => structuredClone(tree);

export function findBlock(tree: Block[], id: string): Block | null {
  for (const b of tree) {
    if (b.id === id) return b;
    if (b.children) {
      const f = findBlock(b.children, id);
      if (f) return f;
    }
  }
  return null;
}

function collectIds(b: Block, acc = new Set<string>()): Set<string> {
  acc.add(b.id);
  b.children?.forEach((c) => collectIds(c, acc));
  return acc;
}

function spliceOut(tree: Block[], id: string): Block | null {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) return tree.splice(i, 1)[0];
    const kids = tree[i].children;
    if (kids) {
      const r = spliceOut(kids, id);
      if (r) return r;
    }
  }
  return null;
}

// Find a block's parent id + index within that parent (root = null parent).
function locate(tree: Block[], id: string, parentId: string | null = null): { parentId: string | null; index: number } | null {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) return { parentId, index: i };
    const kids = tree[i].children;
    if (kids) {
      const r = locate(kids, id, tree[i].id);
      if (r) return r;
    }
  }
  return null;
}

// The children array for a parent (null = root). Creates it for containers.
function childrenOf(tree: Block[], parentId: string | null): Block[] | null {
  if (parentId === null) return tree;
  const parent = findBlock(tree, parentId);
  if (!parent) return null;
  if (!parent.children) parent.children = [];
  return parent.children;
}

export function insertBlock(tree: Block[], block: Block, parentId: string | null, index: number): Block[] {
  const t = clone(tree);
  const arr = childrenOf(t, parentId);
  if (!arr) return tree;
  arr.splice(Math.max(0, Math.min(index, arr.length)), 0, block);
  return t;
}

export function removeBlock(tree: Block[], id: string): Block[] {
  const t = clone(tree);
  spliceOut(t, id);
  return t;
}

export function moveBlock(tree: Block[], id: string, parentId: string | null, index: number): Block[] {
  const src = findBlock(tree, id);
  if (!src) return tree;
  // Guard: never move a block into itself or one of its descendants.
  if (parentId !== null && collectIds(src).has(parentId)) return tree;

  // Same-parent downward move: removing first shifts the target left by one.
  const loc = locate(tree, id);
  let idx = index;
  if (loc && loc.parentId === parentId && loc.index < index) idx = index - 1;

  const t = clone(tree);
  const removed = spliceOut(t, id);
  if (!removed) return tree;
  const arr = childrenOf(t, parentId);
  if (!arr) return tree;
  arr.splice(Math.max(0, Math.min(idx, arr.length)), 0, removed);
  return t;
}

export function updateBlockProps(tree: Block[], id: string, patch: Record<string, unknown>, bp: Breakpoint): Block[] {
  const t = clone(tree);
  const b = findBlock(t, id);
  if (!b) return tree;
  if (bp === "desktop") {
    b.props = { ...b.props, ...patch };
  } else {
    b.responsive = { ...(b.responsive ?? {}), [bp]: { ...(b.responsive?.[bp] ?? {}), ...patch } };
  }
  return t;
}

export function duplicateBlock(tree: Block[], id: string): Block[] {
  const t = clone(tree);
  const reid = (b: Block): Block => ({ ...b, id: crypto.randomUUID(), children: b.children?.map(reid) });
  const walk = (arr: Block[]): boolean => {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].id === id) {
        arr.splice(i + 1, 0, reid(structuredClone(arr[i])));
        return true;
      }
      const kids = arr[i].children;
      if (kids && walk(kids)) return true;
    }
    return false;
  };
  walk(t);
  return t;
}
