"use client";

import { useReducer, useCallback } from "react";
import type { Block, Breakpoint } from "@/lib/pages/types";
import {
  insertBlock, moveBlock, removeBlock, duplicateBlock, updateBlockProps,
} from "@/lib/pages/tree";

type State = { present: Block[]; past: Block[][]; future: Block[][]; selectedId: string | null };

type Action =
  | { kind: "commit"; tree: Block[]; select?: string | null }
  | { kind: "select"; id: string | null }
  | { kind: "undo" }
  | { kind: "redo" };

const MAX_HISTORY = 50;

function reducer(state: State, action: Action): State {
  switch (action.kind) {
    case "commit": {
      const past = [...state.past, state.present].slice(-MAX_HISTORY);
      return {
        present: action.tree, past, future: [],
        selectedId: action.select !== undefined ? action.select : state.selectedId,
      };
    }
    case "select":
      return { ...state, selectedId: action.id };
    case "undo": {
      if (!state.past.length) return state;
      const prev = state.past[state.past.length - 1];
      return { present: prev, past: state.past.slice(0, -1), future: [state.present, ...state.future], selectedId: state.selectedId };
    }
    case "redo": {
      if (!state.future.length) return state;
      const next = state.future[0];
      return { present: next, past: [...state.past, state.present], future: state.future.slice(1), selectedId: state.selectedId };
    }
    default:
      return state;
  }
}

export function useEditor(initial: Block[]) {
  const [state, dispatch] = useReducer(reducer, { present: initial, past: [], future: [], selectedId: null });
  const { present } = state;

  const insert = useCallback((block: Block, parentId: string | null, index: number) => {
    dispatch({ kind: "commit", tree: insertBlock(present, block, parentId, index), select: block.id });
  }, [present]);

  const move = useCallback((id: string, parentId: string | null, index: number) => {
    dispatch({ kind: "commit", tree: moveBlock(present, id, parentId, index) });
  }, [present]);

  const remove = useCallback((id: string) => {
    dispatch({ kind: "commit", tree: removeBlock(present, id), select: null });
  }, [present]);

  const duplicate = useCallback((id: string) => {
    dispatch({ kind: "commit", tree: duplicateBlock(present, id) });
  }, [present]);

  const updateProps = useCallback((id: string, patch: Record<string, unknown>, bp: Breakpoint) => {
    dispatch({ kind: "commit", tree: updateBlockProps(present, id, patch, bp) });
  }, [present]);

  const select = useCallback((id: string | null) => dispatch({ kind: "select", id }), []);
  const undo = useCallback(() => dispatch({ kind: "undo" }), []);
  const redo = useCallback(() => dispatch({ kind: "redo" }), []);

  return {
    tree: present,
    selectedId: state.selectedId,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    insert, move, remove, duplicate, updateProps, select, undo, redo,
  };
}

export type EditorApi = ReturnType<typeof useEditor>;
