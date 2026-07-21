"use client";

import { useState, useTransition } from "react";
import { CreditCard, MessageCircle, Mail, Smartphone, Loader2, Check, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { saveSettings } from "@/lib/actions/admin/settings";
import type { IntegrationStatus } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function StatusChip({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
      <Check className="size-3" /> Configured
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      <CircleAlert className="size-3" /> Not configured
    </span>
  );
}

function SecretField({
  label,
  isSet,
  value,
  onChange,
}: {
  label: string;
  isSet: boolean;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={isSet ? "•••••••••• (saved — leave blank to keep)" : "Enter value"}
        autoComplete="off"
      />
    </div>
  );
}

export function IntegrationSettings({ status }: { status: IntegrationStatus }) {
  return (
    <Tabs defaultValue="razorpay">
      <TabsList className="mb-4 flex-wrap">
        <TabsTrigger value="razorpay"><CreditCard className="size-4" /> Payments</TabsTrigger>
        <TabsTrigger value="whatsapp"><MessageCircle className="size-4" /> WhatsApp</TabsTrigger>
        <TabsTrigger value="email"><Mail className="size-4" /> Email</TabsTrigger>
        <TabsTrigger value="sms"><Smartphone className="size-4" /> SMS</TabsTrigger>
      </TabsList>

      <TabsContent value="razorpay"><RazorpayForm status={status.razorpay} /></TabsContent>
      <TabsContent value="whatsapp"><WhatsAppForm status={status.whatsapp} /></TabsContent>
      <TabsContent value="email"><EmailForm status={status.email} /></TabsContent>
      <TabsContent value="sms"><SmsForm status={status.sms} /></TabsContent>
    </Tabs>
  );
}

function SectionCard({
  title,
  desc,
  configured,
  children,
  onSave,
  pending,
}: {
  title: string;
  desc: string;
  configured: boolean;
  children: React.ReactNode;
  onSave: () => void;
  pending: boolean;
}) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
        </div>
        <StatusChip ok={configured} />
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        <Button onClick={onSave} disabled={pending} className="bg-blue-600 text-white hover:bg-blue-600/90">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

function useSave(section: "razorpay" | "whatsapp" | "email" | "sms") {
  const [pending, start] = useTransition();
  const save = (values: Record<string, string>) =>
    start(async () => {
      const r = await saveSettings({ section, values });
      if (r.ok) toast.success("Integration saved");
      else toast.error(r.error ?? "Failed");
    });
  return { pending, save };
}

function RazorpayForm({ status }: { status: IntegrationStatus["razorpay"] }) {
  const { pending, save } = useSave("razorpay");
  const [enabled, setEnabled] = useState(status.enabled);
  const [mode, setMode] = useState(status.mode);
  const [keyId, setKeyId] = useState(status.keyId);
  const [keySecret, setKeySecret] = useState("");
  return (
    <SectionCard
      title="Razorpay payment gateway"
      desc="Collect fees via UPI, cards, netbanking and wallets (FR-PAY-1/2)."
      configured={status.configured}
      pending={pending}
      onSave={() => save({ "razorpay.enabled": String(enabled), "razorpay.mode": mode, "razorpay.keyId": keyId, "razorpay.keySecret": keySecret })}
    >
      <label className="flex items-center gap-2">
        <Checkbox checked={enabled} onCheckedChange={(v) => setEnabled(v === true)} />
        <span className="text-sm">Enabled</span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Mode</Label>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="test">Test</SelectItem>
              <SelectItem value="live">Live</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Key ID</Label>
          <Input value={keyId} onChange={(e) => setKeyId(e.target.value)} placeholder="rzp_test_..." autoComplete="off" />
        </div>
      </div>
      <SecretField label="Key Secret" isSet={status.keySecretSet} value={keySecret} onChange={setKeySecret} />
    </SectionCard>
  );
}

function WhatsAppForm({ status }: { status: IntegrationStatus["whatsapp"] }) {
  const { pending, save } = useSave("whatsapp");
  const [enabled, setEnabled] = useState(status.enabled);
  const [phoneNumberId, setPhoneNumberId] = useState(status.phoneNumberId);
  const [businessAccountId, setBusinessAccountId] = useState(status.businessAccountId);
  const [accessToken, setAccessToken] = useState("");
  return (
    <SectionCard
      title="WhatsApp Business Cloud API"
      desc="Send attendance & fee alerts over WhatsApp (FR-WA-1)."
      configured={status.configured}
      pending={pending}
      onSave={() => save({ "whatsapp.enabled": String(enabled), "whatsapp.phoneNumberId": phoneNumberId, "whatsapp.businessAccountId": businessAccountId, "whatsapp.accessToken": accessToken })}
    >
      <label className="flex items-center gap-2">
        <Checkbox checked={enabled} onCheckedChange={(v) => setEnabled(v === true)} />
        <span className="text-sm">Enabled</span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Phone Number ID</Label>
          <Input value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} autoComplete="off" />
        </div>
        <div className="grid gap-1.5">
          <Label>Business Account ID</Label>
          <Input value={businessAccountId} onChange={(e) => setBusinessAccountId(e.target.value)} autoComplete="off" />
        </div>
      </div>
      <SecretField label="Access Token" isSet={status.accessTokenSet} value={accessToken} onChange={setAccessToken} />
    </SectionCard>
  );
}

function EmailForm({ status }: { status: IntegrationStatus["email"] }) {
  const { pending, save } = useSave("email");
  const [fromEmail, setFromEmail] = useState(status.fromEmail);
  const [resendApiKey, setResendApiKey] = useState("");
  return (
    <SectionCard
      title="Email (Resend)"
      desc="Transactional email for alerts, credentials and reports (FR-SMTP-1)."
      configured={status.configured}
      pending={pending}
      onSave={() => save({ "email.fromEmail": fromEmail, "email.resendApiKey": resendApiKey })}
    >
      <div className="grid gap-1.5">
        <Label>From email</Label>
        <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="LMS <noreply@yourdomain.com>" autoComplete="off" />
      </div>
      <SecretField label="Resend API key" isSet={status.resendApiKeySet} value={resendApiKey} onChange={setResendApiKey} />
    </SectionCard>
  );
}

function SmsForm({ status }: { status: IntegrationStatus["sms"] }) {
  const { pending, save } = useSave("sms");
  const [twilioSid, setTwilioSid] = useState(status.twilioSid);
  const [twilioFrom, setTwilioFrom] = useState(status.twilioFrom);
  const [twilioToken, setTwilioToken] = useState("");
  return (
    <SectionCard
      title="SMS (Twilio)"
      desc="Fallback SMS channel for parent alerts."
      configured={status.configured}
      pending={pending}
      onSave={() => save({ "sms.twilioSid": twilioSid, "sms.twilioFrom": twilioFrom, "sms.twilioToken": twilioToken })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Account SID</Label>
          <Input value={twilioSid} onChange={(e) => setTwilioSid(e.target.value)} autoComplete="off" />
        </div>
        <div className="grid gap-1.5">
          <Label>From number</Label>
          <Input value={twilioFrom} onChange={(e) => setTwilioFrom(e.target.value)} placeholder="+1..." autoComplete="off" />
        </div>
      </div>
      <SecretField label="Auth Token" isSet={status.twilioTokenSet} value={twilioToken} onChange={setTwilioToken} />
    </SectionCard>
  );
}
