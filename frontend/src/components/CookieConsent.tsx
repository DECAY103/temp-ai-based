"use client";

import { useEffect, useState, useRef } from "react";

export interface CookiePreferences {
  essential: boolean; // Always true
  functional: boolean;
  analytics: boolean;
  timestamp: string;
}

const STORAGE_KEY = "cookie_preferences";
const COOKIE_NAME = "cookie_consent";

export function getStoredCookiePreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Local storage access issue fallback
  }
  return null;
}

export function saveCookiePreferences(prefs: CookiePreferences) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    // Persist as cookie for 180 days with SameSite=Lax
    const maxAge = 180 * 24 * 60 * 60;
    const cookieVal = encodeURIComponent(JSON.stringify({ f: prefs.functional ? 1 : 0, a: prefs.analytics ? 1 : 0 }));
    document.cookie = `${COOKIE_NAME}=${cookieVal}; max-age=${maxAge}; path=/; SameSite=Lax`;
    window.dispatchEvent(new CustomEvent("cookie-preferences-changed", { detail: prefs }));
  } catch {
    // Ignore storage errors
  }
}

export function CookieConsent() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomise, setShowCustomise] = useState(false);
  const [functionalConsent, setFunctionalConsent] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = getStoredCookiePreferences();
    if (!stored) {
      // First visit: show banner
      setIsOpen(true);
    } else {
      setFunctionalConsent(Boolean(stored.functional));
      setAnalyticsConsent(Boolean(stored.analytics));
    }

    // Listener for manual reopen from footer or settings
    const handleOpenModal = () => {
      const current = getStoredCookiePreferences();
      if (current) {
        setFunctionalConsent(Boolean(current.functional));
        setAnalyticsConsent(Boolean(current.analytics));
      } else {
        setFunctionalConsent(false);
        setAnalyticsConsent(false);
      }
      setShowCustomise(true);
      setIsOpen(true);
    };

    window.addEventListener("open-cookie-preferences", handleOpenModal);
    return () => window.removeEventListener("open-cookie-preferences", handleOpenModal);
  }, []);

  // Keyboard trap / ESC listener when Customize modal is open
  useEffect(() => {
    if (!showCustomise) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowCustomise(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCustomise]);

  const handleAcceptAll = () => {
    const prefs: CookiePreferences = {
      essential: true,
      functional: true,
      analytics: true,
      timestamp: new Date().toISOString(),
    };
    saveCookiePreferences(prefs);
    setFunctionalConsent(true);
    setAnalyticsConsent(true);
    setShowCustomise(false);
    setIsOpen(false);
  };

  const handleRejectOptional = () => {
    const prefs: CookiePreferences = {
      essential: true,
      functional: false,
      analytics: false,
      timestamp: new Date().toISOString(),
    };
    saveCookiePreferences(prefs);
    setFunctionalConsent(false);
    setAnalyticsConsent(false);
    setShowCustomise(false);
    setIsOpen(false);
  };

  const handleSaveCustom = () => {
    const prefs: CookiePreferences = {
      essential: true,
      functional: functionalConsent,
      analytics: analyticsConsent,
      timestamp: new Date().toISOString(),
    };
    saveCookiePreferences(prefs);
    setShowCustomise(false);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Banner */}
      {!showCustomise && (
        <aside
          className="cookie-banner"
          role="region"
          aria-label="Cookie consent banner"
        >
          <div className="cookie-banner__inner">
            <div className="cookie-banner__content">
              <h2 className="cookie-banner__title">Cookie & Privacy Choices</h2>
              <p className="cookie-banner__text">
                We use strictly essential cookies to manage your secure session and authenticate requests.
                With your consent, we may also use optional cookies to remember your functional preferences
                and analyse service reliability.
              </p>
            </div>
            <div className="cookie-banner__actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowCustomise(true)}
              >
                Customise
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleRejectOptional}
              >
                Reject Optional
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAcceptAll}
              >
                Accept All
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Customise Preferences Modal */}
      {showCustomise && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-modal-title"
        >
          <div className="modal-dialog cookie-modal" ref={modalRef}>
            <div className="modal-header">
              <h2 id="cookie-modal-title" className="modal-title">Cookie Preferences</h2>
              <button
                type="button"
                className="modal-close"
                aria-label="Close preferences dialog"
                onClick={() => setShowCustomise(false)}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="modal-body">
              <p className="cookie-modal__intro">
                Review and customise your cookie choices below. Essential cookies are required for the
                application to function securely and cannot be disabled. All optional categories are
                opt-in and unchecked by default.
              </p>

              {/* Category: Essential */}
              <div className="cookie-category">
                <div className="cookie-category__header">
                  <div className="cookie-category__title-group">
                    <h3 className="cookie-category__title">Strictly Essential Cookies</h3>
                    <span className="badge badge-required">Required</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled={true}
                    aria-label="Strictly Essential Cookies (Always Active)"
                    className="cookie-checkbox"
                  />
                </div>
                <p className="cookie-category__desc">
                  Required for secure authentication, cross-site request forgery prevention, session
                  continuity, and persisting your cookie preferences.
                </p>
                <div className="cookie-table-wrapper">
                  <table className="cookie-table">
                    <thead>
                      <tr>
                        <th>Cookie Name</th>
                        <th>Purpose</th>
                        <th>Lifetime</th>
                        <th>Security</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><code>access_token</code></td>
                        <td>Authentication session JWT</td>
                        <td>60 minutes</td>
                        <td>HttpOnly, Secure, Lax</td>
                      </tr>
                      <tr>
                        <td><code>logged_in</code></td>
                        <td>UI authentication indicator</td>
                        <td>60 minutes</td>
                        <td>Secure, Lax</td>
                      </tr>
                      <tr>
                        <td><code>user_role</code></td>
                        <td>Role-based navigation routing</td>
                        <td>60 minutes</td>
                        <td>Secure, Lax</td>
                      </tr>
                      <tr>
                        <td><code>cookie_consent</code></td>
                        <td>Consent preferences storage</td>
                        <td>180 days</td>
                        <td>Lax</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Category: Functional */}
              <div className="cookie-category">
                <div className="cookie-category__header">
                  <div className="cookie-category__title-group">
                    <h3 className="cookie-category__title">Functional Preferences</h3>
                    <span className="badge badge-optional">Optional</span>
                  </div>
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      checked={functionalConsent}
                      onChange={(e) => setFunctionalConsent(e.target.checked)}
                      aria-label="Allow Functional Preferences cookies"
                      className="cookie-checkbox"
                    />
                  </label>
                </div>
                <p className="cookie-category__desc">
                  Preserves your interface customisations, filter presets, and UI display density across visits.
                </p>
              </div>

              {/* Category: Analytics */}
              <div className="cookie-category">
                <div className="cookie-category__header">
                  <div className="cookie-category__title-group">
                    <h3 className="cookie-category__title">Analytics & Performance</h3>
                    <span className="badge badge-optional">Optional</span>
                  </div>
                  <label className="switch-label">
                    <input
                      type="checkbox"
                      checked={analyticsConsent}
                      onChange={(e) => setAnalyticsConsent(e.target.checked)}
                      aria-label="Allow Analytics & Performance cookies"
                      className="cookie-checkbox"
                    />
                  </label>
                </div>
                <p className="cookie-category__desc">
                  Helps us understand platform performance and error rates. No third-party ad networks or
                  tracking pixels are deployed.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleRejectOptional}
              >
                Reject All Optional
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleSaveCustom}
              >
                Save Preferences
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAcceptAll}
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
