"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BackendStatus } from "@/components/BackendStatus";
import { authApi } from "@/lib/api";

export function SiteHeader() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const cookies = Object.fromEntries(
      document.cookie
        .split("; ")
        .filter(Boolean)
        .map((c) => {
          const [k, ...v] = c.split("=");
          return [k, decodeURIComponent(v.join("="))];
        })
    );
    const hasToken = Boolean(
      cookies["logged_in"] ||
      cookies["access_token"] ||
      (typeof window !== "undefined" && localStorage.getItem("access_token"))
    );
    const userRole =
      cookies["user_role"] ||
      (typeof window !== "undefined" ? localStorage.getItem("user_role") : null) ||
      (hasToken ? "recruiter" : null);
    setIsLoggedIn(hasToken);
    setRole(userRole);
  }, [pathname]);

  // Keyboard dismissal for delete account dialog
  useEffect(() => {
    if (!showDeleteModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        setShowDeleteModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDeleteModal, isDeleting]);

  const handleSignOut = async () => {
    try {
      await authApi.logout();
    } catch {
      // Proceed with client cleanup regardless
    }
    document.cookie = "logged_in=; Max-Age=0; path=/";
    document.cookie = "user_role=; Max-Age=0; path=/";
    if (typeof window !== "undefined") {
      localStorage.removeItem("user_role");
    }
    setIsLoggedIn(false);
    setRole(null);
    router.push("/auth/login");
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await authApi.deleteAccount();
      document.cookie = "logged_in=; Max-Age=0; path=/";
      document.cookie = "user_role=; Max-Age=0; path=/";
      if (typeof window !== "undefined") {
        localStorage.removeItem("user_role");
      }
      setIsLoggedIn(false);
      setRole(null);
      setShowDeleteModal(false);
      router.push("/auth/login?deleted=1");
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account");
      setIsDeleting(false);
    }
  };

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileNavOpen]);

  return (
    <>
      <header className="site-header">
        <div className="site-header__inner">
          <a className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">RS</span>
            <span className="brand-title">Resume Screening</span>
          </a>
          <nav className="site-nav site-nav--desktop" aria-label="Primary navigation">
            <a href="/#features-heading">Features</a>
            <a href="/candidate">Candidate Portal</a>
            {isLoggedIn && role === "recruiter" && (
              <a href="/recruiter">Recruiter Portal</a>
            )}
            {isLoggedIn && role === "admin" && (
              <a href="/admin">Audit Logs</a>
            )}
          </nav>

          <div className="header-actions">
            {isLoggedIn ? (
              <>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="site-nav-btn"
                >
                  Sign out
                </button>
                <a
                  href={role === "admin" ? "/admin" : role === "candidate" ? "/candidate" : "/recruiter"}
                  className="header-pill-btn"
                >
                  <span>Portal</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>
              </>
            ) : (
              <>
                <a href="/auth/login" className="site-nav-link-login">
                  Sign in
                </a>
                <a href="/auth/login" className="header-pill-btn">
                  <span>Get Started</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>
              </>
            )}
            <BackendStatus />

            <button
              type="button"
              className="mobile-nav-toggle"
              aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-nav-drawer"
              onClick={() => setMobileNavOpen((prev) => !prev)}
            >
              {mobileNavOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <>
            <div
              className="mobile-nav-backdrop"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden="true"
            />
            <div id="mobile-nav-drawer" className="mobile-nav-drawer" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
              {isLoggedIn ? (
                <div className="mobile-nav-content">
                  <div className="mobile-nav-user-info">
                    <span className="mobile-user-role-badge">
                      Signed in as <strong>{role || "User"}</strong>
                    </span>
                  </div>
                  <div className="mobile-nav-links">
                    {(role === "admin" || pathname.startsWith("/admin")) && (
                      <a
                        href="/admin"
                        className={`mobile-nav-link ${pathname.startsWith("/admin") ? "mobile-nav-link--active" : ""}`}
                        onClick={() => setMobileNavOpen(false)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <path d="M3 9h18" />
                          <path d="M9 21V9" />
                        </svg>
                        <span>Audit Logs & Admin</span>
                      </a>
                    )}
                    {role === "recruiter" && (
                      <a
                        href="/recruiter"
                        className={`mobile-nav-link ${pathname === "/recruiter" ? "mobile-nav-link--active" : ""}`}
                        onClick={() => setMobileNavOpen(false)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        <span>Recruiter Portal</span>
                      </a>
                    )}
                    {role === "candidate" && (
                      <a
                        href="/candidate"
                        className={`mobile-nav-link ${pathname === "/candidate" ? "mobile-nav-link--active" : ""}`}
                        onClick={() => setMobileNavOpen(false)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span>Candidate Portal</span>
                      </a>
                    )}
                  </div>
                  <div className="mobile-nav-divider" />
                  <div className="mobile-nav-actions">
                    <button
                      type="button"
                      className="mobile-nav-btn mobile-nav-btn--signout"
                      onClick={() => {
                        setMobileNavOpen(false);
                        handleSignOut();
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      <span>Sign out</span>
                    </button>
                    <button
                      type="button"
                      className="mobile-nav-btn mobile-nav-btn--delete"
                      onClick={() => {
                        setMobileNavOpen(false);
                        setShowDeleteModal(true);
                        setDeleteError(null);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                      <span>Delete account</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mobile-nav-content">
                  <a
                    href="/auth/login"
                    className="primary"
                    style={{
                      width: "100%",
                      textAlign: "center",
                      padding: "12px 20px",
                      borderRadius: "8px",
                      fontWeight: 650,
                      textDecoration: "none",
                      display: "block",
                    }}
                    onClick={() => setMobileNavOpen(false)}
                  >
                    Sign in to Portal
                  </a>
                </div>
              )}
            </div>
          </>
        )}
      </header>

      {/* ── Self-Service Delete Account Modal ─────────────────────────────────── */}
      {showDeleteModal && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-modal-title"
          onClick={() => !isDeleting && setShowDeleteModal(false)}
        >
          <div
            className="admin-modal-card"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header" style={{ borderBottomColor: "var(--line, #BDADEB)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-coral-red, #29136C)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <h2 id="delete-account-modal-title" style={{ color: "var(--color-coral-red, #29136C)", margin: 0, fontSize: "1.2rem" }}>Delete Account</h2>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                aria-label="Close delete account dialog"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="admin-modal-body">
              <p style={{ margin: "0 0 10px", fontSize: "0.92rem", color: "var(--ink)", lineHeight: 1.5 }}>
                Are you sure you want to permanently delete your account?
              </p>
              <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--muted)", lineHeight: 1.5 }}>
                This action is permanent and cannot be undone. All your session data, role permissions,
                and credentials will be immediately purged.
              </p>
              {deleteError && (
                <div
                  role="alert"
                  style={{
                    marginTop: 14,
                    padding: "8px 12px",
                    background: "var(--bad-soft, #EEEBFA)",
                    border: "1px solid var(--color-coral-red, #29136C)",
                    color: "var(--color-coral-red, #29136C)",
                    borderRadius: 8,
                    fontSize: "0.82rem",
                  }}
                >
                  {deleteError}
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-action admin-btn-view"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-reset-btn"
                disabled={isDeleting}
                onClick={handleDeleteAccount}
              >
                {isDeleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}