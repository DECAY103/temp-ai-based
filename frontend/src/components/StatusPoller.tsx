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

import { useEffect, useRef, useState } from "react";
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
  const startTimeRef = useRef<number>(Date.now());
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const loggedStagesRef = useRef<Set<string>>(new Set());

  // Continuous timer while batch is running
  useEffect(() => {
    const start = startTimeRef.current;
    const interval = setInterval(() => {
      setElapsedSec(Math.round(((Date.now() - start) / 1000) * 10) / 10);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | undefined;

    const poll = async () => {
      try {
        const data = await jobsApi.getStatus(batchId);
        if (!active) return;
        setStatus(data);

        const currentElapsed = Math.round(((Date.now() - startTimeRef.current) / 1000) * 10) / 10;

        // Independently log time spent on each part of the process
        if (data.ingestion_time_sec != null && !loggedStagesRef.current.has("ingestion")) {
          loggedStagesRef.current.add("ingestion");
          console.log(`[DATA INGESTION COMPLETED] Batch ${batchId}: Time spent on Data Ingestion = ${data.ingestion_time_sec.toFixed(3)}s`);
        }
        if (data.extraction_time_sec != null && !loggedStagesRef.current.has("extraction")) {
          loggedStagesRef.current.add("extraction");
          console.log(`[DATA EXTRACTION COMPLETED] Batch ${batchId}: Time spent on Data Extraction = ${data.extraction_time_sec.toFixed(3)}s`);
        }
        if (data.processing_time_sec != null && !loggedStagesRef.current.has("processing")) {
          loggedStagesRef.current.add("processing");
          console.log(`[DATA PROCESSING COMPLETED] Batch ${batchId}: Time spent on Data Processing = ${data.processing_time_sec.toFixed(3)}s`);
        }

        // Comprehensive independent breakdown print
        console.log(
          `[PIPELINE STATUS] Batch ${batchId} (${data.status.toUpperCase()})\n` +
          `  - Time spent on Data Ingestion : ${data.ingestion_time_sec != null ? data.ingestion_time_sec.toFixed(3) + 's' : (data.status === 'queued' ? currentElapsed.toFixed(1) + 's (active)' : 'Pending')}\n` +
          `  - Time spent on Data Extraction: ${data.extraction_time_sec != null ? data.extraction_time_sec.toFixed(3) + 's' : (data.status === 'extracting' ? 'Active' : 'Pending')}\n` +
          `  - Time spent on Data Processing: ${data.processing_time_sec != null ? data.processing_time_sec.toFixed(3) + 's' : (data.status === 'scoring' ? 'Active' : 'Pending')}\n` +
          `  - Total turnaround time        : ${(data.total_time_sec ?? currentElapsed).toFixed(3)}s`
        );

        if (data.status === "completed") {
          console.log(
            `================================================================================\n` +
            `[PIPELINE COMPLETE] Batch ${batchId} - Time spent on each part of the process:\n` +
            `  Time spent on Data Ingestion : ${data.ingestion_time_sec != null ? data.ingestion_time_sec.toFixed(3) + 's' : 'N/A'}\n` +
            `  Time spent on Data Extraction: ${data.extraction_time_sec != null ? data.extraction_time_sec.toFixed(3) + 's' : 'N/A'}\n` +
            `  Time spent on Data Processing: ${data.processing_time_sec != null ? data.processing_time_sec.toFixed(3) + 's' : 'N/A'}\n` +
            `  Total turnaround time        : ${(data.total_time_sec ?? currentElapsed).toFixed(3)}s\n` +
            `================================================================================`
          );
          if (timer) clearInterval(timer);
        } else if (data.status === "failed") {
          console.log(`[PIPELINE FAILED] Batch ${batchId} failed after ${currentElapsed.toFixed(3)}s`);
          if (timer) clearInterval(timer);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not fetch status.");
      }
    };

    void poll();
    timer = setInterval(poll, 2500);

    const handleVisibilityChange = () => {
      if (!active) return;
      if (document.hidden) {
        if (timer) clearInterval(timer);
      } else {
        void poll();
        if (timer) clearInterval(timer);
        timer = setInterval(poll, 2500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [batchId]);

  if (error) return <p className="message error-message" role="alert">{error}</p>;

  if (!status) {
    return (
      <section className="status-card" aria-busy="true">
        <div className="status-heading">
          <div>
            <p className="eyebrow">Processing</p>
            <h2>Preparing your files…</h2>
          </div>
          <span className="status-chip">Queued</span>
        </div>
        <p className="field-help">This page updates automatically.</p>

        <div className="status-timings-card">
          <div className="status-timings-header">
            <span style={{ fontSize: "0.8rem", fontWeight: 750, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary-purple)" }}>
              Process Breakdown and Time Spent
            </span>
            <span className="timing-badge">
              Total Elapsed: {elapsedSec.toFixed(1)}s
            </span>
          </div>
          <div className="status-timings-grid">
            <div className="status-timing-item">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="status-timing-label">Part 1: Data Ingestion</span>
                <span className="status-timing-status running">In Progress</span>
              </div>
              <span className="status-timing-value">
                Time spent: <span className="timing-pulsing">{elapsedSec.toFixed(1)}s</span>
              </span>
              <span className="status-timing-subtext">Validating file & payload</span>
            </div>

            <div className="status-timing-item">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="status-timing-label">Part 2: Data Extraction</span>
                <span className="status-timing-status pending">Waiting</span>
              </div>
              <span className="status-timing-value" style={{ color: "var(--muted)", fontWeight: 500, fontSize: "0.85rem" }}>
                Time spent: Pending
              </span>
              <span className="status-timing-subtext">Text extraction & sanitisation</span>
            </div>

            <div className="status-timing-item">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="status-timing-label">Part 3: Data Processing</span>
                <span className="status-timing-status pending">Waiting</span>
              </div>
              <span className="status-timing-value" style={{ color: "var(--muted)", fontWeight: 500, fontSize: "0.85rem" }}>
                Time spent: Pending
              </span>
              <span className="status-timing-subtext">AI evaluation & scoring</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  function copyBatchId() {
    navigator.clipboard.writeText(batchId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Independent time spent calculations for each part
  const ingestionTime = status.ingestion_time_sec;
  const extractionTime = status.extraction_time_sec;
  const processingTime = status.processing_time_sec;

  // Active spent duration for extraction (if currently extracting)
  const extractionActiveSpent = Math.max(0, elapsedSec - (ingestionTime || 0));
  // Active spent duration for processing (if currently scoring)
  const processingActiveSpent = Math.max(0, elapsedSec - (ingestionTime || 0) - (extractionTime || 0));

  const isIngestionDone = ingestionTime != null;
  const isExtractionDone = extractionTime != null && status.status !== "extracting";
  const isProcessingDone = processingTime != null && status.status === "completed";

  return (
    <div className="status-card">
      {/* Screen-reader live announcement for dynamic updates */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {status.status === "completed"
          ? "Processing complete. All resumes evaluated."
          : `Processing resumes. ${status.processed_files} of ${status.total_files} processed, ${status.progress_percentage.toFixed(0)}% complete.`}
      </div>

      <div className="status-heading">
        <div>
          <p className="eyebrow">Batch processing</p>
          <h2>{status.status === "completed" ? "Processing complete" : "Processing resumes"}</h2>
        </div>
        <span className="status-chip">{status.status}</span>
      </div>

      <div className="status-batch-box">
        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
          <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted, #4729A3)", fontWeight: 700, display: "block" }}>
            {role === "candidate" ? "Candidate Submission ID" : "Recruiter Batch ID"}
          </span>
          <code style={{ fontSize: "0.88rem", color: "var(--ink, #29136C)", wordBreak: "break-all", fontWeight: 600 }}>{batchId}</code>
        </div>
        <button
          type="button"
          className="ghost batch-copy-btn"
          onClick={copyBatchId}
          aria-label="Copy Batch ID to clipboard"
        >
          {copied ? "Copied" : "Copy ID"}
        </button>
      </div>

      <p className="field-help" style={{ fontSize: "0.9rem" }}>{status.progress_percentage.toFixed(0)}% complete</p>
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={Math.round(status.progress_percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Batch processing progress"
      >
        <span style={{ width: `${status.progress_percentage}%` }} />
      </div>
      <div className="status-meta" style={{ fontSize: "0.88rem" }}>
        <span>{status.processed_files} of {status.total_files} processed</span>
        {status.failed_files > 0 && <span style={{ color: "var(--color-coral-red, #29136C)", fontWeight: 650 }}>{status.failed_files} failed</span>}
        {status.pre_filtered_count > 0 && <span>{status.pre_filtered_count} pre-filtered</span>}
      </div>

      {/* Independent Timing Breakdown Card */}
      <div className="status-timings-card">
        <div className="status-timings-header">
          <span style={{ fontSize: "0.8rem", fontWeight: 750, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary-purple)" }}>
            Process Breakdown and Time Spent
          </span>
          <span className="timing-badge">
            {status.status === "completed"
              ? `Total Turnaround: ${(status.total_time_sec ?? elapsedSec).toFixed(2)}s`
              : `Total Elapsed: ${elapsedSec.toFixed(1)}s`}
          </span>
        </div>

        <div className="status-timings-grid">
          {/* Part 1: Data Ingestion */}
          <div className="status-timing-item">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="status-timing-label">Part 1: Data Ingestion</span>
              <span className={`status-timing-status ${isIngestionDone ? "completed" : status.status === "queued" ? "running" : "completed"}`}>
                {isIngestionDone ? "Completed" : status.status === "queued" ? "In Progress" : "Completed"}
              </span>
            </div>
            <span className="status-timing-value">
              {ingestionTime != null ? (
                <>Time spent: {ingestionTime.toFixed(3)}s</>
              ) : status.status === "queued" ? (
                <>Time spent: <span className="timing-pulsing">{elapsedSec.toFixed(1)}s</span></>
              ) : (
                <>Time spent: Done</>
              )}
            </span>
            <span className="status-timing-subtext">Validating file & payload</span>
          </div>

          {/* Part 2: Data Extraction */}
          <div className="status-timing-item">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="status-timing-label">Part 2: Data Extraction</span>
              <span className={`status-timing-status ${isExtractionDone ? "completed" : status.status === "extracting" ? "running" : "pending"}`}>
                {isExtractionDone ? "Completed" : status.status === "extracting" ? "In Progress" : "Pending"}
              </span>
            </div>
            <span className="status-timing-value">
              {extractionTime != null ? (
                <>Time spent: {extractionTime.toFixed(3)}s</>
              ) : status.status === "extracting" ? (
                <>Time spent: <span className="timing-pulsing">{extractionActiveSpent.toFixed(1)}s</span></>
              ) : (
                <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: "0.85rem" }}>Time spent: Pending</span>
              )}
            </span>
            <span className="status-timing-subtext">Text extraction & sanitisation</span>
          </div>

          {/* Part 3: Data Processing */}
          <div className="status-timing-item">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="status-timing-label">Part 3: Data Processing</span>
              <span className={`status-timing-status ${isProcessingDone ? "completed" : status.status === "scoring" ? "running" : "pending"}`}>
                {isProcessingDone ? "Completed" : status.status === "scoring" ? "In Progress" : "Pending"}
              </span>
            </div>
            <span className="status-timing-value">
              {processingTime != null ? (
                <>Time spent: {processingTime.toFixed(3)}s</>
              ) : status.status === "scoring" ? (
                <>Time spent: <span className="timing-pulsing">{processingActiveSpent.toFixed(1)}s</span></>
              ) : (
                <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: "0.85rem" }}>Time spent: Pending</span>
              )}
            </span>
            <span className="status-timing-subtext">AI evaluation & scoring</span>
          </div>
        </div>
      </div>

      {status.failed_files > 0 && (
        <div style={{ marginTop: "16px", padding: "16px 18px", background: "var(--bad-soft, #EEEBFA)", border: "1px solid var(--color-coral-red, #29136C)", borderRadius: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--color-coral-red, #29136C)" }}>
              {status.failed_files} candidate file(s) failed evaluation
            </span>
          </div>
          {status.error_logs && status.error_logs.length > 0 ? (
            <div>
              <span style={{ fontSize: "0.84rem", fontWeight: 650, color: "var(--muted, #4729A3)", display: "block", marginBottom: "6px" }}>
                Diagnostic logs:
              </span>
              <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "0.85rem", color: "var(--color-coral-red, #29136C)", wordBreak: "break-word" }}>
                {status.error_logs.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-coral-red, #29136C)" }}>
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

