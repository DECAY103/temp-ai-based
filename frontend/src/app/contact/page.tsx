import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & Contact — Resume Screening",
  description: "Get assistance, report technical issues, or inquire about data privacy.",
};

export default function ContactPage() {
  return (
    <article className="policy-container">
      <header className="policy-header">
        <p className="eyebrow">Support & Inquiries</p>
        <h1 className="policy-title">Help & Contact</h1>
        <p className="policy-meta">
          <strong>Support Status:</strong> Active Platform Service
        </p>
      </header>

      <section className="policy-section">
        <h2>Technical Support & Enquiries</h2>
        <p>
          For technical issues, bug reports, or account assistance with the Resume Screening platform,
          please consult the guidance below:
        </p>

        <div className="contact-cards">
          <div className="contact-card">
            <h3>Candidate Inquiries</h3>
            <p>
              If you have questions regarding your submission status or wish to update your resume,
              please reach out to your assigned recruiter or hiring representative directly.
            </p>
          </div>

          <div className="contact-card">
            <h3>Recruiter & Admin Support</h3>
            <p>
              For platform administration, batch processing issues, or database recovery,
              please contact the internal engineering support team or repository maintainers.
            </p>
          </div>

          <div className="contact-card">
            <h3>Privacy & Data Rights</h3>
            <p>
              To exercise your right to access, rectification, or data erasure, you can use the
              self-service account deletion feature or contact the privacy administrator.
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}
