"use client";

import { useMemo } from "react";
import type { CandidateResult } from "@/lib/api";

interface CandidateComparisonModalProps {
  candidates: CandidateResult[];
  batchId: string;
  onClose: () => void;
}

export function CandidateComparisonModal({
  candidates,
  batchId,
  onClose,
}: CandidateComparisonModalProps) {
  // Determine highest scores for badge highlights
  const highestOverall = useMemo(
    () => Math.max(...candidates.map((c) => c.overall_score)),
    [candidates]
  );
  const highestSkill = useMemo(
    () => Math.max(...candidates.map((c) => c.skill_match_score)),
    [candidates]
  );
  const highestExp = useMemo(
    () => Math.max(...candidates.map((c) => c.work_experience_score)),
    [candidates]
  );

  // Skill sets analysis
  const skillAnalysis = useMemo(() => {
    if (candidates.length < 2) return null;
    const allMatching = candidates.map((c) => new Set(c.matching_skills));

    // Intersection: skills present in all candidates
    const sharedSkills = candidates[0].matching_skills.filter((skill) =>
      allMatching.every((set) => set.has(skill))
    );

    // Unique skills for each candidate
    const uniqueSkills = candidates.map((c, idx) => {
      const otherSets = allMatching.filter((_, i) => i !== idx);
      return c.matching_skills.filter((skill) =>
        otherSets.every((otherSet) => !otherSet.has(skill))
      );
    });

    return { sharedSkills, uniqueSkills };
  }, [candidates]);

  // AI Trade-off synthesis between Candidate 1 and Candidate 2
  const tradeOffSummary = useMemo(() => {
    if (candidates.length < 2) return null;
    const [c1, c2] = candidates;
    const name1 = c1.filename || `Candidate A (${c1.candidate_id.slice(0, 6)})`;
    const name2 = c2.filename || `Candidate B (${c2.candidate_id.slice(0, 6)})`;

    const skillDiff = c1.skill_match_score - c2.skill_match_score;
    const expDiff = c1.work_experience_score - c2.work_experience_score;
    const overallDiff = c1.overall_score - c2.overall_score;

    const points: string[] = [];

    if (Math.abs(overallDiff) >= 1) {
      const leader = overallDiff > 0 ? name1 : name2;
      const margin = Math.abs(overallDiff).toFixed(1);
      points.push(`Overall Leader: ${leader} leads by ${margin} points.`);
    } else {
      points.push("Overall: Both candidates hold an exceptionally close composite score (under 1 point difference).");
    }

    if (Math.abs(skillDiff) >= 2) {
      const skillLeader = skillDiff > 0 ? name1 : name2;
      const diffVal = Math.abs(skillDiff).toFixed(1);
      points.push(`Technical Skills: ${skillLeader} demonstrates a +${diffVal} advantage in rubric skill matching.`);
    }

    if (Math.abs(expDiff) >= 2) {
      const expLeader = expDiff > 0 ? name1 : name2;
      const diffVal = Math.abs(expDiff).toFixed(1);
      points.push(`Industry Experience: ${expLeader} holds a +${diffVal} lead in verified career tenure.`);
    }

    // Recommendation conclusion
    let recommendation = "";
    if (skillDiff > 5 && expDiff < -5) {
      recommendation = `Trade-off: ${name1} is the stronger hands-on specialist for technical depth, while ${name2} brings seasoned domain tenure and leadership.`;
    } else if (skillDiff < -5 && expDiff > 5) {
      recommendation = `Trade-off: ${name2} brings deeper immediate rubric skills, whereas ${name1} provides broader career background.`;
    } else if (overallDiff > 5) {
      recommendation = `Recommendation: ${name1} demonstrates superior alignment across both technical skill match and experience.`;
    } else if (overallDiff < -5) {
      recommendation = `Recommendation: ${name2} demonstrates superior alignment across both technical skill match and experience.`;
    } else {
      recommendation = "Recommendation: Balanced match. Evaluate unique skill strengths below and schedule team interviews to assess cultural fit.";
    }

    return { points, recommendation };
  }, [candidates]);

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(21, 2, 2, 0.55)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-modal-title"
    >
      <div
        className="comparison-card"
        style={{
          background: "var(--surface, #FFFFFF)",
          border: "1px solid var(--color-linen, #EBEAEA)",
          borderRadius: "16px",
          width: "min(100%, 960px)",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "28px 32px",
          boxShadow: "var(--shadow-lg)",
          color: "var(--ink, #150202)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            borderBottom: "1px solid var(--color-linen, #EBEAEA)",
            paddingBottom: "18px",
            marginBottom: "24px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>⚔️</span>
              <h2
                id="comparison-modal-title"
                style={{
                  margin: 0,
                  fontSize: "1.35rem",
                  fontWeight: 750,
                  color: "var(--ink, #150202)",
                }}
              >
                Candidate Head-to-Head Comparison
              </h2>
            </div>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "0.86rem",
                color: "var(--muted, #606060)",
              }}
            >
              Side-by-side analysis of {candidates.length} candidates across rubric criteria, skill overlap, and trade-offs.
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close comparison dialog"
            style={{
              background: "var(--surface-soft, #FAFAFA)",
              border: "1px solid var(--color-grey-1, #C6C6C6)",
              borderRadius: "8px",
              padding: "6px 12px",
              cursor: "pointer",
              fontWeight: 700,
              color: "var(--ink, #150202)",
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Candidate Headers Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${candidates.length}, minmax(0, 1fr))`,
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {candidates.map((c, i) => {
            const isLeader = c.overall_score === highestOverall;
            return (
              <div
                key={c.candidate_id}
                style={{
                  background: isLeader
                    ? "var(--accent-soft, #EEEBFA)"
                    : "var(--surface-soft, #FAFAFA)",
                  border: isLeader
                    ? "1.5px solid var(--primary-1, #4729A3)"
                    : "1px solid var(--color-linen, #EBEAEA)",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  position: "relative",
                }}
              >
                {isLeader && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-10px",
                      right: "12px",
                      background: "var(--primary-1, #4729A3)",
                      color: "#FFFFFF",
                      fontSize: "0.68rem",
                      fontWeight: 750,
                      padding: "2px 8px",
                      borderRadius: "99px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    ★ Top Scorer
                  </span>
                )}
                <div style={{ fontSize: "0.78rem", color: "var(--muted, #606060)", fontWeight: 600 }}>
                  Candidate #{i + 1}
                </div>
                <h3
                  style={{
                    margin: "4px 0 8px",
                    fontSize: "1.02rem",
                    fontWeight: 700,
                    wordBreak: "break-all",
                  }}
                >
                  {c.filename || `ID: ${c.candidate_id.slice(0, 8)}…`}
                </h3>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "12px" }}>
                  <span
                    style={{
                      fontSize: "1.6rem",
                      fontWeight: 800,
                      color: "var(--primary-1, #4729A3)",
                    }}
                  >
                    {c.overall_score.toFixed(1)}
                  </span>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted, #606060)" }}>/ 100 overall</span>
                </div>
                <a
                  href={`/api/jobs/${batchId}/candidates/${c.candidate_id}/resume`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ghost"
                  style={{
                    display: "inline-block",
                    width: "100%",
                    textAlign: "center",
                    fontSize: "0.78rem",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    background: "var(--surface, #FFFFFF)",
                    border: "1px solid var(--color-grey-1, #C6C6C6)",
                    color: "var(--ink, #150202)",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  📄 Inspect Resume PDF
                </a>
              </div>
            );
          })}
        </div>

        {/* Metric Comparison Gauges */}
        <div
          style={{
            background: "var(--surface-soft, #FAFAFA)",
            border: "1px solid var(--color-linen, #EBEAEA)",
            borderRadius: "12px",
            padding: "20px 22px",
            marginBottom: "24px",
          }}
        >
          <h4
            style={{
              margin: "0 0 16px",
              fontSize: "0.94rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--muted, #606060)",
            }}
          >
            Pillar-by-Pillar Benchmark
          </h4>

          {/* Metric 1: Skill Match */}
          <div style={{ marginBottom: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Skill Match Score</span>
              <span style={{ fontSize: "0.78rem", color: "var(--muted, #606060)" }}>Rubric Keyword & Capability Alignment</span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${candidates.length}, minmax(0, 1fr))`,
                gap: "16px",
              }}
            >
              {candidates.map((c, i) => (
                <div key={c.candidate_id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
                    <span>Candidate #{i + 1}</span>
                    <strong style={{ color: c.skill_match_score === highestSkill ? "var(--color-liberty-green, #198754)" : "inherit" }}>
                      {c.skill_match_score.toFixed(1)}% {c.skill_match_score === highestSkill && "✓"}
                    </strong>
                  </div>
                  <div style={{ height: "8px", background: "var(--color-linen, #EBEAEA)", borderRadius: "99px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, c.skill_match_score))}%`,
                        height: "100%",
                        background: c.skill_match_score === highestSkill ? "var(--primary-1, #4729A3)" : "var(--primary-2, #8B70DB)",
                        borderRadius: "99px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metric 2: Work Experience */}
          <div style={{ marginBottom: "18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Work Experience Score</span>
              <span style={{ fontSize: "0.78rem", color: "var(--muted, #606060)" }}>Career Tenure & Seniority Fit</span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${candidates.length}, minmax(0, 1fr))`,
                gap: "16px",
              }}
            >
              {candidates.map((c, i) => (
                <div key={c.candidate_id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
                    <span>Candidate #{i + 1}</span>
                    <strong style={{ color: c.work_experience_score === highestExp ? "var(--color-liberty-green, #198754)" : "inherit" }}>
                      {c.work_experience_score.toFixed(1)}% {c.work_experience_score === highestExp && "✓"}
                    </strong>
                  </div>
                  <div style={{ height: "8px", background: "var(--color-linen, #EBEAEA)", borderRadius: "99px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(0, c.work_experience_score))}%`,
                        height: "100%",
                        background: c.work_experience_score === highestExp ? "var(--primary-1, #4729A3)" : "var(--primary-2, #8B70DB)",
                        borderRadius: "99px",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metric 3: Semantic Cosine Relevancy */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Semantic Text Relevance</span>
              <span style={{ fontSize: "0.78rem", color: "var(--muted, #606060)" }}>Stage-1 Vector Cosine Similarity</span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${candidates.length}, minmax(0, 1fr))`,
                gap: "16px",
              }}
            >
              {candidates.map((c, i) => {
                const simPct = (c.cosine_similarity_score * 100);
                return (
                  <div key={c.candidate_id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "4px" }}>
                      <span>Candidate #{i + 1}</span>
                      <strong>{c.cosine_similarity_score.toFixed(3)} ({simPct.toFixed(1)}%)</strong>
                    </div>
                    <div style={{ height: "8px", background: "var(--color-linen, #EBEAEA)", borderRadius: "99px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(0, simPct))}%`,
                          height: "100%",
                          background: "var(--primary-2, #8B70DB)",
                          borderRadius: "99px",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Trade-off & Decision Synthesis Card */}
        {tradeOffSummary && (
          <div
            style={{
              background: "var(--surface, #FFFFFF)",
              border: "1px solid var(--accent-border, #BDADEB)",
              borderRadius: "12px",
              padding: "18px 20px",
              marginBottom: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
              <span style={{ fontSize: "1.1rem" }}>💡</span>
              <h4 style={{ margin: 0, fontSize: "0.96rem", fontWeight: 750, color: "var(--primary-1, #4729A3)" }}>
                AI Decision Synthesis & Trade-Off Analysis
              </h4>
            </div>
            <ul style={{ margin: "0 0 12px", paddingLeft: "20px", fontSize: "0.85rem", lineHeight: 1.55 }}>
              {tradeOffSummary.points.map((pt, idx) => (
                <li key={idx} style={{ marginBottom: "4px" }}>
                  {pt}
                </li>
              ))}
            </ul>
            <div
              style={{
                background: "var(--accent-soft, #EEEBFA)",
                borderLeft: "3px solid var(--primary-1, #4729A3)",
                padding: "10px 14px",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--ink, #150202)",
              }}
            >
              {tradeOffSummary.recommendation}
            </div>
          </div>
        )}

        {/* Skill Overlap Matrix */}
        <div style={{ marginBottom: "20px" }}>
          <h4
            style={{
              margin: "0 0 14px",
              fontSize: "0.94rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--muted, #606060)",
            }}
          >
            Skill Overlap & Differential Analysis
          </h4>

          {/* Shared Skills */}
          {skillAnalysis && skillAnalysis.sharedSkills.length > 0 && (
            <div style={{ marginBottom: "16px", padding: "12px 14px", background: "var(--good-soft, #E8F5E9)", borderRadius: "8px", border: "1px solid var(--color-liberty-green, #198754)" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-liberty-green, #198754)", marginBottom: "8px" }}>
                ✓ Shared Competencies (Present in All Compared Candidates):
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {skillAnalysis.sharedSkills.map((skill, sIdx) => (
                  <span
                    key={sIdx}
                    style={{
                      background: "var(--surface, #FFFFFF)",
                      color: "var(--color-liberty-green, #198754)",
                      border: "1px solid var(--color-liberty-green, #198754)",
                      fontSize: "0.76rem",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    ✓ {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Unique Skills per Candidate */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${candidates.length}, minmax(0, 1fr))`,
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            {candidates.map((c, i) => {
              const uniqueList = skillAnalysis ? skillAnalysis.uniqueSkills[i] : [];
              return (
                <div
                  key={c.candidate_id}
                  style={{
                    background: "var(--surface-soft, #FAFAFA)",
                    border: "1px solid var(--color-linen, #EBEAEA)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, marginBottom: "8px", color: "var(--primary-1, #4729A3)" }}>
                    ★ Unique to Candidate #{i + 1}:
                  </div>
                  {uniqueList.length === 0 ? (
                    <span style={{ fontSize: "0.78rem", color: "var(--muted, #606060)" }}>No unique skills (all overlap with competitors).</span>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {uniqueList.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          style={{
                            background: "var(--accent-soft, #EEEBFA)",
                            color: "var(--primary-1, #4729A3)",
                            border: "1px solid var(--accent-border, #BDADEB)",
                            fontSize: "0.74rem",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          +{skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Missing Skills */}
                  <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--color-linen, #EBEAEA)" }}>
                    <div style={{ fontSize: "0.78rem", fontWeight: 700, marginBottom: "6px", color: "var(--color-coral-red, #DC3545)" }}>
                      Missing Rubric Requirements:
                    </div>
                    {c.missing_skills.length === 0 ? (
                      <span style={{ fontSize: "0.76rem", color: "var(--color-liberty-green, #198754)", fontWeight: 600 }}>Zero gaps! All required skills matched.</span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {c.missing_skills.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            style={{
                              background: "var(--bad-soft, #FDE8E8)",
                              color: "var(--color-coral-red, #DC3545)",
                              fontSize: "0.72rem",
                              padding: "1px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            ✕ {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Verdict Summaries */}
        <div style={{ marginBottom: "20px" }}>
          <h4
            style={{
              margin: "0 0 12px",
              fontSize: "0.94rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--muted, #606060)",
            }}
          >
            Detailed Evaluator Verdicts
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${candidates.length}, minmax(0, 1fr))`,
              gap: "16px",
            }}
          >
            {candidates.map((c, i) => (
              <div
                key={c.candidate_id}
                style={{
                  background: "var(--surface-soft, #FAFAFA)",
                  border: "1px solid var(--color-linen, #EBEAEA)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  fontSize: "0.82rem",
                  lineHeight: 1.55,
                  color: "var(--ink, #150202)",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "6px", color: "var(--muted, #606060)" }}>
                  Candidate #{i + 1} Assessment:
                </div>
                <p style={{ margin: 0 }}>{c.verdict_summary || "No detailed verdict available."}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "14px", borderTop: "1px solid var(--color-linen, #EBEAEA)" }}>
          <button
            type="button"
            className="primary"
            onClick={onClose}
            style={{ fontSize: "0.88rem", padding: "8px 20px" }}
          >
            Done Comparing
          </button>
        </div>
      </div>
    </div>
  );
}
