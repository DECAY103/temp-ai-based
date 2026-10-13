/**
 * Leaderboard — enterprise candidate ranking interface with:
 *  - Live "What-If" Scoring Weight Sensitivity Tuner (real-time composite score recalculation & rank delta tracking).
 *  - Side-by-Side Candidate Head-to-Head Comparison Matrix.
 *  - Candidate evaluation detail inspector with skill overlap & gap analysis.
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
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load evaluation results."))
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

  // Compute recalculate score per candidate with active weights
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

  // Count candidates whose rank shifted
  const rankShiftCount = useMemo(() => {
    if (!isCustomWeightsActive) return 0;
    let count = 0;
    completed.forEach((r, idx) => {
      const baseRank = baselineRanks.get(r.candidate_id);
      if (baseRank !== undefined && baseRank !== idx + 1) {
        count++;
      }
    });
    return count;
  }, [completed, baselineRanks, isCustomWeightsActive]);

  // Candidate comparison selection helpers
  function toggleCompare(candidateId: string, e: React.MouseEvent | React.ChangeEvent) {
    e.stopPropagation();
    setSelectedForCompare((prev) => {
      if (prev.includes(candidateId)) {
        return prev.filter((id) => id !== candidateId);
      }
      if (prev.length >= 3) {
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

  function applyPreset(skill: number, exp: number, semantic: number) {
    setWeights({ skill, exp, semantic });
  }

  function resetWeights() {
    setWeights(DEFAULT_WEIGHTS);
  }

  const isBalancedActive = weights.skill === 50 && weights.exp === 35 && weights.semantic === 15;
  const isSkillsFirstActive = weights.skill === 70 && weights.exp === 20 && weights.semantic === 10;
  const isExpHeavyActive = weights.skill === 25 && weights.exp === 65 && weights.semantic === 10;
  const isSemanticActive = weights.skill === 20 && weights.exp === 20 && weights.semantic === 60;

  if (loading) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted, #606060)" }}>
        <p style={{ fontSize: "1rem" }}>Loading candidate evaluations…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px", background: "var(--bad-soft, #FDE8E8)", border: "1px solid var(--color-coral-red, #DC3545)", borderRadius: "10px", margin: "20px 0" }}>
        <p role="alert" style={{ color: "var(--color-coral-red, #DC3545)", fontWeight: 650, margin: 0 }}>{error}</p>
      </div>
    );
  }

  return (
    <section className="leaderboard" aria-labelledby="leaderboard-heading">
      {/* ── Header Toolbar ─────────────────────────────────────────────────── */}
      <div
        className="leaderboard-toolbar"
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "18px",
          marginBottom: "20px",
        }}
      >
        <div>
          <p className="eyebrow" style={{ marginBottom: "4px", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted, #606060)", fontWeight: 700 }}>
            Evaluation Results
          </p>
          <h2 id="leaderboard-heading" style={{ margin: 0, fontSize: "1.55rem", fontWeight: 700, color: "var(--ink, #150202)", letterSpacing: "-0.02em" }}>
            Ranked Candidates
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* What-If Sensitivity Toggle */}
          <button
            type="button"
            className="ghost"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 16px",
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
              fontSize: "0.9rem",
              fontWeight: 650,
              cursor: "pointer",
            }}
            onClick={() => setShowWhatIf((prev) => !prev)}
            aria-expanded={showWhatIf}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            <span>Weight Sensitivity</span>
            {isCustomWeightsActive && (
              <span
                style={{
                  background: "var(--primary-1, #4729A3)",
                  color: "#FFFFFF",
                  fontSize: "0.74rem",
                  padding: "2px 8px",
                  borderRadius: "99px",
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}
              >
                Custom Active
              </span>
            )}
          </button>

          {/* Sort Control */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.88rem", color: "var(--muted, #606060)", fontWeight: 650 }}>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "0.9rem",
                border: "1px solid var(--color-grey-1, #C6C6C6)",
                background: "var(--surface, #FFFFFF)",
                color: "var(--ink, #150202)",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <option value="custom_score">
                {isCustomWeightsActive ? "What-If Simulated Score" : "Overall Score"}
              </option>
              <option value="skill_match_score">Skill Match</option>
              <option value="work_experience_score">Work Experience</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── What-If Weight Tuning Panel ─────────────────────────────────────── */}
      {showWhatIf && (
        <div
          style={{
            margin: "0 0 28px",
            padding: "26px 30px",
            background: "var(--surface-soft, #FAFAFA)",
            border: "1px solid var(--accent-border, #BDADEB)",
            borderRadius: "14px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {/* Header Row */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
              marginBottom: "20px",
              borderBottom: "1px solid var(--color-linen, #EBEAEA)",
              paddingBottom: "16px",
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 700, color: "var(--primary-1, #4729A3)" }}>
                Scoring Weight Sensitivity Tuner
              </h3>
              <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--muted, #606060)", lineHeight: 1.5 }}>
                Simulate alternate hiring priorities by tuning rubric criteria weights. Composite scores and leaderboard rankings re-index dynamically in real time.
              </p>
            </div>
            {isCustomWeightsActive && (
              <button
                type="button"
                className="secondary-button"
                style={{
                  fontSize: "0.86rem",
                  fontWeight: 650,
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-grey-1, #C6C6C6)",
                  background: "var(--surface, #FFFFFF)",
                  cursor: "pointer",
                }}
                onClick={resetWeights}
              >
                Reset to Baseline (50 / 35 / 15)
              </button>
            )}
          </div>

          {/* Quick Presets Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "22px" }}>
            <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--muted, #606060)" }}>Evaluation Profiles:</span>
            {[
              { label: "Balanced (50% / 35% / 15%)", skill: 50, exp: 35, semantic: 15, active: isBalancedActive },
              { label: "Skills-First (70% / 20% / 10%)", skill: 70, exp: 20, semantic: 10, active: isSkillsFirstActive },
              { label: "Experience-Heavy (25% / 65% / 10%)", skill: 25, exp: 65, semantic: 10, active: isExpHeavyActive },
              { label: "Semantic-Driven (20% / 20% / 60%)", skill: 20, exp: 20, semantic: 60, active: isSemanticActive },
            ].map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="ghost"
                style={{
                  fontSize: "0.85rem",
                  padding: "6px 14px",
                  borderRadius: "7px",
                  border: p.active
                    ? "1.5px solid var(--primary-1, #4729A3)"
                    : "1px solid var(--color-grey-1, #C6C6C6)",
                  background: p.active ? "var(--accent-soft, #EEEBFA)" : "var(--surface, #FFFFFF)",
                  color: p.active ? "var(--primary-1, #4729A3)" : "var(--ink, #150202)",
                  fontWeight: p.active ? 700 : 600,
                  cursor: "pointer",
                }}
                onClick={() => applyPreset(p.skill, p.exp, p.semantic)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Sliders Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "24px",
              marginBottom: isCustomWeightsActive ? "18px" : 0,
            }}
          >
            {/* Slider 1: Skill Match */}
            <div
              style={{
                background: "var(--surface, #FFFFFF)",
                border: "1px solid var(--color-linen, #EBEAEA)",
                borderRadius: "10px",
                padding: "16px 18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--ink, #150202)" }}>Skill Match Weight</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "var(--primary-1, #4729A3)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {weights.skill}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weights.skill}
                onChange={(e) => setWeights((w) => ({ ...w, skill: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: "var(--primary-1, #4729A3)", cursor: "pointer", marginBottom: "6px" }}
              />
              <span style={{ fontSize: "0.82rem", color: "var(--muted, #606060)", display: "block" }}>
                Verified rubric requirements and keyword alignment
              </span>
            </div>

            {/* Slider 2: Work Experience */}
            <div
              style={{
                background: "var(--surface, #FFFFFF)",
                border: "1px solid var(--color-linen, #EBEAEA)",
                borderRadius: "10px",
                padding: "16px 18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--ink, #150202)" }}>Experience Weight</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "var(--primary-1, #4729A3)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {weights.exp}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weights.exp}
                onChange={(e) => setWeights((w) => ({ ...w, exp: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: "var(--primary-2, #8B70DB)", cursor: "pointer", marginBottom: "6px" }}
              />
              <span style={{ fontSize: "0.82rem", color: "var(--muted, #606060)", display: "block" }}>
                Documented career tenure, title seniority, and roles
              </span>
            </div>

            {/* Slider 3: Semantic Vector Relevance */}
            <div
              style={{
                background: "var(--surface, #FFFFFF)",
                border: "1px solid var(--color-linen, #EBEAEA)",
                borderRadius: "10px",
                padding: "16px 18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--ink, #150202)" }}>Semantic Weight</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "var(--primary-1, #4729A3)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {weights.semantic}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weights.semantic}
                onChange={(e) => setWeights((w) => ({ ...w, semantic: Number(e.target.value) }))}
                style={{ width: "100%", accentColor: "var(--primary-1, #4729A3)", cursor: "pointer", marginBottom: "6px" }}
              />
              <span style={{ fontSize: "0.82rem", color: "var(--muted, #606060)", display: "block" }}>
                Stage-1 embedding contextual cosine similarity
              </span>
            </div>
          </div>

          {/* Active Simulation Feedback Banner */}
          {isCustomWeightsActive && (
            <div
              style={{
                marginTop: "16px",
                padding: "10px 16px",
                background: "var(--accent-soft, #EEEBFA)",
                border: "1px solid var(--accent-border, #BDADEB)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.88rem",
                color: "var(--primary-1, #4729A3)",
                fontWeight: 650,
              }}
            >
              <span>
                Simulation Active: Re-calculated against custom weights ({weights.skill}% / {weights.exp}% / {weights.semantic}%).
              </span>
              <span>
                {rankShiftCount > 0
                  ? `${rankShiftCount} candidate rank position${rankShiftCount === 1 ? "" : "s"} altered`
                  : "All current candidate rankings maintained"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Main Leaderboard Table ────────────────────────────────────────── */}
      {completed.length === 0 ? (
        <div style={{ padding: "48px 20px", textAlign: "center", background: "var(--surface-soft, #FAFAFA)", border: "1px solid var(--color-linen, #EBEAEA)", borderRadius: "12px" }}>
          <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--muted, #606060)" }}>
            No completed candidate evaluations are available for this rubric batch.
          </p>
        </div>
      ) : (
        <div className="table-wrap" style={{ border: "1px solid var(--color-grey-1, #C6C6C6)", borderRadius: "12px", overflow: "hidden", background: "var(--surface, #FFFFFF)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <caption className="sr-only">Candidate evaluation leaderboard and ranked scores</caption>
            <thead>
              <tr style={{ background: "var(--surface-soft, #FAFAFA)", borderBottom: "1px solid var(--color-grey-1, #C6C6C6)" }}>
                <th scope="col" style={{ width: "52px", textAlign: "center", padding: "14px 12px" }}>
                  <span className="sr-only">Select for comparison</span>
                </th>
                <th scope="col" style={{ width: "110px", padding: "14px 16px", fontSize: "0.88rem", fontWeight: 700, color: "var(--ink, #150202)", textAlign: "left" }}>
                  Rank
                </th>
                <th scope="col" style={{ padding: "14px 16px", fontSize: "0.88rem", fontWeight: 700, color: "var(--ink, #150202)", textAlign: "left" }}>
                  Candidate File
                </th>
                <th scope="col" style={{ padding: "14px 16px", fontSize: "0.88rem", fontWeight: 700, color: "var(--ink, #150202)", textAlign: "right" }}>
                  {isCustomWeightsActive ? "What-If Score" : "Overall Score"}
                </th>
                <th scope="col" style={{ padding: "14px 16px", fontSize: "0.88rem", fontWeight: 700, color: "var(--ink, #150202)", textAlign: "right" }}>
                  Skill Match
                </th>
                <th scope="col" style={{ padding: "14px 16px", fontSize: "0.88rem", fontWeight: 700, color: "var(--ink, #150202)", textAlign: "right" }}>
                  Experience
                </th>
                <th scope="col" style={{ padding: "14px 16px", fontSize: "0.88rem", fontWeight: 700, color: "var(--ink, #150202)", textAlign: "center" }}>
                  Status
                </th>
                <th scope="col" style={{ padding: "14px 16px", textAlign: "right" }}>
                  <span className="sr-only">Details Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {completed.map((r, i) => {
                const currentRank = i + 1;
                const baseRank = baselineRanks.get(r.candidate_id) || currentRank;
                const rankDelta = baseRank - currentRank;
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
                    aria-label={`Candidate ranked #${currentRank}, score ${r.custom_score.toFixed(1)}. Select to view evaluation report.`}
                    style={{
                      cursor: "pointer",
                      borderBottom: "1px solid var(--color-linen, #EBEAEA)",
                      background: isSelectedForCompare ? "var(--accent-soft, #EEEBFA)" : undefined,
                      transition: "background 0.15s ease",
                    }}
                  >
                    {/* Checkbox for Comparison */}
                    <td
                      style={{ textAlign: "center", padding: "16px 12px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelectedForCompare}
                        onChange={(e) => toggleCompare(r.candidate_id, e)}
                        title="Select candidate for side-by-side comparison"
                        style={{
                          width: "18px",
                          height: "18px",
                          cursor: "pointer",
                          accentColor: "var(--primary-1, #4729A3)",
                        }}
                      />
                    </td>

                    {/* Rank with Delta Indicator */}
                    <td style={{ padding: "16px", textAlign: "left" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "1.05rem", fontVariantNumeric: "tabular-nums", color: "var(--ink, #150202)" }}>
                          #{currentRank}
                        </strong>
                        {isCustomWeightsActive && (
                          <span
                            title={
                              rankDelta > 0
                                ? `Rank improved by ${rankDelta} under custom weights (originally #${baseRank})`
                                : rankDelta < 0
                                ? `Rank decreased by ${Math.abs(rankDelta)} under custom weights (originally #${baseRank})`
                                : `Rank unchanged (originally #${baseRank})`
                            }
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              padding: "2px 8px",
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
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {rankDelta > 0 ? `+${rankDelta}` : rankDelta < 0 ? `${rankDelta}` : "0"}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Candidate File & Skills Overview */}
                    <td style={{ padding: "16px" }}>
                      <div style={{ fontWeight: 650, color: "var(--ink, #150202)", fontSize: "0.98rem", wordBreak: "break-all" }}>
                        {r.filename || `Candidate ${r.candidate_id.slice(0, 8)}`}
                      </div>
                      <div style={{ fontSize: "0.86rem", color: "var(--muted, #606060)", marginTop: "4px" }}>
                        {r.matching_skills.length} verified rubric skills &bull; {r.missing_skills.length} gaps
                      </div>
                    </td>

                    {/* Composite Score */}
                    <td style={{ padding: "16px", textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: "1.25rem", color: "var(--primary-1, #4729A3)", fontVariantNumeric: "tabular-nums" }}>
                        {r.custom_score.toFixed(1)}
                      </div>
                      {isCustomWeightsActive && (
                        <div style={{ fontSize: "0.8rem", color: "var(--muted, #606060)", fontVariantNumeric: "tabular-nums" }}>
                          base: {r.overall_score.toFixed(1)}
                        </div>
                      )}
                    </td>

                    {/* Skill Match */}
                    <td style={{ padding: "16px", textAlign: "right" }}>
                      <span style={{ fontWeight: 650, fontSize: "0.95rem", fontVariantNumeric: "tabular-nums" }}>
                        {r.skill_match_score.toFixed(1)}%
                      </span>
                    </td>

                    {/* Experience */}
                    <td style={{ padding: "16px", textAlign: "right" }}>
                      <span style={{ fontWeight: 650, fontSize: "0.95rem", fontVariantNumeric: "tabular-nums" }}>
                        {r.work_experience_score.toFixed(1)}%
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "16px", textAlign: "center" }}>
                      <span className="status-chip" style={{ fontSize: "0.8rem", padding: "3px 10px", borderRadius: "99px", background: "var(--good-soft, #E8F5E9)", color: "var(--color-liberty-green, #198754)", border: "1px solid var(--color-liberty-green, #198754)", fontWeight: 650 }}>
                        {r.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "var(--color-blue, #0D6EFD)",
                          fontWeight: 650,
                          fontSize: "0.9rem",
                        }}
                      >
                        <span>View Details</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pre-filtered Notice ────────────────────────────────────────────── */}
      {prefiltered.length > 0 && (
        <p style={{ marginTop: "18px", fontSize: "0.9rem", color: "var(--muted, #606060)" }}>
          {prefiltered.length} candidate{prefiltered.length === 1 ? " was" : "s were"} pre-filtered below the stage-1 semantic cutoff threshold.
        </p>
      )}

      {/* ── Failed Evaluations Section ──────────────────────────────────────── */}
      {failed.length > 0 && (
        <div style={{ marginTop: "36px", padding: "22px 26px", background: "var(--bad-soft, #FDE8E8)", border: "1px solid var(--color-coral-red, #DC3545)", borderRadius: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--color-coral-red, #DC3545)", fontWeight: 700 }}>
              Failed Evaluations ({failed.length})
            </h3>
          </div>
          <p style={{ margin: "0 0 18px", fontSize: "0.9rem", color: "var(--muted, #606060)", lineHeight: 1.5 }}>
            The following files could not be evaluated by the ingestion pipeline. Inspect recorded diagnostics below:
          </p>
          <div style={{ display: "grid", gap: "14px" }}>
            {failed.map((f, i) => (
              <div key={f.candidate_id || i} style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--color-linen, #EBEAEA)", borderRadius: "8px", padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <strong style={{ fontSize: "0.94rem" }}>{f.filename || `Candidate #${i + 1}`}</strong>
                  <span style={{ fontSize: "0.78rem", background: "var(--bad-soft, #FDE8E8)", color: "var(--color-coral-red, #DC3545)", border: "1px solid var(--color-coral-red, #DC3545)", padding: "2px 10px", borderRadius: "99px", fontWeight: 700 }}>
                    Failed
                  </span>
                </div>
                <div style={{ background: "var(--surface-soft, #FAFAFA)", padding: "12px 14px", borderRadius: "6px", border: "1px solid var(--color-linen, #EBEAEA)", fontFamily: "monospace", fontSize: "0.85rem", color: "var(--color-coral-red, #DC3545)", wordBreak: "break-word" }}>
                  {f.error_log || f.verdict_summary || "No specific error log recorded."}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Comparison Floating Dock (Clean B2B Action Bar) ────────────────── */}
      {selectedForCompare.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "28px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 900,
            width: "min(92%, 760px)",
            padding: "14px 22px",
            background: "var(--surface, #FFFFFF)",
            border: "1.5px solid var(--primary-1, #4729A3)",
            borderRadius: "14px",
            boxShadow: "var(--shadow-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "0.94rem", color: "var(--ink, #150202)" }}>
              Comparing ({selectedForCompare.length}/3):
            </span>
            {candidatesToCompare.map((c) => (
              <span
                key={c.candidate_id}
                style={{
                  background: "var(--accent-soft, #EEEBFA)",
                  border: "1px solid var(--accent-border, #BDADEB)",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  color: "var(--primary-1, #4729A3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 650,
                }}
              >
                <span>{c.filename ? c.filename.slice(0, 18) : c.candidate_id.slice(0, 6)}</span>
                <button
                  type="button"
                  onClick={(e) => toggleCompare(c.candidate_id, e)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary-1, #4729A3)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Remove from comparison"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={clearCompare}
              className="ghost"
              style={{
                fontSize: "0.88rem",
                fontWeight: 650,
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid var(--color-grey-1, #C6C6C6)",
                cursor: "pointer",
                background: "var(--surface, #FFFFFF)",
              }}
            >
              Clear
            </button>
            <button
              type="button"
              disabled={selectedForCompare.length < 2}
              onClick={() => setShowCompareModal(true)}
              className="primary"
              style={{
                fontSize: "0.9rem",
                padding: "9px 20px",
                borderRadius: "8px",
                opacity: selectedForCompare.length >= 2 ? 1 : 0.5,
                cursor: selectedForCompare.length >= 2 ? "pointer" : "not-allowed",
              }}
            >
              {selectedForCompare.length < 2 ? "Select 1 More to Compare" : "Compare Candidates"}
            </button>
          </div>
        </div>
      )}

      {/* ── Single Candidate Details Modal ──────────────────────────────────── */}
      {selected && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(21, 2, 2, 0.70)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-eval-title"
        >
          <div
            style={{
              background: "var(--surface, #FFFFFF)",
              border: "1px solid var(--color-grey-1, #C6C6C6)",
              borderRadius: "14px",
              width: "min(100%, 720px)",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "36px 40px",
              boxShadow: "var(--shadow-lg)",
              color: "var(--ink, #150202)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: "1px solid var(--color-linen, #EBEAEA)", paddingBottom: "16px" }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: "4px", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted, #606060)", fontWeight: 700 }}>
                  Candidate Evaluation Report
                </p>
                <h2 id="modal-eval-title" style={{ margin: 0, fontSize: "1.45rem", fontWeight: 700, color: "var(--ink, #150202)" }}>
                  {selected.filename || `Candidate ID: ${selected.candidate_id.slice(0, 8)}`}
                </h2>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelected(null)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.88rem",
                  fontWeight: 650,
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-grey-1, #C6C6C6)",
                  background: "var(--surface-soft, #FAFAFA)",
                  cursor: "pointer",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>Close</span>
              </button>
            </div>

            {/* Score Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "16px",
                margin: "20px 0 26px",
                background: "var(--surface-soft, #FAFAFA)",
                padding: "20px 22px",
                borderRadius: "12px",
                border: "1px solid var(--color-linen, #EBEAEA)",
              }}
            >
              <div>
                <span style={{ fontSize: "0.85rem", color: "var(--muted, #606060)", fontWeight: 600 }}>Overall Rating</span>
                <strong style={{ display: "block", fontSize: "1.75rem", color: "var(--primary-1, #4729A3)", fontVariantNumeric: "tabular-nums", marginTop: "4px" }}>
                  {selected.overall_score.toFixed(1)}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: "0.85rem", color: "var(--muted, #606060)", fontWeight: 600 }}>Skill Match</span>
                <strong style={{ display: "block", fontSize: "1.75rem", color: "var(--ink, #150202)", fontVariantNumeric: "tabular-nums", marginTop: "4px" }}>
                  {selected.skill_match_score.toFixed(1)}%
                </strong>
              </div>
              <div>
                <span style={{ fontSize: "0.85rem", color: "var(--muted, #606060)", fontWeight: 600 }}>Work Experience</span>
                <strong style={{ display: "block", fontSize: "1.75rem", color: "var(--ink, #150202)", fontVariantNumeric: "tabular-nums", marginTop: "4px" }}>
                  {selected.work_experience_score.toFixed(1)}%
                </strong>
              </div>
            </div>

            {/* Evaluator Assessment */}
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 8px", color: "var(--ink, #150202)" }}>
              Evaluator Assessment
            </h3>
            <p style={{ fontSize: "0.95rem", lineHeight: 1.65, color: "var(--ink, #150202)", margin: "0 0 24px" }}>
              {selected.verdict_summary || "No specific qualitative verdict recorded."}
            </p>

            {/* Matching Skills */}
            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 10px", color: "var(--ink, #150202)" }}>
              Matching Skills ({selected.matching_skills.length})
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "24px" }}>
              {selected.matching_skills.length > 0 ? (
                selected.matching_skills.map((s, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "var(--good-soft, #E8F5E9)",
                      color: "var(--color-liberty-green, #198754)",
                      border: "1px solid var(--color-liberty-green, #198754)",
                      fontSize: "0.85rem",
                      fontWeight: 650,
                      padding: "4px 12px",
                      borderRadius: "6px",
                    }}
                  >
                    {s}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: "0.9rem", color: "var(--muted, #606060)" }}>None identified.</span>
              )}
            </div>

            {/* Missing Rubric Skills */}
            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 10px", color: "var(--ink, #150202)" }}>
              Missing Rubric Requirements ({selected.missing_skills.length})
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "28px" }}>
              {selected.missing_skills.length > 0 ? (
                selected.missing_skills.map((s, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "var(--bad-soft, #FDE8E8)",
                      color: "var(--color-coral-red, #DC3545)",
                      border: "1px solid var(--color-coral-red, #DC3545)",
                      fontSize: "0.85rem",
                      fontWeight: 650,
                      padding: "4px 12px",
                      borderRadius: "6px",
                    }}
                  >
                    {s}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: "0.9rem", color: "var(--color-liberty-green, #198754)", fontWeight: 650 }}>
                  All requirements satisfied.
                </span>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", paddingTop: "20px", borderTop: "1px solid var(--color-linen, #EBEAEA)" }}>
              <a
                className="primary"
                href={`/api/jobs/${batchId}/candidates/${selected.candidate_id}/resume`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "0.92rem",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  textDecoration: "none",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <span>Inspect Original Resume</span>
              </a>
              <button
                type="button"
                className="ghost"
                style={{
                  fontSize: "0.92rem",
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-grey-1, #C6C6C6)",
                  fontWeight: 650,
                  cursor: "pointer",
                }}
                onClick={() => {
                  if (!selectedForCompare.includes(selected.candidate_id)) {
                    setSelectedForCompare((prev) => [...prev, selected.candidate_id]);
                  }
                  setSelected(null);
                }}
              >
                Add to Comparison
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
