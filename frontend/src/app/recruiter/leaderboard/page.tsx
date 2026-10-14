/**
 * Recruiter leaderboard — sortable ranked results view.
 * Owner: Person 1 (M.10)
 *
 * Responsibilities:
 *  - Read batch_id from search params.
 *  - Fetch GET /api/jobs/{batch_id}/results.
 *  - Render <Leaderboard> component with sort/filter controls.
 *  - Show detail modal on row click (score breakdown + skill gaps).
 *  - Separate section for pre-filtered candidates.
 */
"use client";

import { Leaderboard } from "@/components/Leaderboard";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { useState } from "react";

function LeaderboardContent() {
  const params = useSearchParams();
  const batchId = params.get("batch_id") ?? "";
  const [copied, setCopied] = useState(false);

  function copyBatchId() {
    if (!batchId) return;
    navigator.clipboard.writeText(batchId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="shell">
      <div className="leaderboard-page-header">
        <h1 style={{ margin: 0 }}>Candidate Leaderboard</h1>
        {batchId && (
          <div className="batch-id-badge">
            <span className="batch-id-label">Batch ID:</span>
            <code className="batch-id-code">{batchId}</code>
            <button
              type="button"
              className="ghost batch-id-copy-btn"
              onClick={copyBatchId}
              aria-label="Copy batch ID"
            >
              {copied ? "Copied" : "Copy ID"}
            </button>
          </div>
        )}
      </div>
      {batchId ? <Leaderboard batchId={batchId} /> : <p role="alert">A batch ID is required.</p>}
    </main>
  );
}

export default function LeaderboardPage() {
  return <Suspense fallback={<main className="shell"><p>Loading leaderboard…</p></main>}><LeaderboardContent /></Suspense>;
}
