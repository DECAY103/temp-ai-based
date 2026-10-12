"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation"; // 1. Import usePathname
import { BackendStatus } from "@/components/BackendStatus";

export function SiteHeader() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname(); // 2. Track current route pathname

  useEffect(() => {
    // Check for the logged_in cookie to determine login state
    // (access_token is HttpOnly and invisible to JS)
    const hasToken = document.cookie
      .split("; ")
      .some((c) => c.startsWith("logged_in="));
    setIsLoggedIn(hasToken);
  }, [pathname]); // 3. Re-run check whenever the user navigates to a new page

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