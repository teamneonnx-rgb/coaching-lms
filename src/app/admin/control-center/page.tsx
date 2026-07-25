import type { Metadata } from "next";
import { Plug } from "lucide-react";
import { requireAdminArea } from "@/lib/session";
import { db } from "@/lib/db";
import { getIntegrationStatus, DEFAULT_INSTITUTE_ID } from "@/lib/settings";
import { getBranding } from "@/lib/branding";
import { PageHeader } from "@/components/admin/page-header";
import { IntegrationSettings } from "@/components/admin/integration-settings";
import { BrandingSettings } from "@/components/admin/branding-settings";

export const metadata: Metadata = { title: "Control Center" };

export default async function ControlCenterPage() {
  const admin = await requireAdminArea();
  const actor = await db.user.findUnique({
    where: { id: admin.id },
    select: { instituteId: true },
  });
  const instituteId = actor?.instituteId ?? DEFAULT_INSTITUTE_ID;
  const status = await getIntegrationStatus(instituteId);
  const isSuperAdmin = admin.role === "SUPER_ADMIN";

  // Raw stored branding for the editor (blank when unset, so placeholders show
  // the defaults and "leave blank to restore default" behaves correctly). Colour
  // uses the resolved value so the picker always starts on a valid hex.
  const brand = await getBranding(instituteId);
  const brandRows = await db.setting.findMany({
    where: { instituteId, key: { in: ["brand.name", "brand.tagline", "brand.logoUrl"] } },
    select: { key: true, value: true },
  });
  const bm = Object.fromEntries(brandRows.map((r) => [r.key, r.value]));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Control Center"
        description="Configure integrations from the portal — no server access needed."
      />
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
        <Plug className="mt-0.5 size-4 shrink-0" />
        <p>
          Enter your provider credentials below and Save. Secrets are stored securely and shown
          masked; leave a secret field blank to keep the saved value. Once a section shows
          <span className="font-medium"> Configured</span>, the app uses it automatically.
        </p>
      </div>
      {isSuperAdmin && (
        <BrandingSettings
          initial={{
            name: bm["brand.name"] ?? "",
            tagline: bm["brand.tagline"] ?? "",
            logoUrl: bm["brand.logoUrl"] ?? "",
            color: brand.color,
          }}
        />
      )}
      <IntegrationSettings status={status} />
    </div>
  );
}
