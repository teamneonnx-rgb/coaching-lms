// Client-only text extraction for the bulk-import preview (FR-AD-29/31).
// Heavy parsers are dynamically imported so they never bloat the main bundle.

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE = /(\+?\d[\d\s-]{7,}\d)/;

// Turn loosely-structured extracted text into import rows. Each non-empty line
// is scanned for an email + phone; the remainder becomes the name. The preview
// screen lets the admin correct anything the heuristic got wrong.
export function looseTextToCsv(text: string): string {
  const header = "name,email,parentName,parentPhone,parentEmail";
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\t/g, " ").trim())
    .filter((l) => l.length > 0);

  const rows: string[] = [];
  for (const line of lines) {
    const email = line.match(EMAIL)?.[0] ?? "";
    const phone = line.match(PHONE)?.[0]?.replace(/\s+/g, "") ?? "";
    // Skip obvious header/label lines.
    if (/^(name|student|email|phone|parent)\b/i.test(line) && !email) continue;
    let name = line;
    if (email) name = name.replace(email, "");
    if (phone) name = name.replace(line.match(PHONE)?.[0] ?? "", "");
    name = name.replace(/[,;|]+/g, " ").replace(/\s{2,}/g, " ").trim();
    if (!email && !name) continue;
    const cell = (v: string) => v.replaceAll(",", " ");
    rows.push([cell(name), cell(email), "", cell(phone), ""].join(","));
  }
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
