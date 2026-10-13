"use client";

import { useEffect, useState } from "react";

export function LastLoginBanner() {
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user_last_login");
      if (stored) {
        setLastLogin(stored);
      }
    }
  }, []);

  if (!lastLogin || dismissed) return null;

  const isFirst = lastLogin === "first_login";
  let formattedTime = "";
  if (!isFirst) {
    try {
      formattedTime = new Date(lastLogin).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      formattedTime = lastLogin;
    }
  }

  return (
    <div className="dashboard-last-login-banner" role="status" aria-live="polite">
      <div className="dashboard-last-login-banner__content">
        <span className="dashboard-last-login-banner__icon" aria-hidden="true" style={{ display: "inline-flex", alignItems: "center" }}>
          {isFirst ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          )}
        </span>
        <span className="dashboard-last-login-banner__text">
          {isFirst ? (
            <><strong>Welcome!</strong> This is your first login session.</>
          ) : (
            <>Last login: <strong>{formattedTime}</strong></>
          )}
        </span>
      </div>
      <button
        type="button"
        className="dashboard-last-login-banner__close"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss last login notice"
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
