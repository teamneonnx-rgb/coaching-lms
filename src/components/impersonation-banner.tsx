import { getSessionContext } from "@/lib/impersonation";
import { stopImpersonation } from "@/lib/actions/admin/impersonate";
import { Eye } from "lucide-react";

// FR-SA-06: a persistent read-only banner shown whenever the Super Admin is
// impersonating. Rendered in the root layout so it appears on every shell.
export async function ImpersonationBanner() {
  const ctx = await getSessionContext();
  if (!ctx?.impersonating) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
      <Eye className="size-3.5" />
      <span>
        Viewing as <strong>{ctx.user.name}</strong> ({ctx.user.role}) — read-only
      </span>
      <form action={stopImpersonation}>
        <button type="submit" className="rounded-full bg-amber-950/10 px-2.5 py-0.5 font-semibold hover:bg-amber-950/20">
          Stop
        </button>
      </form>
    </div>
  );
}
