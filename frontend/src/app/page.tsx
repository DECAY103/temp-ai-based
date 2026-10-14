import Link from "next/link";

export default function Home() {
  const features = [
    {
      title: "Secure Ingestion & Sanitisation",
      description:
        "Validates authentic binary PDF/ZIP signatures, extracts structured document text, anonymises personal identifiers to eliminate demographic bias, and screens for prompt injection or hidden-text exploits.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
    },
    {
      title: "Two-Stage AI Evaluation",
      description:
        "Combines fast local transformer vector similarity pre-filtering with deep structured LLM evaluation against recruiter rubrics.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
    },
    {
      title: "Rubric Scoring & Gap Analysis",
      description:
        "Generates objective sub-scores for technical skills and career tenure, itemising verified competencies alongside missing requirements.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
  ];

  return (
    <main className="shell" style={{ maxWidth: "1160px", padding: "48px 24px 80px" }}>
      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section
        style={{
          textAlign: "center",
          maxWidth: "760px",
          margin: "0 auto 52px",
        }}
        aria-labelledby="project-title"
      >
        <p
          className="eyebrow"
          style={{
            marginBottom: "10px",
            fontSize: "0.82rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--primary-1, #4729A3)",
            fontWeight: 700,
          }}
        >
          Software Engineering Project
        </p>
        <h1
          id="project-title"
          style={{
            margin: "0 0 16px",
            fontSize: "clamp(2.2rem, 5vw, 3.2rem)",
            fontWeight: 800,
            color: "var(--ink, #150202)",
            letterSpacing: "-0.03em",
            lineHeight: 1.15,
          }}
        >
          AI-based Resume Screening
        </h1>
        <p
          style={{
            margin: "0 auto 28px",
            fontSize: "1.05rem",
            color: "var(--muted, #606060)",
            lineHeight: 1.6,
            maxWidth: "600px",
          }}
        >
          An automated workspace for validating resumes, anonymising applicant data,
          and evaluating candidate qualifications against structured job rubrics.
        </p>
        <Link
          className="primary"
          href="/auth/login"
          style={{
            fontSize: "0.95rem",
            padding: "12px 28px",
            borderRadius: "8px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: 650,
            textDecoration: "none",
          }}
        >
          <span>Open Screening Portal</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </section>

      {/* ── Features Section (3 Core Modules) ────────────────────────────── */}
      <section style={{ marginBottom: "56px" }} aria-labelledby="features-heading">
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h2
            id="features-heading"
            style={{
              margin: "0 0 8px",
              fontSize: "1.65rem",
              fontWeight: 700,
              color: "var(--ink, #150202)",
              letterSpacing: "-0.02em",
            }}
          >
            Platform Features
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "0.95rem",
              color: "var(--muted, #606060)",
            }}
          >
            Core pipeline capabilities across resume ingestion, two-stage AI evaluation, and rubric scoring.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px",
          }}
        >
          {features.map((feature, idx) => (
            <div
              key={idx}
              style={{
                background: "var(--surface, #FFFFFF)",
                border: "1px solid var(--color-linen, #EBEAEA)",
                borderRadius: "12px",
                padding: "26px 28px",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "var(--accent-soft, #EEEBFA)",
                  color: "var(--primary-1, #4729A3)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                  flexShrink: 0,
                }}
              >
                {feature.icon}
              </div>
              <h3
                style={{
                  margin: "0 0 10px",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "var(--ink, #150202)",
                  letterSpacing: "-0.01em",
                }}
              >
                {feature.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.93rem",
                  color: "var(--muted, #606060)",
                  lineHeight: 1.6,
                }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Academic Project Details ─────────────────────────────────────── */}
      <section
        style={{
          background: "var(--surface-soft, #FAFAFA)",
          border: "1px solid var(--color-linen, #EBEAEA)",
          borderRadius: "14px",
          padding: "30px 36px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "24px",
          alignItems: "start",
        }}
        aria-labelledby="project-details-heading"
      >
        <div>
          <h2
            id="project-details-heading"
            style={{
              margin: "0 0 12px",
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--primary-1, #4729A3)",
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
            }}
          >
            Contributors
          </h2>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "grid",
              gap: "8px",
              fontSize: "0.95rem",
              color: "var(--ink, #150202)",
            }}
          >
            <li>
              <strong>Harsha B</strong> <span style={{ color: "var(--muted, #606060)" }}>&mdash; 241IT031</span>
            </li>
            <li>
              <strong>Harshith R</strong> <span style={{ color: "var(--muted, #606060)" }}>&mdash; 241IT032</span>
            </li>
            <li>
              <strong>Rohith Marthula</strong> <span style={{ color: "var(--muted, #606060)" }}>&mdash; 241IT044</span>
            </li>
          </ul>
        </div>

        <div>
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--primary-1, #4729A3)",
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
            }}
          >
            Course Instructor
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "0.95rem",
              color: "var(--ink, #150202)",
              fontWeight: 650,
            }}
          >
            Prof. Jaidhar C D
          </p>
        </div>
      </section>
    </main>
  );
}
