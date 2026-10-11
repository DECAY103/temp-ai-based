/**
 * StatusPoller — polls the batch status endpoint until completion.
 * Owner: Person 1 (M.1)
 *
 * Props:
 *  - batchId: UUID string returned from the upload endpoint.
 *
 * Behaviour:
 *  - Calls GET /api/jobs/{batchId}/status on an interval (e.g. every 3 s).
 *  - Displays a progress bar using `progress_percentage`.
 *  - Stops polling when status is "completed" or "failed".
 *  - On completion, shows a link to the leaderboard (recruiter) or result summary (candidate).
 *
 * TODO (Person 1 — M.1):
 *  - Implement polling interval with cleanup on unmount.
 *  - Show per-file counts (total / processed / failed / pre_filtered).
 *  - Handle "failed" status gracefully with error message.
 */
"use client";

import { useEffect, useState } from "react";
import { jobsApi, type BatchStatus } from "@/lib/api";
import Link from "next/link";

interface StatusPollerProps {
  batchId: string;
  role?: "candidate" | "recruiter";
}

export function StatusPoller({ batchId, role = "recruiter" }: StatusPollerProps) {
  const [status, setStatus] = useState<BatchStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const poll = async () => {
      try {
        const data = await jobsApi.getStatus(batchId);
        if (!active) return;
        setStatus(data);
        if (data.status === "completed" || data.status === "failed") clearInterval(timer);
      } catch (err) { if (active) setError(err instanceof Error ? err.message : "Could not fetch status."); }
    };
    void poll();
    timer = setInterval(poll, 2500);
    return () => { active = false; clearInterval(timer); };
  }, [batchId]);

  if (error) return <p className="message error-message" role="alert">{error}</p>;
  if (!status) return <section className="status-card"><p className="eyebrow">Processing</p><h2>Preparing your files…</h2><p className="field-help">This page updates automatically.</p></section>;


  function copyBatchId() {
    navigator.clipboard.writeText(batchId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="status-card">
      <div className="status-heading"><div><p className="eyebrow">Batch processing</p><h2>{status.status === "completed" ? "Processing complete" : "Processing resumes"}</h2></div><span className="status-chip">{status.status}</span></div>

      <div style={{ background: "var(--surface-soft, #f8fafc)", padding: "10px 14px", borderRadius: "8px", margin: "14px 0", border: "1px solid var(--line, #e2e8f0)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted, #64748b)", fontWeight: 700, display: "block" }}>
            {role === "candidate" ? "Candidate Submission ID" : "Recruiter Batch ID"}
          </span>
          <code style={{ fontSize: "0.82rem", color: "var(--text, #0f172a)", wordBreak: "break-all" }}>{batchId}</code>
        </div>
        <button
          type="button"
          className="ghost"
          style={{ fontSize: "0.78rem", padding: "5px 10px", whiteSpace: "nowrap", flexShrink: 0 }}
          onClick={copyBatchId}
        >
          {copied ? "Copied! ✓" : "Copy ID"}
        </button>
      </div>

      <p className="field-help">{status.progress_percentage.toFixed(0)}% complete</p>
      <div className="progress"><span style={{ width: `${status.progress_percentage}%` }} /></div>
      <div className="status-meta">
        <span>{status.processed_files} of {status.total_files} processed</span>
        {status.failed_files > 0 && <span style={{ color: "#dc2626", fontWeight: 600 }}>{status.failed_files} failed</span>}
        {status.pre_filtered_count > 0 && <span>{status.pre_filtered_count} pre-filtered</span>}
      </div>

      {status.failed_files > 0 && (
        <div style={{ marginTop: "14px", padding: "12px", background: "rgba(239, 68, 68, 0.07)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#dc2626" }}>
              ⚠️ {status.failed_files} résumé(s) failed evaluation
            </span>
          </div>
          {status.error_logs && status.error_logs.length > 0 ? (
            <div>
              <span style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--muted, #64748b)", display: "block", marginBottom: "4px" }}>
                Failure logs & details:
              </span>
              <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "0.78rem", color: "#b91c1c", wordBreak: "break-word" }}>
                {status.error_logs.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#b91c1c" }}>
              Evaluation failed during text processing or AI scoring. View ranked results to inspect individual candidate logs.
            </p>
          )}
        </div>
      )}

      {status.status === "failed" && <p className="message error-message status-complete">The batch could not complete. Check the selected files and try again.</p>}
      {status.status === "completed" && <div className="status-complete">{role === "recruiter" ? <Link className="primary" href={`/recruiter/leaderboard?batch_id=${batchId}`}>View ranked results</Link> : <p className="field-help">Your résumé has completed processing. The recruiter will review the result.</p>}</div>}
    </div>
  );
}
