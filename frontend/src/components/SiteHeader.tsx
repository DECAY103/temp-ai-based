"use client";

import { useEffect, useState } from "react";
import { BackendStatus } from "@/components/BackendStatus";

export function SiteHeader() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check for the access_token cookie to determine login state
    const hasToken = document.cookie
      .split("; ")
      .some((c) => c.startsWith("access_token="));
    setIsLoggedIn(hasToken);
  }, []);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a className="brand" href="/">
          <span className="brand-mark">RS</span>Resume Screening
        </a>
        <div className="header-actions">
          <BackendStatus />
          {!isLoggedIn && (
            <nav className="site-nav" aria-label="Primary navigation">
              <a href="/auth/login">Sign in</a>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
