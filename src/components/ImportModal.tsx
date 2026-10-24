import { useMemo, useState } from "react";
import type { Course } from "../types";
import { SAMPLE_CSV, parseCsv } from "../lib/csv";
import { Modal } from "./Modal";

export function ImportModal({ open, onClose, onImport }: { open: boolean; onClose: () => void; onImport: (courses: Course[]) => void }) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseCsv(text), [text]);
  const valid = parsed.rows.flatMap((row) => (row.course ? [row.course] : []));

  if (!open) return null;

  return (
    <Modal title="Import courses from CSV" onClose={onClose} wide testId="import-modal">
      <p className="text-sm text-slate-600">
        Paste CSV or TSV from Sheets. Headers such as Course Name, Start Date, End Date, Day(s), Time, Duration, Subject, Product Type, and Rate are detected, including close names like Class Name or Rate ($/hr). Imported rows are added to the roster.
      </p>
      <textarea
        className="mt-3 h-36 w-full rounded-md border border-slate-300 p-2 font-mono text-xs"
        value={text}
        placeholder="Paste rows here"
        data-testid="import-text"
        onChange={(event) => setText(event.target.value)}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium" data-testid="import-sample" onClick={() => setText(SAMPLE_CSV)}>
          Load Sample CSV
        </button>
        <button
          type="button"
          className="rounded-md bg-indigo-700 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          disabled={valid.length === 0}
          data-testid="import-submit"
          onClick={() => onImport(valid)}
        >
          Import {valid.length} Course{valid.length === 1 ? "" : "s"}
        </button>
      </div>
      {text.trim() ? (
        <div className="mt-3 overflow-x-auto">
          <p className="mb-1 text-xs text-slate-500">
            Detected {parsed.delimiter === "\t" ? "tab-separated" : "comma-separated"} text. {valid.length} ready, {parsed.rows.length - valid.length} need a fix.
          </p>
          <table className="min-w-full border-collapse text-left text-xs" data-testid="import-preview">
            <thead className="text-slate-500">
              <tr>
                {["Line", "Course", "Dates", "Days", "Time", "Subject", "Product", "Rate", "Check"].map((heading) => (
                  <th key={heading} className="border-b border-slate-200 px-2 py-1 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.rows.map((row) => (
                <tr key={row.line} className={row.error ? "bg-amber-50 text-amber-950" : "text-slate-700"}>
                  <td className="px-2 py-1">{row.line}</td>
                  <td className="px-2 py-1">{row.preview.name || "—"}</td>
                  <td className="px-2 py-1 whitespace-nowrap">
                    {row.preview.startDate} – {row.preview.endDate}
                  </td>
                  <td className="px-2 py-1">{row.preview.days}</td>
                  <td className="px-2 py-1">{row.preview.time}</td>
                  <td className="px-2 py-1">{row.preview.subject}</td>
                  <td className="px-2 py-1">{row.preview.productType}</td>
                  <td className="px-2 py-1">{row.preview.rate}</td>
                  <td className="px-2 py-1">{row.error ?? "Ready"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">The preview appears after you paste rows or load the sample.</p>
      )}
    </Modal>
  );
}
