"use client";

import { useEffect, useState, useCallback } from "react";
import { healthApi, HealthStatus } from "@/lib/api";

export function BackendStatus() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    try {
      const res = await healthApi.check();
      setHealth(res);
    } catch {
      setHealth({ status: "error", message: "Failed to connect" });
    } finally {
      setChecking(false);
    }
  }, []);

  // Ping immediately on load to wake up Render container
  useEffect(() => {
    checkStatus();
    // Re-check periodically every 45 seconds to keep connection warm
    const interval = setInterval(checkStatus, 45000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const statusType = checking && !health ? "checking" : health?.status || "error";

  const statusLabels: Record<string, string> = {
    checking: "Pinging API…",
    ok: `Backend Live${health?.latencyMs ? ` (${health.latencyMs}ms)` : ""}`,
    waking: "Waking Backend (~50s)…",
    degraded: "Backend Degraded",
    error: "Backend Offline",
  };

  const statusColors: Record<string, string> = {
    checking: "var(--accent)",
    ok: "var(--color-liberty-green, #198754)", // Liberty Green
    waking: "var(--color-mustard-yellow, #FFC107)", // Mustard Yellow
    degraded: "var(--color-mustard-yellow, #FFC107)", // Mustard Yellow
    error: "var(--color-coral-red, #DC3545)", // Coral Red
  };

  return (
    <div className="backend-status-container">
      <button
        type="button"
        className={`backend-status-pill backend-status-pill--${statusType}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Click to check backend connectivity status"
        aria-label="Backend status"
      >
        <span
          className="backend-status-dot"
          style={{ backgroundColor: statusColors[statusType] }}
        />
        <span className="backend-status-label">{statusLabels[statusType]}</span>
        <svg
          className={`backend-status-chevron ${isOpen ? "open" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 8 10 12 14 8" />
        </svg>
      </button>

      {isOpen && (
        <div className="backend-status-dropdown" role="dialog" aria-label="Backend diagnostics">
          <div className="backend-status-dropdown__header">
            <strong>Backend Diagnostics</strong>
            <span
              className="backend-status-chip"
              style={{
                backgroundColor: `${statusColors[statusType]}22`,
                color: statusColors[statusType],
              }}
            >
              {statusType.toUpperCase()}
            </span>
          </div>

          <div className="backend-status-dropdown__body">
            <div className="backend-stat-row">
              <span className="stat-name">API Host</span>
              <span className="stat-val stat-val--mono">Render / FastApi</span>
            </div>

            <div className="backend-stat-row">
              <span className="stat-name">Database</span>
              <span className="stat-val">
                {health?.database === "connected" ? (
                  <span style={{ color: "var(--color-liberty-green, #198754)", fontWeight: 600 }}>Connected ✓</span>
                ) : (
                  <span style={{ color: "var(--color-coral-red, #DC3545)", fontWeight: 600 }}>
                    {health?.database || "Disconnected"}
                  </span>
                )}
              </span>
            </div>

            <div className="backend-stat-row">
              <span className="stat-name">2FA Mode</span>
              <span className="stat-val">{health?.otp_mode || "email"}</span>
            </div>

            <div className="backend-stat-row">
              <span className="stat-name">Email Delivery</span>
              <span className="stat-val">
                {health?.email_delivery === "gmail_https" ? (
                  <span style={{ color: "var(--color-liberty-green, #198754)", fontWeight: 600 }}>Gmail HTTPS ✓</span>
                ) : health?.email_delivery === "smtp" ? (
                  <span style={{ color: "var(--color-blue, #0D6EFD)", fontWeight: 600 }}>SMTP Legacy ✓</span>
                ) : (
                  <span style={{ color: "var(--color-grey-3, #606060)" }}>Console logs only</span>
                )}
              </span>
            </div>

            {health?.latencyMs !== undefined && (
              <div className="backend-stat-row">
                <span className="stat-name">Latency</span>
                <span className="stat-val stat-val--mono">{health.latencyMs}ms</span>
              </div>
            )}

            {statusType === "waking" && (
              <p className="backend-status-hint">
                💡 <strong>Render Free Tier Notice:</strong> Web services spin down after 15 min of
                inactivity. Waking up from cold sleep takes 40–60 seconds. Please wait a moment.
              </p>
            )}

            {statusType === "error" && (
              <p className="backend-status-hint error">
                ⚠️ Make sure <code>NEXT_PUBLIC_API_URL</code> on Vercel points to your Render backend
                and that you clicked <strong>Redeploy</strong> on Vercel after setting it.
              </p>
            )}
          </div>

          <div className="backend-status-dropdown__footer">
            <button
              type="button"
              className="secondary btn-sm"
              onClick={() => checkStatus()}
              disabled={checking}
            >
              {checking ? "Checking…" : "Ping Backend"}
            </button>
            <button
              type="button"
              className="link-button btn-sm"
              onClick={() => setIsOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
