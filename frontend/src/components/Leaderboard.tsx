/**
 * Leaderboard — sortable ranked candidate results table.
 * Owner: Person 1 (M.10)
 *
 * Props:
 *  - batchId: UUID — used to fetch GET /api/jobs/{batchId}/results.
 *
 * Responsibilities:
 *  - Fetch and display the full ranked list of candidates.
 *  - Allow sorting by overall_score, skill_match_score, work_experience_score.
 *  - Show a detail modal/panel on row click with:
 *      verdict_summary, matching_skills, missing_skills.
 *  - Separate section for pre_filtered candidates.
 *
 * TODO (Person 1 — M.10):
 *  - Implement fetch + sorting state.
 *  - Build detail modal component.
 *  - Add skill-gap visualisation (e.g. badge lists).
 *  - Add CSV export button.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { jobsApi, type CandidateResult } from "@/lib/api";

interface LeaderboardProps {
  batchId: string;
}

export function Leaderboard({ batchId }: LeaderboardProps) {
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CandidateResult | null>(null);
  const [sortBy, setSortBy] = useState<"overall_score" | "skill_match_score" | "work_experience_score">("overall_score");

  useEffect(() => {
    jobsApi.getResults(batchId).then(setResults).catch((err) => setError(err instanceof Error ? err.message : "Could not load results.")).finally(() => setLoading(false));
  }, [batchId]);

  useEffect(() => {
    if (!selected) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected]);

  const completed = useMemo(() => results.filter((r) => r.status === "completed").sort((a, b) => b[sortBy] - a[sortBy]), [results, sortBy]);
  const prefiltered = results.filter((r) => r.status === "pre_filtered");
  const failed = useMemo(() => results.filter((r) => r.status === "failed"), [results]);

  if (loading) return <p>Loading results…</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <section className="leaderboard" aria-labelledby="leaderboard-heading">
      <div className="leaderboard-toolbar">
        <div>
          <p className="eyebrow">Evaluation results</p>
          <h2 id="leaderboard-heading">Ranked candidates</h2>
        </div>
        <label className="sort-control">
          Sort by
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
            <option value="overall_score">Overall score</option>
            <option value="skill_match_score">Skill match</option>
            <option value="work_experience_score">Experience</option>
          </select>
        </label>
      </div>

      {completed.length === 0 ? (
        <p className="empty-state">No completed candidate evaluations are available yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Candidate evaluation leaderboard and scores</caption>
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <th scope="col">Overall Score</th>
                <th scope="col">Skill Match</th>
                <th scope="col">Experience</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {completed.map((r, i) => (
                <tr
                  key={r.candidate_id}
                  onClick={() => setSelected(r)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(r);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Candidate ranked ${i + 1}, score ${r.overall_score.toFixed(1)}. Press Enter to view details.`}
                  style={{ cursor: "pointer" }}
                >
                  <td className="text-right" data-numeric="true">{i + 1}</td>
                  <td className="text-right table-score" data-numeric="true">{r.overall_score.toFixed(1)}</td>
                  <td className="text-right" data-numeric="true">{r.skill_match_score.toFixed(1)}</td>
                  <td className="text-right" data-numeric="true">{r.work_experience_score.toFixed(1)}</td>
                  <td>{r.status}</td>
                  <td><span className="view-details-link">View Details →</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {prefiltered.length > 0 && (
        <p className="pre-filter-note">{prefiltered.length} candidate{prefiltered.length === 1 ? " was" : "s were"} pre-filtered below the top-N cutoff.</p>
      )}

      {failed.length > 0 && (
        <div style={{ marginTop: "28px", padding: "18px 20px", background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "#dc2626", fontWeight: 700 }}>
              ⚠️ {failed.length} Failed Evaluation{failed.length === 1 ? "" : "s"} & Error Logs
            </h3>
          </div>
          <p style={{ margin: "0 0 14px", fontSize: "0.82rem", color: "var(--muted, #64748b)" }}>
            These files could not be evaluated by the pipeline. Inspect the specific error messages below to diagnose:
          </p>
          <div style={{ display: "grid", gap: "10px" }}>
            {failed.map((f, i) => (
              <div key={f.candidate_id || i} style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--line, #e2e8f0)", borderRadius: "8px", padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "0.86rem" }}>{f.filename || `Candidate #${i + 1}`}</strong>
                  <span style={{ fontSize: "0.72rem", background: "rgba(239, 68, 68, 0.12)", color: "#b91c1c", padding: "2px 8px", borderRadius: "99px", fontWeight: 700 }}>
                    Failed
                  </span>
                </div>
                <div style={{ background: "var(--surface-soft, #f8fafc)", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--line, #e2e8f0)", fontFamily: "monospace", fontSize: "0.78rem", color: "#b91c1c", wordBreak: "break-word" }}>
                  {f.error_log || f.verdict_summary || "No specific error log recorded."}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-eval-title">
          <div>
            <button className="secondary-button modal-close" aria-label="Close details dialog" onClick={() => setSelected(null)}>Close</button>
            <p className="eyebrow">Candidate evaluation</p>
            <h2 id="modal-eval-title">Score breakdown</h2>
            <p>{selected.verdict_summary}</p>
            <h3>Matching skills</h3>
            <p>{selected.matching_skills.join(", ") || "None"}</p>
            <h3>Missing skills</h3>
            <p>{selected.missing_skills.join(", ") || "None"}</p>
            <h3>Semantic similarity</h3>
            <p>{selected.cosine_similarity_score.toFixed(3)}</p>
            <a className="primary" href={`/api/jobs/${batchId}/candidates/${selected.candidate_id}/resume`} target="_blank" rel="noopener noreferrer">
              View Original Resume
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
