"use client";

import { useEffect, useState, useMemo } from "react";
import {
  adminApi,
  type AdminUser,
  type ActivityLogEntry,
  type TransferAuditLog,
} from "@/lib/api";
import { LastLoginBanner } from "@/components/LastLoginBanner";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"users" | "activity" | "transfers">("users");

  // Data states
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [transferLogs, setTransferLogs] = useState<TransferAuditLog[]>([]);

  // Search states
  const [userSearch, setUserSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");
  const [transferSearch, setTransferSearch] = useState("");

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User inspection modal
  const [inspectedUser, setInspectedUser] = useState<AdminUser | null>(null);
  const [userLogs, setUserLogs] = useState<ActivityLogEntry[]>([]);
  const [loadingUserLogs, setLoadingUserLogs] = useState(false);

  // Wipe / Reset DB modal
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Single user deletion modal (Admin)
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Load initial data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, a, t] = await Promise.all([
        adminApi.getUsers().catch(() => []),
        adminApi.getActivityLogs().catch(() => []),
        adminApi.getTransferLogs().catch(() => []),
      ]);
      setUsers(u);
      setActivityLogs(a);
      setTransferLogs(t);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load audit records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // Filtered lists
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const filteredActivities = useMemo(() => {
    if (!activitySearch.trim()) return activityLogs;
    const q = activitySearch.toLowerCase();
    return activityLogs.filter(
      (a) =>
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.action && a.action.toLowerCase().includes(q)) ||
        (a.detail && a.detail.toLowerCase().includes(q)) ||
        (a.ip_address && a.ip_address.toLowerCase().includes(q))
    );
  }, [activityLogs, activitySearch]);

  const filteredTransfers = useMemo(() => {
    if (!transferSearch.trim()) return transferLogs;
    const q = transferSearch.toLowerCase();
    return transferLogs.filter(
      (t) =>
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.transfer_type && t.transfer_type.toLowerCase().includes(q)) ||
        (t.filename && t.filename.toLowerCase().includes(q)) ||
        (t.status && t.status.toLowerCase().includes(q)) ||
        (t.detail && t.detail.toLowerCase().includes(q))
    );
  }, [transferLogs, transferSearch]);

  // Open user log inspection
  const handleInspectUser = async (user: AdminUser) => {
    setInspectedUser(user);
    setLoadingUserLogs(true);
    try {
      const logs = await adminApi.getUserLogs(user.id);
      setUserLogs(logs);
    } catch {
      setUserLogs([]);
    } finally {
      setLoadingUserLogs(false);
    }
  };

  // Execute database reset
  const handleConfirmReset = async () => {
    if (resetConfirmation.trim().toUpperCase() !== "RESET" && resetConfirmation.trim().toUpperCase() !== "WIPE") {
      return;
    }
    setResetting(true);
    setError(null);
    try {
      const res = await adminApi.resetDatabase(resetConfirmation.trim().toUpperCase());
      setResetSuccessMessage(res.message);
      setShowResetModal(false);
      setResetConfirmation("");
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to wipe and reset database");
    } finally {
      setResetting(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    setError(null);
    try {
      const res = await adminApi.deleteUser(userToDelete.id);
      setResetSuccessMessage(res.message);
      setUserToDelete(null);
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete user account");
    } finally {
      setDeletingUser(false);
    }
  };

  const formatTimestamp = (iso?: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <main className="admin-shell">
      <LastLoginBanner />
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="admin-header">
        <p className="admin-eyebrow">Metadata-only audit & security oversight</p>
        <h1 className="admin-title">System Audit & Admin Control</h1>
        <p className="admin-subtitle">
          Review registered users, track last login timestamps, inspect forensic activity trails,
          and generate official enquiry reports.
        </p>
      </header>

      {/* ── Status Banners ──────────────────────────────────────────────────── */}
      {resetSuccessMessage && (
        <div
          style={{
            background: "var(--good-soft, #E8F5E9)",
            border: "1px solid var(--color-liberty-green, #198754)",
            borderRadius: "10px",
            padding: "14px 18px",
            color: "var(--color-liberty-green, #198754)",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{resetSuccessMessage}</span>
          </span>
          <button
            type="button"
            onClick={() => setResetSuccessMessage(null)}
            aria-label="Dismiss message"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-liberty-green, #198754)", display: "flex", alignItems: "center" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            background: "var(--bad-soft, #FDE8E8)",
            border: "1px solid var(--color-coral-red, #DC3545)",
            borderRadius: "10px",
            padding: "14px 18px",
            color: "var(--color-coral-red, #DC3545)",
            marginBottom: "20px",
          }}
        >
          <strong>Notice:</strong> {error}
        </div>
      )}

      {/* ── Navigation Tabs & Destructive Action Row ────────────────────────── */}
      <div className="admin-action-bar">
        <div className="admin-tabs-list">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "users" ? "admin-tab-btn--active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Registered Users ({users.length})
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "activity" ? "admin-tab-btn--active" : ""}`}
            onClick={() => setActiveTab("activity")}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Activity Logs
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === "transfers" ? "admin-tab-btn--active" : ""}`}
            onClick={() => setActiveTab("transfers")}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Transfer Audit Logs
          </button>
        </div>

        <button
          type="button"
          className="admin-reset-btn"
          onClick={() => {
            setShowResetModal(true);
            setResetConfirmation("");
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          Wipe All Tables & Reset DB
        </button>
      </div>

      {/* ── Main Content Card ───────────────────────────────────────────────── */}
      <div className="admin-card">
        {/* Tab 1: Registered Users */}
        {activeTab === "users" && (
          <>
            <div className="admin-card-toolbar">
              <div className="admin-search-wrap">
                <span className="admin-search-icon" style={{ display: "flex", alignItems: "center" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Search users by username or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
              <div className="admin-count-badge">
                Showing <strong>{filteredUsers.length}</strong> records
              </div>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Registered At</th>
                    <th>Last Login Details</th>
                    <th>Forensic Report</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                        Loading registered users...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="admin-empty-state">
                        No user records found matching &ldquo;{userSearch}&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600 }}>{u.username}</td>
                        <td style={{ color: "#475569" }}>{u.email}</td>
                        <td>
                          <span
                            className={`admin-role-badge admin-role-badge--${
                              u.role === "admin"
                                ? "admin"
                                : u.role === "recruiter"
                                ? "recruiter"
                                : "candidate"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td style={{ color: "#64748b" }}>{formatTimestamp(u.created_at)}</td>
                        <td>
                          {u.last_login_at ? (
                            <span style={{ color: "#334155" }}>{formatTimestamp(u.last_login_at)}</span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Never logged in</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <button
                              type="button"
                              className="admin-btn-action admin-btn-view"
                              onClick={() => handleInspectUser(u)}
                            >
                              View Logs
                            </button>
                            <a
                              href={adminApi.getUserReportUrl(u.id)}
                              className="admin-btn-action admin-btn-export"
                              download
                              title="Export official forensic enquiry PDF report"
                            >
                              Export PDF
                            </a>
                            <button
                              type="button"
                              className="admin-btn-action"
                              style={{
                                background: "var(--bad-soft, #FDE8E8)",
                                color: "var(--color-coral-red, #DC3545)",
                                border: "1px solid var(--color-coral-red, #DC3545)",
                              }}
                              onClick={() => setUserToDelete(u)}
                              title="Delete user record"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tab 2: Activity Logs */}
        {activeTab === "activity" && (
          <>
            <div className="admin-card-toolbar">
              <div className="admin-search-wrap">
                <span className="admin-search-icon" style={{ display: "flex", alignItems: "center" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Filter activity logs by email, action, IP..."
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                />
              </div>
              <div className="admin-count-badge">
                Showing <strong>{filteredActivities.length}</strong> records
              </div>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User / Subject</th>
                    <th>Action</th>
                    <th>Details</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                        Loading system activity logs...
                      </td>
                    </tr>
                  ) : filteredActivities.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="admin-empty-state">
                        No activity records found.
                      </td>
                    </tr>
                  ) : (
                    filteredActivities.map((log) => (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: "nowrap", color: "#64748b" }}>
                          {formatTimestamp(log.created_at)}
                        </td>
                        <td style={{ fontWeight: 500 }}>{log.email || log.user_id || "System"}</td>
                        <td>
                          <code
                            style={{
                              background: "#f1f5f9",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontSize: "0.8rem",
                              color: "#0f172a",
                            }}
                          >
                            {log.action}
                          </code>
                        </td>
                        <td style={{ color: "#475569", maxWidth: "340px", wordBreak: "break-word" }}>
                          {log.detail || "—"}
                        </td>
                        <td style={{ color: "#64748b", fontFamily: "monospace", fontSize: "0.8rem" }}>
                          {log.ip_address || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tab 3: Transfer Audit Logs */}
        {activeTab === "transfers" && (
          <>
            <div className="admin-card-toolbar">
              <div className="admin-search-wrap">
                <span className="admin-search-icon" style={{ display: "flex", alignItems: "center" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Filter transfers by filename, type, user..."
                  value={transferSearch}
                  onChange={(e) => setTransferSearch(e.target.value)}
                />
              </div>
              <div className="admin-count-badge">
                Showing <strong>{filteredTransfers.length}</strong> records
              </div>
            </div>

            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User / Subject</th>
                    <th>Transfer Type</th>
                    <th>Resource / Filename</th>
                    <th>File Size</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                        Loading data transfer logs...
                      </td>
                    </tr>
                  ) : filteredTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="admin-empty-state">
                        No transfer audit records logged yet.
                      </td>
                    </tr>
                  ) : (
                    filteredTransfers.map((t) => (
                      <tr key={t.id}>
                        <td style={{ whiteSpace: "nowrap", color: "#64748b" }}>
                          {formatTimestamp(t.created_at)}
                        </td>
                        <td style={{ fontWeight: 500 }}>{t.email || "Anonymous"}</td>
                        <td>
                          <span
                            style={{
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                            }}
                          >
                            {t.transfer_type}
                          </span>
                        </td>
                        <td style={{ maxWidth: "260px", wordBreak: "break-all", fontFamily: "monospace", fontSize: "0.82rem" }}>
                          {t.filename}
                        </td>
                        <td style={{ color: "#64748b", whiteSpace: "nowrap" }}>
                          {formatFileSize(t.filesize_bytes)}
                        </td>
                        <td>
                          <span
                            style={{
                              color: t.status === "success" ? "var(--color-liberty-green, #198754)" : "var(--color-coral-red, #DC3545)",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                            }}
                          >
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── View Logs Modal (Per-User Activity Trail) ───────────────────────── */}
      {inspectedUser && (
        <div className="admin-modal-backdrop" onClick={() => setInspectedUser(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h2>Forensic Trail: {inspectedUser.username}</h2>
                <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                  {inspectedUser.email} • Role: {inspectedUser.role} • Registered: {formatTimestamp(inspectedUser.created_at)}
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setInspectedUser(null)}
                aria-label="Close logs dialog"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="admin-modal-body">
              {loadingUserLogs ? (
                <p style={{ textAlign: "center", color: "var(--muted, #606060)", padding: "20px" }}>
                  Retrieving user activity logs...
                </p>
              ) : userLogs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "var(--muted, #606060)" }}>
                  No logged activity records for this user yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {userLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        padding: "12px 14px",
                        background: "var(--surface-soft, #FAFAFA)",
                        border: "1px solid var(--line, #EBEAEA)",
                        borderRadius: "8px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <code style={{ fontWeight: 700, color: "var(--accent, #4729A3)", fontSize: "0.85rem" }}>
                          {log.action}
                        </code>
                        <span style={{ fontSize: "0.78rem", color: "var(--muted, #606060)" }}>
                          {formatTimestamp(log.created_at)}
                        </span>
                      </div>
                      {log.detail && (
                        <p style={{ margin: "4px 0", fontSize: "0.84rem", color: "var(--ink, #150202)" }}>
                          {log.detail}
                        </p>
                      )}
                      {log.ip_address && (
                        <p style={{ margin: "2px 0 0", fontSize: "0.74rem", color: "var(--muted, #606060)", fontFamily: "monospace" }}>
                          IP: {log.ip_address}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <a
                href={adminApi.getUserReportUrl(inspectedUser.id)}
                className="admin-btn-action admin-btn-export"
                download
              >
                Export PDF Report
              </a>
              <button
                type="button"
                className="admin-btn-action admin-btn-view"
                onClick={() => setInspectedUser(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Wipe All Tables & Reset DB Modal ─────────────────────────────────── */}
      {showResetModal && (
        <div className="admin-modal-backdrop" onClick={() => !resetting && setShowResetModal(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header" style={{ borderBottomColor: "#fee2e2" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <h2 style={{ color: "#b91c1c", margin: 0 }}>Wipe All Tables & Reset DB</h2>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                disabled={resetting}
                onClick={() => setShowResetModal(false)}
                aria-label="Close reset dialog"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-danger-alert">
                <strong>Destructive Action Warning:</strong>
                <p style={{ margin: "8px 0 0" }}>
                  User accounts, activity logs, transfer audit logs, candidate evaluations, batch job
                  records, and stored encrypted blobs will be permanently removed.
                </p>
                <p style={{ margin: "8px 0 0", fontWeight: 600 }}>
                  Read the complete confirmation before proceeding. Cancel if you are not authorized to reset the
                  database or do not intend to erase this data.
                </p>
              </div>

              <div>
                <label
                  htmlFor="reset-confirm-input"
                  style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}
                >
                  Type <strong>RESET</strong> or <strong>WIPE</strong> below to confirm:
                </label>
                <input
                  id="reset-confirm-input"
                  type="text"
                  className="admin-confirm-input"
                  placeholder="RESET"
                  value={resetConfirmation}
                  disabled={resetting}
                  onChange={(e) => setResetConfirmation(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-action admin-btn-view"
                disabled={resetting}
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-reset-btn"
                style={{
                  opacity:
                    resetConfirmation.trim().toUpperCase() === "RESET" ||
                    resetConfirmation.trim().toUpperCase() === "WIPE"
                      ? 1
                      : 0.5,
                  cursor:
                    resetConfirmation.trim().toUpperCase() === "RESET" ||
                    resetConfirmation.trim().toUpperCase() === "WIPE"
                      ? "pointer"
                      : "not-allowed",
                }}
                disabled={
                  resetting ||
                  (resetConfirmation.trim().toUpperCase() !== "RESET" &&
                    resetConfirmation.trim().toUpperCase() !== "WIPE")
                }
                onClick={handleConfirmReset}
              >
                {resetting ? "Erasing & Resetting..." : "Permanently Erase & Reset DB"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Delete User Confirmation Modal ────────────────────────────── */}
      {userToDelete && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !deletingUser && setUserToDelete(null)}
        >
          <div
            className="admin-modal-card"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header" style={{ borderBottomColor: "var(--line, #EBEAEA)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-coral-red, #DC3545)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <h2 style={{ color: "var(--color-coral-red, #DC3545)", margin: 0 }}>Delete User Account</h2>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                disabled={deletingUser}
                onClick={() => setUserToDelete(null)}
                aria-label="Close delete user dialog"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="admin-modal-body">
              <p style={{ margin: "0 0 10px", fontSize: "0.92rem", color: "var(--ink, #150202)", lineHeight: 1.5 }}>
                Are you sure you want to permanently delete this user?
              </p>
              <div
                style={{
                  padding: "10px 14px",
                  background: "var(--surface-soft, #FAFAFA)",
                  border: "1px solid var(--line, #EBEAEA)",
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                <div style={{ fontWeight: 700, color: "var(--ink, #150202)" }}>{userToDelete.email}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--muted, #606060)" }}>
                  Role: {userToDelete.role} • ID: {userToDelete.id}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748b", lineHeight: 1.5 }}>
                This will revoke their access, delete authentication credentials, and purge active sessions.
              </p>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn-action admin-btn-view"
                disabled={deletingUser}
                onClick={() => setUserToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-reset-btn"
                disabled={deletingUser}
                onClick={handleConfirmDeleteUser}
              >
                {deletingUser ? "Deleting..." : "Permanently Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
