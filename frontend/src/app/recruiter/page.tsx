/**
 * Recruiter batch-upload dashboard.
 * Owner: Person 1 (M.1)
 *
 * Responsibilities:
 *  - Allow a recruiter to upload a ZIP archive (≤ 50 MB) + structured job rubric.
 *  - POST to /api/jobs/upload → receive batch_id + status_url.
 *  - Show real-time progress via <StatusPoller> beside the upload form.
 *  - Link to /recruiter/leaderboard once processing is complete.
 */
"use client";

import { UploadForm } from "@/components/UploadForm";
import { StatusPoller } from "@/components/StatusPoller";
import { LastLoginBanner } from "@/components/LastLoginBanner";
import { useEffect, useState } from "react";
import { jobsApi, type JobSummary } from "@/lib/api";
import Link from "next/link";

export default function RecruiterPage() {
  const [batchId, setBatchId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      const list = await jobsApi.listJobs();
      if (Array.isArray(list) && list.length > 0) {
        setJobs(list);
        return;
      }
    } catch {
      // ignore
    }
    // Fallback to local storage if API is offline or cold
    try {
      const stored = localStorage.getItem("rs_recruiter_batches");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setJobs(parsed);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void fetchJobs();
  }, []);

  function handleUploadSuccess(id: string) {
    setBatchId(id);
    // Persist to local storage immediately
    try {
      const stored = localStorage.getItem("rs_recruiter_batches");
      const list = stored ? JSON.parse(stored) : [];
      const newEntry: JobSummary = {
        batch_id: id,
        created_at: new Date().toISOString(),
        status: "processing",
        total_files: 1,
        candidate_count: 0,
        title: "Active Job Batch",
        upload_filename: "uploaded",
      };
      const updated = [newEntry, ...list.filter((j: JobSummary) => j.batch_id !== id)].slice(0, 15);
      localStorage.setItem("rs_recruiter_batches", JSON.stringify(updated));
      setJobs(updated);
    } catch {
      // ignore
    }
    setTimeout(() => void fetchJobs(), 3000);
  }

  function copyBatchId(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function copyCandidateLink(id: string) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${origin}/candidate?job_id=${encodeURIComponent(id)}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  }

  return (
    <main className="shell">
      <LastLoginBanner />
      <header className="hero">
        <p className="eyebrow">Recruiter workspace</p>
        <h1>Evaluate a resume batch.</h1>
        <p>Upload a ZIP of PDF resumes and a structured job rubric. The dashboard will show live progress and ranked outcomes.</p>
      </header>

      <div className={`split-layout${batchId ? " split-layout--has-result" : ""}`}>
        <div className="split-layout__upload">
          <UploadForm role="recruiter" onSuccess={handleUploadSuccess} />
        </div>
        {batchId && (
          <div className="split-layout__result">
            <StatusPoller batchId={batchId} />
          </div>
        )}
      </div>

      {jobs.length > 0 && (
        <section style={{ marginTop: "44px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Job Management</p>
              <h2 style={{ margin: "4px 0 0", fontSize: "1.25rem" }}>Your Job Batches & Postings</h2>
            </div>
            <p className="field-help" style={{ margin: 0 }}>
              Leave and return anytime — your batches and incoming candidate submissions remain available.
            </p>
          </div>

          <div className="recruiter-jobs-grid">
            {jobs.map((job) => (
              <div key={job.batch_id} className="recruiter-job-card">
                <div className="job-card__info">
                  <div className="job-card__header">
                    <h3 className="job-card__title">{job.title || "Job Rubric Batch"}</h3>
                    <span className="status-chip">{job.status}</span>
                  </div>
                  <div className="job-card__meta">
                    <span>{job.candidate_count > 0 ? `${job.candidate_count} candidates evaluated` : `${job.total_files} file(s)`}</span>
                    {job.created_at && <span>Created: {new Date(job.created_at).toLocaleDateString()}</span>}
                    <span className="job-card__batch-id">ID: <code>{job.batch_id.slice(0, 8)}…</code></span>
                  </div>
                </div>

                <div className="job-card__actions">
                  <button
                    type="button"
                    className="ghost job-card__btn-copy"
                    onClick={() => copyBatchId(job.batch_id)}
                    title="Copy raw Batch ID"
                  >
                    {copiedId === job.batch_id ? "Copied" : "Copy Batch ID"}
                  </button>
                  <button
                    type="button"
                    className="ghost job-card__btn-copy"
                    onClick={() => copyCandidateLink(job.batch_id)}
                    title="Copy direct application link with pre-filled batch ID for candidates"
                  >
                    {copiedLink === job.batch_id ? "Link Copied" : "Copy Candidate Link"}
                  </button>
                  <Link
                    href={`/recruiter/leaderboard?batch_id=${job.batch_id}`}
                    className="primary job-card__btn-cta"
                  >
                    <span>View Leaderboard</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
