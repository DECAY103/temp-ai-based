import Link from "next/link";

export default function Home() {
  const features = [
    {
      title: "Binary File Validation",
      description:
        "Inspects authentic binary magic-byte signatures for PDF and ZIP files, blocking decompression bombs, path traversal, and corrupted archives.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
      ),
    },
    {
      title: "Document Parsing & Text Extraction",
      description:
        "Extracts clean, structured plain text from multi-column PDFs with layout preservation, Unicode normalisation, and empty-page detection.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      ),
    },
    {
      title: "PII Anonymisation",
      description:
        "Automatically identifies and masks applicant names, emails, phone numbers, and addresses using NER and regex to eliminate demographic bias.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      ),
    },
    {
      title: "Adversarial & Injection Defense",
      description:
        "Scans resumes for system prompt injection attacks, hidden white-on-white text, zero-font keyword stuffing, and non-printable Unicode exploits.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="m9 8 4 4-4 4" />
          <line x1="14" y1="16" x2="16" y2="16" />
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
    {
      title: "Head-to-Head Candidate Comparison",
      description:
        "Multi-profile comparative matrix benchmarking candidates side-by-side with pillar scores, shared competencies, and distinct advantages.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <line x1="12" y1="3" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      title: "Role-Based Access & 2FA Security",
      description:
        "Role-isolated workspaces for candidates, recruiters, and admins protected by JWT sessions and two-factor authentication via TOTP and Email.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    {
      title: "Forensic Audit Reporting",
      description:
        "Compiles downloadable, accessible PDF evaluation reports containing candidate scoring breakdowns, rubric alignment, and audit metadata.",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
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
          margin: "0 auto 56px",
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

      {/* ── Features Section ─────────────────────────────────────────────── */}
      <section style={{ marginBottom: "56px" }} aria-labelledby="features-heading">
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
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
            Core functional capabilities across ingestion, sanitisation, evaluation, and candidate comparison.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
          }}
        >
          {features.map((feature, idx) => (
            <div
              key={idx}
              style={{
                background: "var(--surface, #FFFFFF)",
                border: "1px solid var(--color-linen, #EBEAEA)",
                borderRadius: "12px",
                padding: "24px 26px",
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
                  margin: "0 0 8px",
                  fontSize: "1.08rem",
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
                  fontSize: "0.92rem",
                  color: "var(--muted, #606060)",
                  lineHeight: 1.55,
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
