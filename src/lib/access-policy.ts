import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_INSTITUTE_ID } from "@/lib/settings";

// Admin-configurable access policies (FR-ACL). These are per-institute toggles
// stored in the Setting table under "policy.*" and enforced server-side. Each
// defaults to the current hard-coded behaviour so upgrades change nothing.
export type AccessPolicy = {
  contentApproval: boolean; // teacher content needs admin approval before students see it
  publicDoubts: boolean;    // students can see peers' doubts (else only their own)
  studentComments: boolean; // students may comment on content resources
};

export const POLICY_DEFAULTS: AccessPolicy = {
  contentApproval: true,
  publicDoubts: true,
  studentComments: true,
};

// Setting key ↔ policy field.
export const POLICY_KEYS: Record<keyof AccessPolicy, string> = {
  contentApproval: "policy.contentApproval",
  publicDoubts: "policy.publicDoubts",
  studentComments: "policy.studentComments",
};

export async function getAccessPolicy(
  instituteId: string = DEFAULT_INSTITUTE_ID
): Promise<AccessPolicy> {
  const rows = await db.setting.findMany({
    where: { instituteId, key: { in: Object.values(POLICY_KEYS) } },
    select: { key: true, value: true },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const read = (field: keyof AccessPolicy) => {
    const v = map[POLICY_KEYS[field]];
    return v === undefined ? POLICY_DEFAULTS[field] : v === "true";
  };
  return {
    contentApproval: read("contentApproval"),
    publicDoubts: read("publicDoubts"),
    studentComments: read("studentComments"),
  };
}
