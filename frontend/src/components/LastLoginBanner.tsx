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
        <span className="dashboard-last-login-banner__icon" aria-hidden="true">
          {isFirst ? "🎉" : "🕐"}
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
      >
        ✕
      </button>
    </div>
  );
}
