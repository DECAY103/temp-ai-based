"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * HomeHeroCta dynamically routes the user to their appropriate portal:
 * - Recruiter: Open Recruiter Portal (/recruiter)
 * - Candidate: Open Candidate Portal (/candidate)
 * - Administrator: Open Admin Portal (/admin)
 * - Unauthenticated: Open Screening Portal (/auth/login)
 */
export function HomeHeroCta() {
  const [portalHref, setPortalHref] = useState("/auth/login");
  const [portalLabel, setPortalLabel] = useState("Open Screening Portal");
  const [secondaryHref, setSecondaryHref] = useState("/candidate");
  const [secondaryLabel, setSecondaryLabel] = useState("Candidate Portal");
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cookies = Object.fromEntries(
        document.cookie
          .split("; ")
          .filter(Boolean)
          .map((c) => {
            const [k, ...v] = c.split("=");
            return [k, decodeURIComponent(v.join("="))];
          })
      );
      const isLoggedIn = Boolean(
        cookies["logged_in"] ||
        cookies["access_token"] ||
        localStorage.getItem("access_token")
      );
      const role =
        cookies["user_role"] ||
        localStorage.getItem("user_role") ||
        (isLoggedIn ? "recruiter" : null);

      if (isLoggedIn && role) {
        setUserRole(role);
        if (role === "admin") {
          setPortalHref("/admin");
          setPortalLabel("Open Admin Portal");
          setSecondaryHref("");
          setSecondaryLabel("");
        } else if (role === "candidate") {
          setPortalHref("/candidate");
          setPortalLabel("Open Candidate Portal");
          setSecondaryHref("");
          setSecondaryLabel("");
        } else {
          setPortalHref("/recruiter");
          setPortalLabel("Open Recruiter Portal");
          setSecondaryHref("");
          setSecondaryLabel("");
        }
      } else {
        setPortalHref("/auth/login");
        setPortalLabel("Open Screening Portal");
        setSecondaryHref("/candidate");
        setSecondaryLabel("Candidate Portal");
        setUserRole(null);
      }
    }
  }, []);

  return (
    <div className="hero-cta-buttons">
      <Link className="hero-pill-btn hero-pill-btn--primary" href={portalHref}>
        <span>{portalLabel}</span>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>

      {secondaryHref && secondaryLabel && (
        <Link className="hero-pill-btn hero-pill-btn--secondary" href={secondaryHref}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {userRole === "admin" ? (
              <>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </>
            ) : (
              <>
                <rect width="20" height="14" x="2" y="3" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </>
            )}
          </svg>
          <span>{secondaryLabel}</span>
        </Link>
      )}
    </div>
  );
}
