import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { DEFAULT_INSTITUTE_ID } from "@/lib/settings";

// White-label branding (name, logo, accent colour) resolved from Setting rows
// so an institute can rebrand the whole portal from the Control Center with no
// code change or redeploy. Blank/absent values fall back to the defaults below.
export type Branding = {
  name: string;
  tagline: string;
  logoUrl: string | null;
  color: string;
};

export const BRAND_KEYS = ["brand.name", "brand.tagline", "brand.logoUrl", "brand.color"] as const;

export const DEFAULT_BRANDING: Branding = {
  name: "Coaching LMS",
  tagline:
    "Batches, courses, assessments, attendance, and notifications — one platform for admins, teachers, and students.",
  logoUrl: null,
  color: "#2563eb",
};

// Only accept a well-formed hex colour; otherwise fall back (defends the
// inline style="background:…" sinks against a malformed stored value).
function safeColor(v: string | undefined): string {
  return v && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim()) ? v.trim() : DEFAULT_BRANDING.color;
}

// Cached per request so the layout + header + sidebar share one query.
export const getBranding = cache(
  async (instituteId: string = DEFAULT_INSTITUTE_ID): Promise<Branding> => {
    const rows = await db.setting.findMany({
      where: { instituteId, key: { in: [...BRAND_KEYS] } },
      select: { key: true, value: true },
    });
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      name: m["brand.name"]?.trim() || DEFAULT_BRANDING.name,
      tagline: m["brand.tagline"]?.trim() || DEFAULT_BRANDING.tagline,
      logoUrl: m["brand.logoUrl"]?.trim() || null,
      color: safeColor(m["brand.color"]),
    };
  }
);
