import type { Metadata } from "next";
import { Plug } from "lucide-react";
import { requireAdminArea } from "@/lib/session";
import { db } from "@/lib/db";
import { getIntegrationStatus, DEFAULT_INSTITUTE_ID } from "@/lib/settings";
import { PageHeader } from "@/components/admin/page-header";
import { IntegrationSettings } from "@/components/admin/integration-settings";

export const metadata: Metadata = { title: "Control Center" };

export default async function ControlCenterPage() {
  const admin = await requireAdminArea();
  const actor = await db.user.findUnique({
    where: { id: admin.id },
    select: { instituteId: true },
  });
  const status = await getIntegrationStatus(actor?.instituteId ?? DEFAULT_INSTITUTE_ID);

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
      <IntegrationSettings status={status} />
    </div>
  );
}
