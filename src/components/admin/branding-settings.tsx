"use client";

import { useState, useTransition } from "react";
import { GraduationCap, Loader2, Palette } from "lucide-react";
import { toast } from "sonner";
import { saveSettings } from "@/lib/actions/admin/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type BrandingValues = { name: string; tagline: string; logoUrl: string; color: string };

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function BrandingSettings({ initial }: { initial: BrandingValues }) {
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [color, setColor] = useState(initial.color);
  const [isPending, startTransition] = useTransition();

  const colorValid = HEX.test(color);
  const previewColor = colorValid ? color : "#2563eb";

  function save() {
    if (!colorValid) {
      toast.error("Enter a valid hex colour, e.g. #2563eb");
      return;
    }
    startTransition(async () => {
      const res = await saveSettings({
        section: "branding",
        values: {
          "brand.name": name.trim(),
          "brand.tagline": tagline.trim(),
          "brand.logoUrl": logoUrl.trim(),
          "brand.color": color.trim(),
        },
      });
      if (res.ok) toast.success("Branding saved — reload to see it everywhere");
      else toast.error(res.error ?? "Could not save");
    });
  }

  return (
    <Card className="mb-6 border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Palette className="size-4 text-slate-500" /> Branding (white-label)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Live preview */}
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <span
            className="flex size-11 items-center justify-center overflow-hidden rounded-lg text-white"
            style={{ backgroundColor: logoUrl.trim() ? "transparent" : previewColor }}
          >
            {logoUrl.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl.trim()} alt="" className="size-11 object-contain" />
            ) : (
              <GraduationCap className="size-6" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{name.trim() || "Coaching LMS"}</p>
            <p className="truncate text-xs text-muted-foreground">{tagline.trim() || "Your tagline appears here"}</p>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Brand name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Coaching Institute" />
        </div>

        <div className="grid gap-1.5">
          <Label>Tagline</Label>
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Shown on the landing and sign-in screens" />
        </div>

        <div className="grid gap-1.5">
          <Label>Logo URL <span className="font-normal text-muted-foreground">(optional — falls back to the glyph)</span></Label>
          <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png  or  data:image/png;base64,…" />
        </div>

        <div className="grid gap-1.5">
          <Label>Primary colour</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={colorValid ? color : "#2563eb"}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Primary colour picker"
              className="h-9 w-12 cursor-pointer rounded-md border border-slate-200 bg-white p-1"
            />
            <Input
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#2563eb"
              className={`w-40 font-mono ${colorValid ? "" : "border-red-300"}`}
            />
            {!colorValid && <span className="text-xs text-red-600">Invalid hex</span>}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={save} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save branding
          </Button>
          <p className="text-xs text-muted-foreground">Leave a field blank to restore its default.</p>
        </div>
      </CardContent>
    </Card>
  );
}
