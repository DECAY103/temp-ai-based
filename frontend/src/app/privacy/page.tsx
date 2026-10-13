import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Resume Screening",
  description: "Verified data handling practices, security controls, and personal data retention policy.",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="policy-container">
      <header className="policy-header">
        <p className="eyebrow">Trust & Transparency</p>
        <h1 className="policy-title">Privacy Policy</h1>
        <p className="policy-meta">
          <strong>Effective Date:</strong> 13 October 2026 | <strong>Last Updated:</strong> October 2026
        </p>
      </header>

      <section className="policy-section">
        <h2>1. Scope and Nature of the Service</h2>
        <p>
          This privacy policy describes how the AI-based Resume Screening application collects,
          processes, stores, and purges personal data. This application is an automated recruitment
          evaluation tool operated as a private web application.
        </p>
        <div className="alert-box alert-info" role="note">
          <strong>Important Notice:</strong> This is a non-governmental software service. This document
          accurately reflects the technical implementation and actual data flows of the current codebase.
          Formal legal compliance (such as GDPR, UK Data Protection Act 2018, or India DPDP Act 2023) requires
          an independent legal audit by the deploying organisation.
        </div>
      </section>

      <section className="policy-section">
        <h2>2. Information Collected and Verified Data Flows</h2>
        <p>
          Based on the application architecture, the following data categories are actively collected and processed:
        </p>

        <h3>2.1 Account and Authentication Information</h3>
        <ul>
          <li><strong>Email Address:</strong> Collected during self-registration and used as the unique user identifier.</li>
          <li><strong>Password:</strong> Never stored in plaintext; hashed using salted <code>PBKDF2-SHA256</code> (29,000 iterations).</li>
          <li><strong>Account Role:</strong> Assigned role (<code>candidate</code>, <code>recruiter</code>, or <code>admin</code>) governing role-based access control.</li>
          <li><strong>Multi-Factor Credentials:</strong> Either a cryptographically random TOTP base32 secret (stored in database) or hashed 6-digit email OTPs with a 10-minute expiry window. Raw OTPs are not logged in production server logs.</li>
        </ul>

        <h3>2.2 Network and Security Telemetry</h3>
        <ul>
          <li><strong>Client IP Addresses:</strong> Extracted from request headers (including <code>X-Forwarded-For</code>) and recorded in append-only audit trails.</li>
          <li><strong>User-Agent Strings:</strong> Collected to identify browser environments and detect automated abuse.</li>
          <li><strong>Activity Logs:</strong> Security audit trail documenting registrations, successful logins, failed authentication attempts, batch uploads, resume downloads, and account deletions.</li>
        </ul>

        <h3>2.3 Uploaded Resumes and Derived Evaluation Data</h3>
        <ul>
          <li><strong>Resume Files and Archives:</strong> Uploaded as individual PDF documents or compressed ZIP archives. Binary bytes are stored in PostgreSQL columns (<code>batch_jobs.upload_bytes</code> and <code>candidate_evaluations.resume_bytes</code>).</li>
          <li><strong>Text Extraction and Anonymisation:</strong> Text is extracted from uploaded PDFs and passed through a two-stage anonymiser: regex-based stripping of emails, phone numbers, and URLs, followed by spaCy Named Entity Recognition (NER) to redact names and organisations.</li>
          <li><strong>Adversarial Content Scans:</strong> Extracted text is checked for prompt-injection attacks, hidden zero-width Unicode characters, and keyword stuffing anomalies before any evaluation is run.</li>
          <li><strong>Evaluation Rubrics and Scores:</strong> Recruiter job rubrics, cosine similarity embeddings, and AI evaluation output (skills match, experience assessment, verdict summaries) are stored in structured JSON format.</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>3. Third-Party Services and Sub-processors</h2>
        <p>
          The application interfaces with external providers strictly for technical infrastructure:
        </p>
        <div className="table-responsive">
          <table className="policy-table">
            <thead>
              <tr>
                <th scope="col">Service / Provider</th>
                <th scope="col">Purpose</th>
                <th scope="col">Data Transmitted</th>
                <th scope="col">Deployment Verification</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>PostgreSQL / Supabase</strong></td>
                <td>Relational database hosting</td>
                <td>Account records, binary resume files, audit trails</td>
                <td>Configured via <code>DATABASE_URL</code></td>
              </tr>
              <tr>
                <td><strong>Google Gmail API / SMTP</strong></td>
                <td>Transactional email (2FA OTP codes & password reset links)</td>
                <td>Recipient email address and one-time verification tokens</td>
                <td>OAuth2 HTTPS REST API or standard TLS SMTP</td>
              </tr>
              <tr>
                <td><strong>Google Gemini API</strong></td>
                <td>Stage 2 detailed evaluation (when enabled)</td>
                <td>Anonymised resume text and job rubric</td>
                <td>Opt-in via <code>LLM_PROVIDER=gemini</code>; heuristic scoring used otherwise</td>
              </tr>
              <tr>
                <td><strong>Host / Infrastructure Provider</strong></td>
                <td>Compute deployment (e.g. Render / Container host)</td>
                <td>Ephemeral runtime traffic and server metrics</td>
                <td>Subject to customer hosting agreement</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="policy-section">
        <h2>4. Data Retention and Automated Cleanup</h2>
        <p>
          To adhere to the principle of storage limitation and data minimisation:
        </p>
        <ul>
          <li><strong>Original Resumes & Archives:</strong> Retained for a configurable period (default: 30 days). Expired upload archives in <code>batch_jobs</code> and original resumes in <code>candidate_evaluations</code> are cleared by the automated retention runner once processing is completed.</li>
          <li><strong>Active Processing Guard:</strong> In-flight batches in <code>queued</code>, <code>extracting</code>, or <code>scoring</code> states are preserved for fault recovery.</li>
          <li><strong>Authentication Tokens & OTPs:</strong> Single-use OTPs expire within 10 minutes. Expired tokens are purged after 7 days.</li>
          <li><strong>Security Audit Trails:</strong> Activity logs and transfer logs are retained for 90 days for administrative compliance before rotation or anonymisation.</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>5. Ownership, Authorisation, and Access Boundaries</h2>
        <p>
          Job batches and candidate records are protected by strict backend authorisation:
        </p>
        <ul>
          <li><strong>Recruiters:</strong> Can only view and manage batches, results, and candidate resumes that belong to their own account.</li>
          <li><strong>Candidates:</strong> Can only view the processing status and submission results for jobs they have applied to.</li>
          <li><strong>Administrators:</strong> Have oversight access to system-wide audit trails, user lists, and forensic report generation.</li>
          <li>UUID obscurity is never used as a substitute for authorization; all endpoints enforce backend ownership checks.</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>6. User Rights, Logout, and Account Deletion</h2>
        <ul>
          <li><strong>Self-Service Account Deletion:</strong> Users may permanently delete their account at any time via the user interface or <code>DELETE /api/auth/account</code>. Deletion cascades to all owned batches, candidate evaluations, original resumes, and authentication tokens.</li>
          <li><strong>Audit Trail Anonymisation:</strong> Upon deletion, security activity logs are preserved for compliance but stripped of personal identifiers (email set to <code>[DELETED_USER]</code>, IP addresses and User-Agents nullified).</li>
          <li><strong>Session Invalidation:</strong> Clicking &ldquo;Sign Out&rdquo; or deleting an account immediately clears authentication cookies and revokes active JWT tokens on the backend.</li>
          <li><strong>Cookie Preferences:</strong> Users can update or withdraw their cookie choices at any time via the Cookie Settings modal linked in the footer.</li>
        </ul>
      </section>

      <section className="policy-section">
        <h2>7. Privacy Inquiries and Developer Verification Notes</h2>
        <div className="alert-box alert-warning" role="note">
          <strong>Unresolved Configuration Items for the Deploying Organisation:</strong>
          <ul>
            <li><strong>Official Contact Address:</strong> Replace this placeholder with the designated Data Protection Officer (DPO) or privacy contact (e.g. <code>privacy@yourcompany.com</code>).</li>
            <li><strong>Data Hosting Location:</strong> Confirm the physical cloud region (e.g. AWS eu-west-1, GCP europe-west1) of your production database.</li>
            <li><strong>External LLM Data Retention:</strong> Review your specific enterprise agreement with Google Gemini regarding whether API data is logged or retained by the provider.</li>
          </ul>
        </div>
        <p>
          For privacy queries regarding this application, please contact the system administrator or your designated
          recruitment representative.
        </p>
      </section>
    </article>
  );
}
