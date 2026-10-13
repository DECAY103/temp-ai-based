import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use — Resume Screening",
  description: "Terms governing the acceptable use and operation of the Resume Screening platform.",
};

export default function TermsPage() {
  return (
    <article className="policy-container">
      <header className="policy-header">
        <p className="eyebrow">Platform Guidelines</p>
        <h1 className="policy-title">Terms of Use</h1>
        <p className="policy-meta">
          <strong>Effective Date:</strong> October 2026 | <strong>Last Updated:</strong> October 2026
        </p>
      </header>

      <section className="policy-section">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using this Resume Screening platform, you agree to comply with these Terms of Use
          and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited
          from using or accessing this site.
        </p>
      </section>

      <section className="policy-section">
        <h2>2. Permitted Use and Account Roles</h2>
        <p>
          The service is provided to assist in recruitment assessment and application evaluation:
        </p>
        <ul>
          <li><strong>Recruiters:</strong> May upload job descriptions, rubrics, and candidate resume archives strictly for legitimate hiring purposes for which they possess lawful authority.</li>
          <li><strong>Candidates:</strong> May submit their own credentials and resumes in response to designated job openings.</li>
          <li><strong>Security:</strong> Users are responsible for maintaining the confidentiality of their credentials and two-factor authentication tokens.</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>3. Adversarial and Prohibited Content</h2>
        <p>
          Users must not submit files containing:
        </p>
        <ul>
          <li>Malicious code, computer viruses, or ZIP bombs designed to exhaust server memory.</li>
          <li>Prompt-injection attacks, instructions to disregard evaluation rubrics, or jailbreak attempts.</li>
          <li>Unsolicited commercial content, fraudulent claims, or materials infringing intellectual property rights.</li>
        </ul>
        <p>
          Submissions that trigger prompt-injection or adversarial detection filters will be automatically rejected.
        </p>
      </section>

      <section className="policy-section">
        <h2>4. Disclaimers and Limitations</h2>
        <p>
          Automated evaluation scores and semantic similarity rankings are advisory tools to assist human
          decision-makers. They do not constitute binding employment decisions. The platform is provided on an
          &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.
        </p>
      </section>
    </article>
  );
}
