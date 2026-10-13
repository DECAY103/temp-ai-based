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
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <h1 style={{ margin: 0 }}>Candidate Leaderboard</h1>
        {batchId && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", background: "var(--surface-soft, #FAFAFA)", border: "1px solid var(--color-grey-1, #C6C6C6)", borderRadius: "8px", padding: "7px 14px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--muted, #606060)", fontWeight: 650 }}>Batch ID:</span>
            <code style={{ fontSize: "0.88rem", color: "var(--ink, #150202)", fontWeight: 600 }}>{batchId}</code>
            <button
              type="button"
              className="ghost"
              style={{ fontSize: "0.82rem", padding: "4px 10px", marginLeft: "4px", borderRadius: "6px", border: "1px solid var(--color-grey-1, #C6C6C6)", cursor: "pointer", fontWeight: 600 }}
              onClick={copyBatchId}
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
