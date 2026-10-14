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
    <main className="shell home-shell">
      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="home-hero" aria-labelledby="project-title">
        <p className="eyebrow home-hero__eyebrow">
          Software Engineering Project
        </p>
        <h1 id="project-title" className="home-hero__title">
          AI-based Resume Screening
        </h1>
        <p className="home-hero__desc">
          An automated workspace for validating resumes, anonymising applicant data,
          and evaluating candidate qualifications against structured job rubrics.
        </p>
        <div className="home-hero__cta-wrap">
          <Link className="primary home-hero__cta" href="/auth/login">
            <span>Open Screening Portal</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Features Section (3 Core Modules) ────────────────────────────── */}
      <section className="home-features-section" aria-labelledby="features-heading">
        <div className="home-section-header">
          <h2 id="features-heading" className="home-section-title">
            Platform Features
          </h2>
          <p className="home-section-subtitle">
            Core pipeline capabilities across resume ingestion, two-stage AI evaluation, and rubric scoring.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, idx) => (
            <div key={idx} className="feature-card">
              <div className="feature-card__icon-wrap">
                {feature.icon}
              </div>
              <h3 className="feature-card__title">
                {feature.title}
              </h3>
              <p className="feature-card__desc">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Academic Project Details ─────────────────────────────────────── */}
      <section className="academic-details-card" aria-labelledby="project-details-heading">
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
              color: "var(--ink, #29136C)",
            }}
          >
            <li>
              <strong>Harsha B</strong> <span style={{ color: "var(--muted, #4729A3)" }}>&mdash; 241IT031</span>
            </li>
            <li>
              <strong>Harshith R</strong> <span style={{ color: "var(--muted, #4729A3)" }}>&mdash; 241IT032</span>
            </li>
            <li>
              <strong>Rohith Marthula</strong> <span style={{ color: "var(--muted, #4729A3)" }}>&mdash; 241IT044</span>
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
              color: "var(--ink, #29136C)",
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
