"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ParsedRow = Record<string, string>;

const KAYAN_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "notes", label: "Notes" },
  { key: "how_we_met", label: "How we met" },
  { key: "category", label: "Category" },
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter / X" },
  { key: "linkedin", label: "LinkedIn" },
] as const;

type KayanFieldKey = (typeof KAYAN_FIELDS)[number]["key"];

function guessMapping(headers: string[]): Record<string, KayanFieldKey | ""> {
  const mapping: Record<string, KayanFieldKey | ""> = {};
  for (const h of headers) {
    const lower = h.toLowerCase().trim();
    if (lower.includes("name")) mapping[h] = "name";
    else if (lower.includes("phone") || lower.includes("mobile") || lower.includes("tel")) mapping[h] = "phone";
    else if (lower.includes("email") || lower.includes("e-mail")) mapping[h] = "email";
    else if (lower.includes("note")) mapping[h] = "notes";
    else if (lower.includes("met") || lower.includes("source") || lower.includes("where")) mapping[h] = "how_we_met";
    else if (lower.includes("categor") || lower.includes("group") || lower.includes("type")) mapping[h] = "category";
    else if (lower.includes("instagram") || lower === "ig") mapping[h] = "instagram";
    else if (lower.includes("twitter") || lower === "x") mapping[h] = "twitter";
    else if (lower.includes("linkedin")) mapping[h] = "linkedin";
    else mapping[h] = "";
  }
  return mapping;
}

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, KayanFieldKey | "">>({});
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<{ imported: number; skipped: number } | null>(null);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const hs = result.meta.fields ?? [];
        setHeaders(hs);
        setRows(result.data as ParsedRow[]);
        setMapping(guessMapping(hs));
        setDone(null);
      },
      error: () => toast.error("Failed to parse CSV"),
    });
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  async function handleImport() {
    const nameCol = Object.entries(mapping).find(([, v]) => v === "name")?.[0];
    if (!nameCol) {
      toast.error("Please map a column to Name");
      return;
    }

    setImporting(true);
    const supabase = createClient();

    // Fetch existing contact names to skip duplicates
    const { data: existingContacts } = await supabase.from("contacts").select("name");
    const existingNames = new Set(
      (existingContacts ?? []).map((c) => c.name.trim().toLowerCase())
    );

    const toInsert: Record<string, string | boolean>[] = [];
    let skipped = 0;

    for (const row of rows) {
      const name = row[nameCol]?.trim();
      if (!name) { skipped++; continue; }
      if (existingNames.has(name.toLowerCase())) { skipped++; continue; }

      const contact: Record<string, string | boolean> = { name, archived: false };
      for (const [csvCol, kayanField] of Object.entries(mapping)) {
        if (!kayanField || kayanField === "name") continue;
        const val = row[csvCol]?.trim();
        if (val) contact[kayanField] = val;
      }
      toInsert.push(contact);
    }

    if (toInsert.length === 0) {
      toast.info(skipped > 0 ? `All ${skipped} rows already exist or have no name` : "Nothing to import");
      setImporting(false);
      return;
    }

    // Batch insert in chunks of 50
    const CHUNK = 50;
    let totalImported = 0;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      const { error } = await supabase.from("contacts").insert(chunk);
      if (error) {
        toast.error(`Import error: ${error.message}`);
        setImporting(false);
        return;
      }
      totalImported += chunk.length;
    }

    setDone({ imported: totalImported, skipped });
    toast.success(`Imported ${totalImported} contact${totalImported !== 1 ? "s" : ""}`);
    setImporting(false);
  }

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold text-lg">Import contacts</h1>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {done ? (
          /* Success state */
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto" />
            <p className="font-semibold text-green-400 text-lg">Import complete!</p>
            <p className="text-sm text-muted-foreground">
              {done.imported} contact{done.imported !== 1 ? "s" : ""} imported
              {done.skipped > 0 && `, ${done.skipped} skipped (already exist or no name)`}
            </p>
            <Link
              href="/contacts"
              className="inline-block mt-2 rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground"
            >
              View contacts
            </Link>
          </div>
        ) : rows.length === 0 ? (
          /* Upload zone */
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors",
              dragging
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold mb-1">Drop your CSV here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <>
            {/* Column mapping */}
            <section>
              <h2 className="font-semibold mb-1">Map columns</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {rows.length} row{rows.length !== 1 ? "s" : ""} found — assign each column to a Kayan field.
              </p>
              <div className="space-y-2">
                {headers.map((h) => (
                  <div key={h} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                    <span className="flex-1 truncate text-sm font-medium">{h}</span>
                    <select
                      value={mapping[h] ?? ""}
                      onChange={(e) =>
                        setMapping((prev) => ({ ...prev, [h]: e.target.value as KayanFieldKey | "" }))
                      }
                      className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Skip</option>
                      {KAYAN_FIELDS.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}{"required" in f && f.required ? " *" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {!Object.values(mapping).includes("name") && (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400 shrink-0" />
                  <p className="text-xs text-yellow-400">Map a column to Name to continue</p>
                </div>
              )}
            </section>

            {/* Preview */}
            <section>
              <h2 className="font-semibold mb-3">Preview (first 5 rows)</h2>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {headers.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                          {mapping[h] ? (
                            <span className="text-foreground">{KAYAN_FIELDS.find(f => f.key === mapping[h])?.label ?? mapping[h]}</span>
                          ) : (
                            <span className="line-through opacity-50">{h}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        {headers.map((h) => (
                          <td key={h} className={cn("px-3 py-2 max-w-[140px] truncate", !mapping[h] && "opacity-40")}>
                            {row[h] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => { setRows([]); setHeaders([]); setMapping({}); }}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-medium hover:bg-muted/50"
              >
                Change file
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !Object.values(mapping).includes("name")}
                className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {importing ? "Importing…" : `Import ${rows.length} contacts`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
