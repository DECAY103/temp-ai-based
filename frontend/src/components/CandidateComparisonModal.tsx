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

    const sharedSkills = candidates[0].matching_skills.filter((skill) =>
      allMatching.every((set) => set.has(skill))
    );

    const uniqueSkills = candidates.map((c, idx) => {
      const otherSets = allMatching.filter((_, i) => i !== idx);
      return c.matching_skills.filter((skill) =>
        otherSets.every((otherSet) => !otherSet.has(skill))
      );
    });

    return { sharedSkills, uniqueSkills };
  }, [candidates]);

  // Comparative Trade-off Analysis
  const tradeOffSummary = useMemo(() => {
    if (candidates.length < 2) return null;
    const [c1, c2] = candidates;
    const name1 = c1.filename || `Candidate 1 (${c1.candidate_id.slice(0, 6)})`;
    const name2 = c2.filename || `Candidate 2 (${c2.candidate_id.slice(0, 6)})`;

    const skillDiff = c1.skill_match_score - c2.skill_match_score;
    const expDiff = c1.work_experience_score - c2.work_experience_score;
    const overallDiff = c1.overall_score - c2.overall_score;

    const points: string[] = [];

    if (Math.abs(overallDiff) >= 1) {
      const leader = overallDiff > 0 ? name1 : name2;
      const margin = Math.abs(overallDiff).toFixed(1);
      points.push(`Overall Rating: ${leader} holds a ${margin} point lead in composite evaluation.`);
    } else {
      points.push("Overall Rating: Both candidates possess equivalent composite ratings (within 1.0 point margin).");
    }

    if (Math.abs(skillDiff) >= 2) {
      const skillLeader = skillDiff > 0 ? name1 : name2;
      const diffVal = Math.abs(skillDiff).toFixed(1);
      points.push(`Technical Alignment: ${skillLeader} leads by +${diffVal}% on verified rubric skills.`);
    }

    if (Math.abs(expDiff) >= 2) {
      const expLeader = expDiff > 0 ? name1 : name2;
      const diffVal = Math.abs(expDiff).toFixed(1);
      points.push(`Experience Depth: ${expLeader} leads by +${diffVal}% in career tenure and seniority.`);
    }

    let recommendation = "";
    if (skillDiff > 5 && expDiff < -5) {
      recommendation = `Trade-Off Summary: ${name1} delivers higher hands-on keyword match for immediate execution, whereas ${name2} brings senior career tenure and domain longevity.`;
    } else if (skillDiff < -5 && expDiff > 5) {
      recommendation = `Trade-Off Summary: ${name2} satisfies more specific criteria keywords, while ${name1} offers wider seniority and background versatility.`;
    } else if (overallDiff > 5) {
      recommendation = `Recommendation: ${name1} demonstrates superior overall alignment across both core skill requirements and career track record.`;
    } else if (overallDiff < -5) {
      recommendation = `Recommendation: ${name2} demonstrates superior overall alignment across both core skill requirements and career track record.`;
    } else {
      recommendation = "Recommendation: Closely matched candidate profiles. Evaluate specific distinct advantages and project depth during structured technical interviews.";
    }

    return { points, recommendation };
  }, [candidates]);

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(41, 19, 108, 0.45)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-modal-title"
    >
      <div
        className="comparison-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="comparison-header">
          <div>
            <h2
              id="comparison-modal-title"
              style={{
                margin: "0 0 6px",
                fontSize: "1.55rem",
                fontWeight: 700,
                color: "var(--ink, #29136C)",
                letterSpacing: "-0.02em",
              }}
            >
              Candidate Head-to-Head Comparison
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "0.95rem",
                color: "var(--muted, #4729A3)",
                lineHeight: 1.5,
              }}
            >
              Side-by-side comparative benchmarking for {candidates.length} candidates across composite scores, core pillars, and skill differentials.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            aria-label="Close comparison modal"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--surface-soft, #EEEBFA)",
              border: "1px solid var(--color-grey-1, #BDADEB)",
              borderRadius: "8px",
              padding: "9px 16px",
              cursor: "pointer",
              fontWeight: 650,
              fontSize: "0.9rem",
              color: "var(--ink, #29136C)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Close</span>
          </button>
        </div>

        {/* Candidate Profile Cards Grid */}
        <div
          className="comparison-grid"
          style={{ "--cols": candidates.length, marginBottom: "32px" } as React.CSSProperties}
        >
          {candidates.map((c, i) => {
            const isLeader = c.overall_score === highestOverall;
            return (
              <div
                key={c.candidate_id}
                style={{
                  background: isLeader ? "var(--accent-soft, #EEEBFA)" : "var(--surface-soft, #EEEBFA)",
                  border: isLeader ? "1.5px solid var(--primary-1, #4729A3)" : "1px solid var(--color-grey-1, #BDADEB)",
                  borderRadius: "12px",
                  padding: "22px 24px",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                {isLeader && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-12px",
                      right: "16px",
                      background: "var(--primary-1, #4729A3)",
                      color: "#FFFFFF",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      padding: "3px 12px",
                      borderRadius: "99px",
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                    }}
                  >
                    Top Score
                  </span>
                )}

                <div>
                  <div style={{ fontSize: "0.85rem", color: "var(--muted, #4729A3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Candidate {i + 1}
                  </div>
                  <h3
                    style={{
                      margin: "6px 0 12px",
                      fontSize: "1.15rem",
                      fontWeight: 700,
                      color: "var(--ink, #29136C)",
                      wordBreak: "break-all",
                    }}
                  >
                    {c.filename || `ID: ${c.candidate_id.slice(0, 8)}`}
                  </h3>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "16px" }}>
                    <span
                      style={{
                        fontSize: "2.1rem",
                        fontWeight: 800,
                        color: "var(--primary-1, #4729A3)",
                        fontVariantNumeric: "tabular-nums",
                        lineHeight: 1,
                      }}
                    >
                      {c.overall_score.toFixed(1)}
                    </span>
                    <span style={{ fontSize: "0.92rem", color: "var(--muted, #4729A3)", fontWeight: 500 }}>
                      / 100 overall
                    </span>
                  </div>
                </div>

                <a
                  href={`/api/jobs/${batchId}/candidates/${c.candidate_id}/resume`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "100%",
                    fontSize: "0.88rem",
                    padding: "9px 14px",
                    borderRadius: "8px",
                    background: "var(--surface, #FFFFFF)",
                    border: "1px solid var(--color-grey-1, #BDADEB)",
                    color: "var(--ink, #29136C)",
                    textDecoration: "none",
                    fontWeight: 650,
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
              </div>
            );
          })}
        </div>

        {/* Pillar Benchmark Section */}
        <div
          style={{
            background: "var(--surface-soft, #EEEBFA)",
            border: "1px solid var(--color-linen, #BDADEB)",
            borderRadius: "12px",
            padding: "24px 28px",
            marginBottom: "32px",
          }}
        >
          <h4
            style={{
              margin: "0 0 20px",
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "var(--ink, #29136C)",
            }}
          >
            Pillar-by-Pillar Benchmark
          </h4>

          {/* Skill Match */}
          <div style={{ marginBottom: "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink, #29136C)" }}>Skill Match</span>
              <span style={{ fontSize: "0.86rem", color: "var(--muted, #4729A3)" }}>Rubric Keyword Alignment</span>
            </div>
            <div
              className="comparison-grid"
              style={{ "--cols": candidates.length } as React.CSSProperties}
            >
              {candidates.map((c, i) => (
                <div key={c.candidate_id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "6px" }}>
                    <span style={{ color: "var(--muted, #4729A3)", fontWeight: 500 }}>Candidate {i + 1}</span>
                    <strong style={{ fontVariantNumeric: "tabular-nums", color: c.skill_match_score === highestSkill ? "var(--color-liberty-green, #4729A3)" : "inherit" }}>
                      {c.skill_match_score.toFixed(1)}% {c.skill_match_score === highestSkill && "(Leader)"}
                    </strong>
                  </div>
                  <div style={{ height: "9px", background: "var(--color-linen, #BDADEB)", borderRadius: "99px", overflow: "hidden" }}>
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

          {/* Work Experience */}
          <div style={{ marginBottom: "22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink, #29136C)" }}>Work Experience</span>
              <span style={{ fontSize: "0.86rem", color: "var(--muted, #4729A3)" }}>Tenure & Seniority Match</span>
            </div>
            <div
              className="comparison-grid"
              style={{ "--cols": candidates.length } as React.CSSProperties}
            >
              {candidates.map((c, i) => (
                <div key={c.candidate_id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "6px" }}>
                    <span style={{ color: "var(--muted, #4729A3)", fontWeight: 500 }}>Candidate {i + 1}</span>
                    <strong style={{ fontVariantNumeric: "tabular-nums", color: c.work_experience_score === highestExp ? "var(--color-liberty-green, #4729A3)" : "inherit" }}>
                      {c.work_experience_score.toFixed(1)}% {c.work_experience_score === highestExp && "(Leader)"}
                    </strong>
                  </div>
                  <div style={{ height: "9px", background: "var(--color-linen, #BDADEB)", borderRadius: "99px", overflow: "hidden" }}>
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

          {/* Semantic Cosine Relevance */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ink, #29136C)" }}>Semantic Vector Relevance</span>
              <span style={{ fontSize: "0.86rem", color: "var(--muted, #4729A3)" }}>Stage-1 Vector Cosine Similarity</span>
            </div>
            <div
              className="comparison-grid"
              style={{ "--cols": candidates.length } as React.CSSProperties}
            >
              {candidates.map((c, i) => {
                const simPct = c.cosine_similarity_score * 100;
                return (
                  <div key={c.candidate_id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem", marginBottom: "6px" }}>
                      <span style={{ color: "var(--muted, #4729A3)", fontWeight: 500 }}>Candidate {i + 1}</span>
                      <strong style={{ fontVariantNumeric: "tabular-nums" }}>
                        {c.cosine_similarity_score.toFixed(3)} ({simPct.toFixed(1)}%)
                      </strong>
                    </div>
                    <div style={{ height: "9px", background: "var(--color-linen, #BDADEB)", borderRadius: "99px", overflow: "hidden" }}>
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

        {/* Comparative Trade-off Analysis */}
        {tradeOffSummary && (
          <div
            style={{
              background: "var(--surface, #FFFFFF)",
              border: "1px solid var(--accent-border, #BDADEB)",
              borderRadius: "12px",
              padding: "24px 28px",
              marginBottom: "32px",
            }}
          >
            <h4
              style={{
                margin: "0 0 14px",
                fontSize: "1.05rem",
                fontWeight: 700,
                color: "var(--primary-1, #4729A3)",
              }}
            >
              Comparative Evaluation Synthesis
            </h4>
            <ul style={{ margin: "0 0 16px", paddingLeft: "22px", fontSize: "0.94rem", lineHeight: 1.65, color: "var(--ink, #29136C)" }}>
              {tradeOffSummary.points.map((pt, idx) => (
                <li key={idx} style={{ marginBottom: "6px" }}>
                  {pt}
                </li>
              ))}
            </ul>
            <div
              style={{
                background: "var(--accent-soft, #EEEBFA)",
                border: "1px solid var(--accent-border, #BDADEB)",
                padding: "14px 18px",
                borderRadius: "6px",
                fontSize: "0.93rem",
                fontWeight: 600,
                lineHeight: 1.55,
                color: "var(--ink, #29136C)",
              }}
            >
              {tradeOffSummary.recommendation}
            </div>
          </div>
        )}

        {/* Skill Overlap & Differential Matrix */}
        <div style={{ marginBottom: "32px" }}>
          <h4
            style={{
              margin: "0 0 18px",
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "var(--ink, #29136C)",
            }}
          >
            Skill Overlap & Differential Matrix
          </h4>

          {/* Shared Competencies */}
          {skillAnalysis && skillAnalysis.sharedSkills.length > 0 && (
            <div
              style={{
                marginBottom: "20px",
                padding: "16px 20px",
                background: "var(--good-soft, #EEEBFA)",
                borderRadius: "10px",
                border: "1px solid var(--color-liberty-green, #4729A3)",
              }}
            >
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-liberty-green, #4729A3)", marginBottom: "10px" }}>
                Common Competencies (Verified across all selected profiles):
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {skillAnalysis.sharedSkills.map((skill, sIdx) => (
                  <span
                    key={sIdx}
                    style={{
                      background: "var(--surface, #FFFFFF)",
                      color: "var(--color-liberty-green, #4729A3)",
                      border: "1px solid var(--color-liberty-green, #4729A3)",
                      fontSize: "0.85rem",
                      fontWeight: 650,
                      padding: "4px 12px",
                      borderRadius: "6px",
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Unique & Missing Skills per Candidate */}
          <div
            className="comparison-grid"
            style={{ "--cols": candidates.length } as React.CSSProperties}
          >
            {candidates.map((c, i) => {
              const uniqueList = skillAnalysis ? skillAnalysis.uniqueSkills[i] : [];
              return (
                <div
                  key={c.candidate_id}
                  style={{
                    background: "var(--surface-soft, #EEEBFA)",
                    border: "1px solid var(--color-linen, #BDADEB)",
                    borderRadius: "10px",
                    padding: "18px 20px",
                  }}
                >
                  <div style={{ fontSize: "0.92rem", fontWeight: 700, marginBottom: "10px", color: "var(--primary-1, #4729A3)" }}>
                    Distinct Advantages (Candidate {i + 1}):
                  </div>
                  {uniqueList.length === 0 ? (
                    <span style={{ fontSize: "0.86rem", color: "var(--muted, #4729A3)" }}>
                      No unique skills (all overlap with compared profiles).
                    </span>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {uniqueList.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          style={{
                            background: "var(--accent-soft, #EEEBFA)",
                            color: "var(--primary-1, #4729A3)",
                            border: "1px solid var(--accent-border, #BDADEB)",
                            fontSize: "0.84rem",
                            fontWeight: 650,
                            padding: "4px 12px",
                            borderRadius: "6px",
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Missing Rubric Skills */}
                  <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--color-linen, #BDADEB)" }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700, marginBottom: "10px", color: "var(--color-coral-red, #29136C)" }}>
                      Missing Rubric Requirements:
                    </div>
                    {c.missing_skills.length === 0 ? (
                      <span style={{ fontSize: "0.86rem", color: "var(--color-liberty-green, #4729A3)", fontWeight: 650 }}>
                        All mandatory requirements satisfied.
                      </span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {c.missing_skills.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            style={{
                              background: "var(--bad-soft, #EEEBFA)",
                              color: "var(--color-coral-red, #29136C)",
                              border: "1px solid var(--color-coral-red, #29136C)",
                              fontSize: "0.82rem",
                              fontWeight: 650,
                              padding: "4px 10px",
                              borderRadius: "6px",
                            }}
                          >
                            {skill}
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

        {/* Evaluator Verdict Summaries */}
        <div style={{ marginBottom: "32px" }}>
          <h4
            style={{
              margin: "0 0 16px",
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "var(--ink, #29136C)",
            }}
          >
            Evaluator Verdict Summaries
          </h4>
          <div
            className="comparison-grid"
            style={{ "--cols": candidates.length } as React.CSSProperties}
          >
            {candidates.map((c, i) => (
              <div
                key={c.candidate_id}
                style={{
                  background: "var(--surface-soft, #EEEBFA)",
                  border: "1px solid var(--color-linen, #BDADEB)",
                  borderRadius: "10px",
                  padding: "18px 20px",
                  fontSize: "0.92rem",
                  lineHeight: 1.65,
                  color: "var(--ink, #29136C)",
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: "8px", color: "var(--muted, #4729A3)", fontSize: "0.86rem" }}>
                  Candidate {i + 1} Assessment:
                </div>
                <p style={{ margin: 0 }}>{c.verdict_summary || "No specific verdict recorded."}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="comparison-footer">
          <button
            type="button"
            className="primary"
            onClick={onClose}
            style={{ fontSize: "0.95rem", padding: "11px 26px", borderRadius: "8px" }}
          >
            Done Comparing
          </button>
        </div>
      </div>
    </div>
  );
}
