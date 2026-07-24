// Client-only text extraction for the bulk-import preview (FR-AD-29/31).
// Heavy parsers are dynamically imported so they never bloat the main bundle.

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE = /(\+?\d[\d\s-]{7,}\d)/;

// Lines that are just a column label, not data.
const HEADER_LABEL = /^(name|full ?name|student(\s*name)?|e-?mail|email ?id|phone|mobile|contact|no\.?|sr\.?|s\.?no\.?|parent|guardian)$/i;

// Turn loosely-structured extracted text into import rows.
//
// Two shapes have to work:
//  1. One student per line — "Kabir Nair  kabir@x.com  +9190…" (typical PDF).
//  2. One FIELD per line — Word tables come out of mammoth with every cell on
//     its own line, so a student is spread across 2–3 consecutive lines.
//
// So we build records incrementally instead of parsing line-by-line: an email
// anchors a record, a bare phone attaches to it, and plain text becomes the
// name. Hitting a second email (or new plain text after one) flushes the
// record. The preview screen lets the admin fix anything this gets wrong.
export function looseTextToCsv(text: string): string {
  const header = "name,email,parentName,parentPhone,parentEmail";
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\t/g, " ").replace(/\s{2,}/g, " ").trim())
    .filter((l) => l.length > 0 && !HEADER_LABEL.test(l));

  type Rec = { name: string; email: string; phone: string };
  const records: Rec[] = [];
  let cur: Rec = { name: "", email: "", phone: "" };
  const isEmpty = (r: Rec) => !r.name && !r.email && !r.phone;
  const flush = () => {
    if (r_hasData(cur)) records.push(cur);
    cur = { name: "", email: "", phone: "" };
  };
  const r_hasData = (r: Rec) => Boolean(r.email || (r.name && r.phone));

  for (const line of lines) {
    const email = line.match(EMAIL)?.[0] ?? "";
    const phoneRaw = line.match(PHONE)?.[0] ?? "";
    const phone = phoneRaw.replace(/[\s-]/g, "");

    if (email) {
      // A second email means the previous record is complete.
      if (cur.email) flush();
      let rest = line.replace(email, "");
      if (phoneRaw) rest = rest.replace(phoneRaw, "");
      rest = rest.replace(/[,;|]+/g, " ").replace(/\s{2,}/g, " ").trim();
      cur.email = email;
      if (rest) cur.name = rest; // same-line name wins; otherwise keep the one above
      if (phone) cur.phone = phone;
      continue;
    }

    // A line that is only a phone number attaches to the record in progress.
    if (phoneRaw && !line.replace(phoneRaw, "").replace(/[,;|\s]+/g, "")) {
      cur.phone = phone;
      continue;
    }

    // Plain text = a name. If we already have an email, this starts a new record.
    const name = line.replace(/[,;|]+/g, " ").replace(/\s{2,}/g, " ").trim();
    if (!name) continue;
    if (cur.email) flush();
    else if (!isEmpty(cur) && cur.phone) flush(); // name+phone pair already closed
    cur.name = name;
    if (phone) cur.phone = phone;
  }
  flush();

  const cell = (v: string) => v.replaceAll(",", " ");
  const rows = records.map((r) => [cell(r.name), cell(r.email), "", cell(r.phone), ""].join(","));
  return [header, ...rows].join("\n");
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    const mammoth = await import("mammoth/mammoth.browser");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return value;
  }
  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    // Bundled worker (Turbopack resolves new URL(..., import.meta.url)).
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let out = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      // Group text items into lines by their y position.
      const byLine = new Map<number, string[]>();
      for (const item of content.items as { str: string; transform: number[] }[]) {
        const y = Math.round(item.transform[5]);
        if (!byLine.has(y)) byLine.set(y, []);
        byLine.get(y)!.push(item.str);
      }
      const lines = [...byLine.entries()].sort((a, b) => b[0] - a[0]).map(([, parts]) => parts.join(" "));
      out += lines.join("\n") + "\n";
    }
    return out;
  }
  throw new Error("Unsupported file type");
}
