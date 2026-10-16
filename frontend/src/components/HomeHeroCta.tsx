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
      const token = cookies["access_token"] || localStorage.getItem("access_token");
      const isLoggedIn = Boolean(cookies["logged_in"] || token);
      const role = cookies["user_role"] || localStorage.getItem("user_role");

      if (isLoggedIn && token) {
        if (role === "admin") {
          setPortalHref("/admin");
          setPortalLabel("Open Admin Portal");
        } else if (role === "candidate") {
          setPortalHref("/candidate");
          setPortalLabel("Open Candidate Portal");
        } else {
          setPortalHref("/recruiter");
          setPortalLabel("Open Recruiter Portal");
        }
      } else {
        setPortalHref("/auth/login");
        setPortalLabel("Open Screening Portal");
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

      <Link className="hero-pill-btn hero-pill-btn--secondary" href="/candidate">
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
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        <span>Candidate Portal</span>
      </Link>
    </div>
  );
}
