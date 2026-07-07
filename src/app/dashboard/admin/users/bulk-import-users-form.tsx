"use client";

import { FileSpreadsheet, Loader2 } from "lucide-react";
import { useActionState } from "react";

import { bulkImportUsersAction } from "@/app/dashboard/admin/users/actions";
import type { BulkImportRowResult, BulkImportState } from "@/app/dashboard/admin/users/actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function RowStatus({ row }: { row: BulkImportRowResult }) {
  if (row.status === "created") {
    return <Badge tone="green">Created</Badge>;
  }

  return <Badge tone="amber">Failed</Badge>;
}

const initialState: BulkImportState = {
  results: [],
  createdCount: 0,
  errorCount: 0,
  truncatedAt: null
};

export function BulkImportUsersForm() {
  const [state, formAction, isPending] = useActionState(bulkImportUsersAction, initialState);

  return (
    <div className="grid gap-4">
      <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="grid gap-2 text-sm font-medium text-text-secondary" htmlFor="csvFile">
          CSV file
          <input
            id="csvFile"
            name="csvFile"
            type="file"
            accept=".csv,text/csv"
            required
            className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary file:mr-3 file:rounded-lg file:border-0 file:bg-secondary-light file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-secondary-hover"
          />
        </label>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <FileSpreadsheet aria-hidden size={18} />}
          {isPending ? "Importing…" : "Import users"}
        </Button>
      </form>

      <p className="text-xs text-text-secondary">
        Columns: <span className="font-mono">fullName, email, role, password</span> (role and password are
        optional — role defaults to student, and a temporary password is generated automatically when left
        blank). Up to 200 rows per file.{" "}
        <a className="font-semibold text-primary-hover" href="/templates/bulk-users-template.csv" download>
          Download template
        </a>
      </p>

      {state.formError ? <Alert variant="error">{state.formError}</Alert> : null}

      {state.results.length > 0 ? (
        <div className="grid gap-3">
          <Alert variant={state.errorCount > 0 ? "error" : "success"} className="font-semibold">
            {state.createdCount} user{state.createdCount === 1 ? "" : "s"} created
            {state.errorCount > 0 ? `, ${state.errorCount} failed` : ""}.
            {state.truncatedAt ? ` Only the first ${state.truncatedAt} rows were processed — split larger files.` : ""}
          </Alert>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border bg-background text-xs uppercase tracking-wide text-text-secondary">
                <tr>
                  <th className="px-4 py-2">Line</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Institution ID / temp password</th>
                  <th className="px-4 py-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.results.map((row) => (
                  <tr key={`${row.line}-${row.email}`}>
                    <td className="px-4 py-2 font-mono text-text-secondary">{row.line}</td>
                    <td className="px-4 py-2 text-text-primary">{row.email}</td>
                    <td className="px-4 py-2">
                      <RowStatus row={row} />
                    </td>
                    <td className="px-4 py-2 font-mono text-text-primary">
                      {row.institutionUserId}
                      {row.tempPassword ? <span className="ml-2 text-text-secondary">/ {row.tempPassword}</span> : null}
                    </td>
                    <td className="px-4 py-2 text-text-secondary">{row.message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
