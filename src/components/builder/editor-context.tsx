"use client";

import { createContext, useContext } from "react";
import type { Breakpoint } from "@/lib/pages/types";
import type { EditorApi } from "./use-editor";

type Ctx = { api: EditorApi; breakpoint: Breakpoint };

export const EditorContext = createContext<Ctx | null>(null);

export function useEditorCtx() {
  const c = useContext(EditorContext);
  if (!c) throw new Error("useEditorCtx must be used inside <EditorContext>");
  return c;
}
