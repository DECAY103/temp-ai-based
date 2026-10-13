/**
 * Leaderboard — sortable ranked candidate results table with:
 *  - Live "What-If" Scoring Weight Sliders (real-time recalculation & rank delta tracking).
 *  - Side-by-Side Candidate Head-to-Head Comparison Matrix.
 *  - Rich visual skill-gap breakdown and original resume download.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { jobsApi, type CandidateResult } from "@/lib/api";
import { CandidateComparisonModal } from "./CandidateComparisonModal";

interface LeaderboardProps {
  batchId: string;
}

interface ScoringWeights {
  skill: number;
  exp: number;
  semantic: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  skill: 50,
  exp: 35,
  semantic: 15,
};

export function Leaderboard({ batchId }: LeaderboardProps) {
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CandidateResult | null>(null);
  const [sortBy, setSortBy] = useState<"custom_score" | "skill_match_score" | "work_experience_score">("custom_score");

  // "What-If" Weight Tuning State
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [weights, setWeights] = useState<ScoringWeights>(DEFAULT_WEIGHTS);

  // Head-to-Head Comparison State
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    jobsApi
      .getResults(batchId)
      .then(setResults)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load results."))
      .finally(() => setLoading(false));
  }, [batchId]);

  useEffect(() => {
    if (!selected && !showCompareModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(null);
        setShowCompareModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, showCompareModal]);

  const isCustomWeightsActive = useMemo(() => {
    return (
      weights.skill !== DEFAULT_WEIGHTS.skill ||
      weights.exp !== DEFAULT_WEIGHTS.exp ||
      weights.semantic !== DEFAULT_WEIGHTS.semantic
    );
  }, [weights]);

  // Compute baseline ranks once (based strictly on original overall_score)
  const baselineRanks = useMemo(() => {
    const completedList = results
      .filter((r) => r.status === "completed")
      .sort((a, b) => b.overall_score - a.overall_score);
    const rankMap = new Map<string, number>();
    completedList.forEach((c, idx) => rankMap.set(c.candidate_id, idx + 1));
    return rankMap;
  }, [results]);

  // Compute recalculate score per candidate with the active weights
  const scoredCandidates = useMemo(() => {
    const totalWeight = weights.skill + weights.exp + weights.semantic || 1;
    return results
      .filter((r) => r.status === "completed")
      .map((r) => {
        const simScaled = r.cosine_similarity_score * 100;
        const customScore =
          (weights.skill * r.skill_match_score +
            weights.exp * r.work_experience_score +
            weights.semantic * simScaled) /
          totalWeight;
        return {
          ...r,
          custom_score: Math.min(100, Math.max(0, customScore)),
        };
      });
  }, [results, weights]);

  // Sort completed candidates based on active sorting column
  const completed = useMemo(() => {
    return [...scoredCandidates].sort((a, b) => {
      if (sortBy === "custom_score") return b.custom_score - a.custom_score;
      if (sortBy === "skill_match_score") return b.skill_match_score - a.skill_match_score;
      if (sortBy === "work_experience_score") return b.work_experience_score - a.work_experience_score;
      return 0;
    });
  }, [scoredCandidates, sortBy]);

  const prefiltered = useMemo(() => results.filter((r) => r.status === "pre_filtered"), [results]);
  const failed = useMemo(() => results.filter((r) => r.status === "failed"), [results]);

  // Candidate comparison selection helpers
  function toggleCompare(candidateId: string, e: React.MouseEvent | React.ChangeEvent) {
    e.stopPropagation();
    setSelectedForCompare((prev) => {
      if (prev.includes(candidateId)) {
        return prev.filter((id) => id !== candidateId);
      }
      if (prev.length >= 3) {
        alert("You can select up to 3 candidates for head-to-head comparison.");
        return prev;
      }
      return [...prev, candidateId];
    });
  }

  function clearCompare() {
    setSelectedForCompare([]);
  }

  const candidatesToCompare = useMemo(() => {
    return completed.filter((c) => selectedForCompare.includes(c.candidate_id));
  }, [completed, selectedForCompare]);

  // What-If Preset Handlers
  function applyPreset(skill: number, exp: number, semantic: number) {
    setWeights({ skill, exp, semantic });
  }

  function resetWeights() {
    setWeights(DEFAULT_WEIGHTS);
  }

  if (loading) return <p>Loading results…</p>;
  if (error) return <p role="alert">{error}</p>;

  return (
    <section className="leaderboard" aria-labelledby="leaderboard-heading">
      {/* ── Header Toolbar ─────────────────────────────────────────────────── */}
      <div className="leaderboard-toolbar" style={{ flexWrap: "wrap", gap: "16px" }}>
        <div>
          <p className="eyebrow">Evaluation results</p>
          <h2 id="leaderboard-heading" style={{ margin: "2px 0 0" }}>
            Ranked candidates
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* What-If Toggle Button */}
          <button
            type="button"
            className="ghost"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 14px",
              borderRadius: "8px",
              border: isCustomWeightsActive
                ? "1.5px solid var(--primary-1, #4729A3)"
                : "1px solid var(--color-grey-1, #C6C6C6)",
              background: isCustomWeightsActive
                ? "var(--accent-soft, #EEEBFA)"
                : "var(--surface, #FFFFFF)",
              color: isCustomWeightsActive
                ? "var(--primary-1, #4729A3)"
                : "var(--ink, #150202)",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
            onClick={() => setShowWhatIf((prev) => !prev)}
            aria-expanded={showWhatIf}
          >
            <span>🎛️</span>
            <span>What-If Weights</span>
            {isCustomWeightsActive && (
              <span
                style={{
                  background: "var(--primary-1, #4729A3)",
                  color: "#FFFFFF",
                  fontSize: "0.68rem",
                  padding: "1px 6px",
                  borderRadius: "99px",
                }}
              >
                Custom Active
              </span>
            )}
          </button>

          {/* Sort Control */}
          <label className="sort-control" style={{ margin: 0 }}>
            <span style={{ fontSize: "0.78rem", color: "var(--muted, #606060)", fontWeight: 600 }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              style={{ padding: "6px 10px", borderRadius: "8px" }}
            >
              <option value="custom_score">
                {isCustomWeightsActive ? "What-If Custom Score" : "Overall score"}
              </option>
              <option value="skill_match_score">Skill match</option>
              <option value="work_experience_score">Experience</option>
            </select>
          </label>
        </div>
      </div>

      {/* ── What-If Weight Tuning Panel ─────────────────────────────────────── */}
      {showWhatIf && (
        <div
          style={{
            margin: "20px 0 24px",
            padding: "20px 22px",
            background: "var(--surface-soft, #FAFAFA)",
            border: "1px solid var(--accent-border, #BDADEB)",
            borderRadius: "12px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "16px",
              borderBottom: "1px solid var(--color-linen, #EBEAEA)",
              paddingBottom: "12px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.1rem" }}>🎛️</span>
                <strong style={{ fontSize: "0.95rem", color: "var(--primary-1, #4729A3)" }}>
                  Live Scoring &quot;What-If&quot; Sensitivity Tuner
                </strong>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--muted, #606060)" }}>
                Adjust criteria weights in real time. Candidate scores and leaderboard ranks recalculate instantly in your browser.
              </p>
            </div>
            {isCustomWeightsActive && (
              <button
                type="button"
                className="secondary-button"
                style={{ fontSize: "0.82rem", fontWeight: 700 }}
                onClick={resetWeights}
              >
                ↺ Reset to Baseline (50 / 35 / 15)
              </button>
            )}
          </div>

          {/* Quick Presets */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "18px" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted, #606060)" }}>Presets:</span>
            <button
              type="button"
              className="ghost"
              style={{
                fontSize: "0.78rem",
                padding: "4px 10px",
                borderRadius: "6px",
                border: "1px solid var(--color-grey-1, #C6C6C6)",
                background: "var(--surface, #FFFFFF)",
              }}
              onClick={() => applyPreset(50, 35, 15)}
            >
              Balanced (50% / 35% / 15%)
            </button>
            <button
              type="button"
              className="ghost"
              style={{
                fontSize: "0.78rem",
                padding: "4px 10px",
                borderRadius: "6px",
                border: "1px solid var(--color-grey-1, #C6C6C6)",
                background: "var(--surface, #FFFFFF)",
              }}
              onClick={() => applyPreset(70, 20, 10)}
            >
              Skills-First (70% / 20% / 10%)
            </button>
            <button
              type="button"
              className="ghost"
              style={{
                fontSize: "0.78rem",
                padding: "4px 10px",
                borderRadius: "6px",
                border: "1px solid var(--color-grey-1, #C6C6C6)",
                background: "var(--surface, #FFFFFF)",
              }}
              onClick={() => applyPreset(25, 65, 10)}
            >
              Experience-Heavy (25% / 65% / 10%)
            </button>
            <button
              type="button"
              className="ghost"
              style={{
                fontSize: "0.78rem",
                padding: "4px 10px",
                borderRadius: "6px",
                border: "1px solid var(--color-grey-1, #C6C6C6)",
                background: "var(--surface, #FFFFFF)",
              }}
              onClick={() => applyPreset(20, 20, 60)}
            >
              Semantic-Driven (20% / 20% / 60%)
            </button>
          </div>

          {/* Sliders Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "20px",
            }}
          >
            {/* Slider 1: Skill Match */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.85rem" }}>
                <strong>Skill Match Weight</strong>
                <span style={{ fontWeight: 700, color: "var(--primary-1, #4729A3)" }}>{weights.skill}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weights.skill}
                onChange={(e) => setWeights((w) => ({ ...w, skill: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: "var(--primary-1, #4729A3)", cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.74rem", color: "var(--muted, #606060)" }}>Direct match on mandatory & preferred skills</span>
            </div>

            {/* Slider 2: Work Experience */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.85rem" }}>
                <strong>Experience Weight</strong>
                <span style={{ fontWeight: 700, color: "var(--primary-1, #4729A3)" }}>{weights.exp}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weights.exp}
                onChange={(e) => setWeights((w) => ({ ...w, exp: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: "var(--primary-2, #8B70DB)", cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.74rem", color: "var(--muted, #606060)" }}>Career tenure, titles, and seniority fit</span>
            </div>

            {/* Slider 3: Semantic Cosine Relevancy */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.85rem" }}>
                <strong>Semantic Similarity Weight</strong>
                <span style={{ fontWeight: 700, color: "var(--primary-1, #4729A3)" }}>{weights.semantic}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weights.semantic}
                onChange={(e) => setWeights((w) => ({ ...w, semantic: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: "var(--primary-1, #4729A3)", cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.74rem", color: "var(--muted, #606060)" }}>Stage-1 embedding & keyword contextual similarity</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky Comparison Action Bar (Active when candidates are selected) ── */}
      {selectedForCompare.length > 0 && (
        <div
          style={{
            position: "sticky",
            top: "72px",
            zIndex: 9,
            margin: "0 0 16px",
            padding: "12px 18px",
            background: "var(--primary-1, #4729A3)",
            color: "#FFFFFF",
            borderRadius: "10px",
            boxShadow: "var(--shadow-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "0.92rem" }}>
              ⚔️ {selectedForCompare.length} Candidate{selectedForCompare.length > 1 ? "s" : ""} selected:
            </span>
            {candidatesToCompare.map((c) => (
              <span
                key={c.candidate_id}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{c.filename ? c.filename.slice(0, 18) : c.candidate_id.slice(0, 6)}</span>
                <button
                  type="button"
                  onClick={(e) => toggleCompare(c.candidate_id, e)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#FFFFFF",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: 700,
                  }}
                  title="Remove from comparison"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={clearCompare}
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.4)",
                color: "#FFFFFF",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
            <button
              type="button"
              disabled={selectedForCompare.length < 2}
              onClick={() => setShowCompareModal(true)}
              style={{
                background: selectedForCompare.length >= 2 ? "#FFFFFF" : "rgba(255, 255, 255, 0.3)",
                color: selectedForCompare.length >= 2 ? "var(--primary-1, #4729A3)" : "rgba(255, 255, 255, 0.7)",
                border: "none",
                borderRadius: "6px",
                padding: "6px 16px",
                fontSize: "0.82rem",
                fontWeight: 750,
                cursor: selectedForCompare.length >= 2 ? "pointer" : "not-allowed",
              }}
            >
              Compare Head-to-Head ({selectedForCompare.length}/3) →
            </button>
          </div>
        </div>
      )}

      {/* ── Main Leaderboard Table ────────────────────────────────────────── */}
      {completed.length === 0 ? (
        <p className="empty-state">No completed candidate evaluations are available yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Candidate evaluation leaderboard and scores</caption>
            <thead>
              <tr>
                <th scope="col" style={{ width: "42px", textAlign: "center" }}>
                  <span className="sr-only">Select to compare</span>
                </th>
                <th scope="col" style={{ width: "90px" }}>Rank</th>
                <th scope="col">Candidate / File</th>
                <th scope="col">
                  {isCustomWeightsActive ? "What-If Score" : "Overall Score"}
                </th>
                <th scope="col">Skill Match</th>
                <th scope="col">Experience</th>
                <th scope="col">Status</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {completed.map((r, i) => {
                const currentRank = i + 1;
                const baseRank = baselineRanks.get(r.candidate_id) || currentRank;
                const rankDelta = baseRank - currentRank; // positive = rank improved, negative = dropped
                const isSelectedForCompare = selectedForCompare.includes(r.candidate_id);

                return (
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
                    aria-label={`Candidate ranked ${currentRank}, score ${r.custom_score.toFixed(1)}. Press Enter to view details.`}
                    style={{
                      cursor: "pointer",
                      background: isSelectedForCompare ? "var(--accent-soft, #EEEBFA)" : undefined,
                    }}
                  >
                    {/* Checkbox for Comparison */}
                    <td
                      style={{ textAlign: "center" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelectedForCompare}
                        onChange={(e) => toggleCompare(r.candidate_id, e)}
                        title="Select candidate for side-by-side comparison"
                        style={{
                          width: "17px",
                          height: "17px",
                          cursor: "pointer",
                          accentColor: "var(--primary-1, #4729A3)",
                        }}
                      />
                    </td>

                    {/* Rank with Delta Badge */}
                    <td className="text-right" data-numeric="true">
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <strong style={{ fontSize: "0.95rem" }}>#{currentRank}</strong>
                        {isCustomWeightsActive && (
                          <span
                            title={
                              rankDelta > 0
                                ? `Rank gained by +${rankDelta} under custom weights (originally #${baseRank})`
                                : rankDelta < 0
                                ? `Rank dropped by ${rankDelta} under custom weights (originally #${baseRank})`
                                : `Rank unchanged (originally #${baseRank})`
                            }
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 750,
                              padding: "1px 4px",
                              borderRadius: "4px",
                              background:
                                rankDelta > 0
                                  ? "var(--good-soft, #E8F5E9)"
                                  : rankDelta < 0
                                  ? "var(--bad-soft, #FDE8E8)"
                                  : "var(--color-linen, #EBEAEA)",
                              color:
                                rankDelta > 0
                                  ? "var(--color-liberty-green, #198754)"
                                  : rankDelta < 0
                                  ? "var(--color-coral-red, #DC3545)"
                                  : "var(--muted, #606060)",
                            }}
                          >
                            {rankDelta > 0 ? `▲+${rankDelta}` : rankDelta < 0 ? `▼${rankDelta}` : "="}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Candidate File / Identifier */}
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--ink, #150202)", fontSize: "0.88rem" }}>
                        {r.filename || `Candidate ${r.candidate_id.slice(0, 8)}`}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted, #606060)" }}>
                        {r.matching_skills.length} matching skills • {r.missing_skills.length} gaps
                      </div>
                    </td>

                    {/* Overall / Custom Score */}
                    <td className="text-right table-score" data-numeric="true">
                      <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "var(--primary-1, #4729A3)" }}>
                        {r.custom_score.toFixed(1)}
                      </div>
                      {isCustomWeightsActive && (
                        <div style={{ fontSize: "0.72rem", color: "var(--muted, #606060)" }}>
                          (base: {r.overall_score.toFixed(1)})
                        </div>
                      )}
                    </td>

                    {/* Skill Match Score */}
                    <td className="text-right" data-numeric="true">
                      <span style={{ fontWeight: 650 }}>{r.skill_match_score.toFixed(1)}%</span>
                    </td>

                    {/* Experience Score */}
                    <td className="text-right" data-numeric="true">
                      <span style={{ fontWeight: 650 }}>{r.work_experience_score.toFixed(1)}%</span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className="status-chip">{r.status}</span>
                    </td>

                    {/* Actions */}
                    <td style={{ whiteSpace: "nowrap" }}>
                      <span className="view-details-link" style={{ color: "var(--color-blue, #0D6EFD)", fontWeight: 650 }}>
                        View Details →
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pre-filtered Candidates Notice ─────────────────────────────────── */}
      {prefiltered.length > 0 && (
        <p className="pre-filter-note" style={{ marginTop: "14px" }}>
          {prefiltered.length} candidate{prefiltered.length === 1 ? " was" : "s were"} pre-filtered below the stage-1 semantic cutoff.
        </p>
      )}

      {/* ── Failed Evaluations Section ──────────────────────────────────────── */}
      {failed.length > 0 && (
        <div style={{ marginTop: "28px", padding: "18px 20px", background: "var(--bad-soft, #FDE8E8)", border: "1px solid var(--color-coral-red, #DC3545)", borderRadius: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--color-coral-red, #DC3545)", fontWeight: 700 }}>
              ⚠️ {failed.length} Failed Evaluation{failed.length === 1 ? "" : "s"} & Error Logs
            </h3>
          </div>
          <p style={{ margin: "0 0 14px", fontSize: "0.82rem", color: "var(--muted, #606060)" }}>
            These files could not be evaluated by the pipeline. Inspect the specific error messages below to diagnose:
          </p>
          <div style={{ display: "grid", gap: "10px" }}>
            {failed.map((f, i) => (
              <div key={f.candidate_id || i} style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--color-linen, #EBEAEA)", borderRadius: "8px", padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "0.86rem" }}>{f.filename || `Candidate #${i + 1}`}</strong>
                  <span style={{ fontSize: "0.72rem", background: "var(--bad-soft, #FDE8E8)", color: "var(--color-coral-red, #DC3545)", padding: "2px 8px", borderRadius: "99px", fontWeight: 700 }}>
                    Failed
                  </span>
                </div>
                <div style={{ background: "var(--surface-soft, #FAFAFA)", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--color-linen, #EBEAEA)", fontFamily: "monospace", fontSize: "0.78rem", color: "var(--color-coral-red, #DC3545)", wordBreak: "break-word" }}>
                  {f.error_log || f.verdict_summary || "No specific error log recorded."}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Single Candidate Details Modal ──────────────────────────────────── */}
      {selected && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-eval-title">
          <div style={{ maxWidth: "620px" }}>
            <button className="secondary-button modal-close" aria-label="Close details dialog" onClick={() => setSelected(null)}>
              ✕ Close
            </button>
            <p className="eyebrow">Candidate evaluation</p>
            <h2 id="modal-eval-title" style={{ margin: "4px 0 12px" }}>
              {selected.filename || `Candidate Details (${selected.candidate_id.slice(0, 8)})`}
            </h2>

            {/* Score Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
                margin: "16px 0 20px",
                background: "var(--surface-soft, #FAFAFA)",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid var(--color-linen, #EBEAEA)",
              }}
            >
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--muted, #606060)" }}>Overall Score</span>
                <strong style={{ display: "block", fontSize: "1.25rem", color: "var(--primary-1, #4729A3)" }}>
                  {selected.overall_score.toFixed(1)}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--muted, #606060)" }}>Skill Match</span>
                <strong style={{ display: "block", fontSize: "1.25rem", color: "var(--ink, #150202)" }}>
                  {selected.skill_match_score.toFixed(1)}%
                </strong>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--muted, #606060)" }}>Experience</span>
                <strong style={{ display: "block", fontSize: "1.25rem", color: "var(--ink, #150202)" }}>
                  {selected.work_experience_score.toFixed(1)}%
                </strong>
              </div>
            </div>

            {/* AI Verdict */}
            <h3 style={{ fontSize: "0.96rem", marginBottom: "6px" }}>Evaluator Assessment</h3>
            <p style={{ fontSize: "0.88rem", lineHeight: 1.6, color: "var(--ink, #150202)" }}>
              {selected.verdict_summary}
            </p>

            {/* Skills Badges */}
            <h3 style={{ fontSize: "0.92rem", margin: "16px 0 8px" }}>Matching Skills ({selected.matching_skills.length})</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
              {selected.matching_skills.length > 0 ? (
                selected.matching_skills.map((s, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "var(--good-soft, #E8F5E9)",
                      color: "var(--color-liberty-green, #198754)",
                      border: "1px solid var(--color-liberty-green, #198754)",
                      fontSize: "0.76rem",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    ✓ {s}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: "0.82rem", color: "var(--muted, #606060)" }}>None identified.</span>
              )}
            </div>

            <h3 style={{ fontSize: "0.92rem", margin: "16px 0 8px" }}>Missing Rubric Skills ({selected.missing_skills.length})</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "20px" }}>
              {selected.missing_skills.length > 0 ? (
                selected.missing_skills.map((s, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "var(--bad-soft, #FDE8E8)",
                      color: "var(--color-coral-red, #DC3545)",
                      fontSize: "0.76rem",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    ✕ {s}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: "0.82rem", color: "var(--color-liberty-green, #198754)", fontWeight: 600 }}>All requirements satisfied!</span>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginTop: "24px" }}>
              <a
                className="primary"
                href={`/api/jobs/${batchId}/candidates/${selected.candidate_id}/resume`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.86rem", padding: "8px 16px" }}
              >
                📄 Inspect Original Resume PDF
              </a>
              <button
                type="button"
                className="ghost"
                style={{
                  fontSize: "0.86rem",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-grey-1, #C6C6C6)",
                }}
                onClick={() => {
                  if (!selectedForCompare.includes(selected.candidate_id)) {
                    setSelectedForCompare((prev) => [...prev, selected.candidate_id]);
                  }
                  setSelected(null);
                }}
              >
                ⚔️ Add to Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Head-to-Head Comparison Matrix Modal ────────────────────────────── */}
      {showCompareModal && candidatesToCompare.length >= 2 && (
        <CandidateComparisonModal
          candidates={candidatesToCompare}
          batchId={batchId}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </section>
  );
}
