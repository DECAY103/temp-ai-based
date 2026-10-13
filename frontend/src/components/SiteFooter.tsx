"use client";

import Link from "next/link";

export function SiteFooter() {
  const handleOpenCookieSettings = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-cookie-preferences"));
    }
  };

  return (
    <footer className="site-footer" role="contentinfo" aria-label="Site footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Link href="/" className="footer-brand">
            <span className="brand-mark">RS</span>
            <span className="footer-brand__name">Resume Screening</span>
          </Link>
          <p className="site-footer__tagline">
            Cloud-native, AI-assisted resume screening and candidate evaluation platform.
          </p>
        </div>

        <nav className="site-footer__nav" aria-label="Footer navigation">
          <div className="footer-col">
            <h2 className="footer-heading">Platform</h2>
            <ul className="footer-links">
              <li><Link href="/candidate">Candidate Portal</Link></li>
              <li><Link href="/recruiter">Recruiter Dashboard</Link></li>
              <li><Link href="/admin">Audit Logs</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h2 className="footer-heading">Policies & Trust</h2>
            <ul className="footer-links">
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/terms">Terms of Use</Link></li>
              <li>
                <button
                  type="button"
                  onClick={handleOpenCookieSettings}
                  className="footer-btn-link"
                >
                  Cookie Settings
                </button>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h2 className="footer-heading">Support</h2>
            <ul className="footer-links">
              <li><Link href="/contact">Help & Contact</Link></li>
            </ul>
          </div>
        </nav>
      </div>

      <div className="site-footer__bottom">
        <div className="site-footer__bottom-inner">
          <p className="copyright">
            © {new Date().getFullYear()} Resume Screening Platform. All rights reserved.
          </p>
          <p className="last-updated">
            Last updated: October 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
