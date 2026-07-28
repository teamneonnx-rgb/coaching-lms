"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import type { BlockType } from "@/lib/pages/types";
import { getBlockDef } from "@/lib/pages/registry";

// Editor/preview rendering for LMS data widgets, using representative SAMPLE
// data. At runtime (Phase 4) a server component swaps in real, role-scoped data.
// Unwired placeholders render a labelled card.

const str = (v: unknown, d = "") => (typeof v === "string" && v ? v : d);
const num = (v: unknown, d = 0) => (typeof v === "number" ? v : typeof v === "string" && v !== "" ? Number(v) : d);

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #f1f5f9" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{title}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b", background: "#f1f5f9", borderRadius: 999, padding: "2px 8px" }}>SAMPLE</span>
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}

const STAT: Record<string, { label: string; value: string }> = {
  students: { label: "Students", value: "128" },
  teachers: { label: "Teachers", value: "12" },
  batches: { label: "Batches", value: "9" },
  courses: { label: "Courses", value: "24" },
};

const SERIES = [
  { label: "Feb", count: 6 }, { label: "Mar", count: 9 }, { label: "Apr", count: 7 },
  { label: "May", count: 12 }, { label: "Jun", count: 15 }, { label: "Jul", count: 21 },
];

export function WidgetPreview({ type, props }: { type: BlockType; props: Record<string, unknown> }) {
  const def = getBlockDef(type);

  if (type === "statCard") {
    const metric = str(props.metric, "students");
    const s = STAT[metric] ?? STAT.students;
    return (
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: 16 }}>
        <p style={{ fontSize: 28, fontWeight: 600, color: "#0f172a", margin: 0 }}>{s.value}</p>
        <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>{str(props.title, s.label)} · sample</p>
      </div>
    );
  }

  if (type === "studentTable") {
    const rows = [
      ["Aarav Sharma", "NEET 2026 Morning"], ["Diya Patel", "NEET 2026 Morning"],
      ["Kabir Verma", "JEE 2027"], ["Ishita Roy", "Foundation"],
    ].slice(0, Math.max(1, num(props.limit, 8)));
    return (
      <Shell title={str(props.title, "Students")}>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <tbody>
            {rows.map(([name, batch], i) => (
              <tr key={i} style={{ borderTop: i ? "1px solid #f1f5f9" : "none" }}>
                <td style={{ padding: "6px 0", fontWeight: 500, color: "#334155" }}>{name}</td>
                <td style={{ padding: "6px 0", textAlign: "right", color: "#64748b" }}>{batch}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Shell>
    );
  }

  if (type === "batchList") {
    const rows = [["NEET 2026 Morning", 32], ["JEE 2027", 28], ["Foundation", 41]].slice(0, Math.max(1, num(props.limit, 6)));
    return (
      <Shell title={str(props.title, "Batches")}>
        {rows.map(([name, count], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: i ? "1px solid #f1f5f9" : "none", fontSize: 13 }}>
            <span style={{ fontWeight: 500, color: "#334155" }}>{name}</span>
            <span style={{ color: "#64748b" }}>{count} students</span>
          </div>
        ))}
      </Shell>
    );
  }

  if (type === "attendanceWidget") {
    return (
      <Shell title={str(props.title, "Attendance")}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 30, fontWeight: 600, color: "#16a34a" }}>92%</span>
          <span style={{ fontSize: 13, color: "#64748b" }}>present this month</span>
        </div>
      </Shell>
    );
  }

  if (type === "chart") {
    return (
      <Shell title={str(props.title, "Enrollment growth")}>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={SERIES} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Shell>
    );
  }

  // Unwired placeholder (long-tail ERP widgets).
  return (
    <div style={{ border: "2px dashed #cbd5e1", borderRadius: 12, padding: 18, textAlign: "center", background: "#f8fafc" }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#475569", margin: 0 }}>{str(props.title, def?.label ?? "Widget")}</p>
      <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>Placeholder — not yet wired to live data</p>
    </div>
  );
}
