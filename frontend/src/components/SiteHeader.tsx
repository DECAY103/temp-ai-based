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
    const hasToken = Boolean(cookies["logged_in"]);
    const userRole = cookies["user_role"] || (typeof window !== "undefined" ? localStorage.getItem("user_role") : null);
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

  return (
    <>
      <header className="site-header">
        <div className="site-header__inner">
          <a className="brand" href="/">
            <span className="brand-mark">RS</span>Resume Screening
          </a>
          <div className="header-actions">
            <BackendStatus />
            <nav className="site-nav" aria-label="Primary navigation">
              {isLoggedIn ? (
                <>
                  {(role === "admin" || pathname.startsWith("/admin")) && (
                    <a
                      href="/admin"
                      style={{
                        fontWeight: pathname.startsWith("/admin") ? 700 : 500,
                        color: pathname.startsWith("/admin") ? "var(--accent)" : "inherit",
                      }}
                    >
                      Audit Logs
                    </a>
                  )}
                  {role === "recruiter" && !pathname.startsWith("/admin") && (
                    <a href="/recruiter">Recruiter Dashboard</a>
                  )}
                  {role === "candidate" && !pathname.startsWith("/admin") && (
                    <a href="/candidate">Candidate Portal</a>
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      fontSize: "0.86rem",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--ink)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--muted)")}
                  >
                    Sign out
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(true);
                      setDeleteError(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-coral-red, #DC3545)",
                      fontSize: "0.86rem",
                      cursor: "pointer",
                      padding: 0,
                      opacity: 0.85,
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.85")}
                    title="Permanently delete your account"
                  >
                    Delete account
                  </button>
                </>
              ) : (
                <a href="/auth/login">Sign in</a>
              )}
            </nav>
          </div>
        </div>
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
            <div className="admin-modal-header" style={{ borderBottomColor: "var(--line, #EBEAEA)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span aria-hidden="true" style={{ fontSize: "1.2rem" }}>⚠️</span>
                <h2 id="delete-account-modal-title" style={{ color: "var(--color-coral-red, #DC3545)" }}>Delete Account</h2>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                aria-label="Close delete account dialog"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
              >
                ✕
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
                    background: "var(--bad-soft, #FDE8E8)",
                    border: "1px solid var(--color-coral-red, #DC3545)",
                    color: "var(--color-coral-red, #DC3545)",
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