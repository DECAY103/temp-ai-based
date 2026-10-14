/**
 * Login page — credential submission + 2FA initiation.
 * Owner: Person 1 (M.2)
 *
 * Supports both email-OTP mode (default) and TOTP mode depending on the
 * server's OTP_MODE setting (returned in the login/register response).
 */
"use client";

import { useEffect, useState } from "react";
import { authApi } from "@/lib/api";
import type { PasswordStrength } from "@/lib/api";
import { useRouter } from "next/navigation";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [registerMode, setRegisterMode] = useState(false);
  const [role, setRole] = useState<"candidate" | "recruiter" | "admin">("recruiter");
  const [setupInfo, setSetupInfo] = useState<{ uri: string; mode: string } | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletedNotice, setDeletedNotice] = useState(false);

  useEffect(() => {
    router.prefetch("/auth/verify");
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("deleted") === "1") {
        setDeletedNotice(true);
      }
    }
  }, [router]);

  const registerDisabled = registerMode && (!passwordStrength || !passwordStrength.is_acceptable);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (registerMode) {
        if (registerDisabled) {
          setError("Password is too weak. Please strengthen it before creating your account.");
          setLoading(false);
          return;
        }
        const data = await authApi.register(email, password, role);
        if (data.otp_mode === "totp" && data.otpauth_uri) {
          setSetupInfo({ uri: data.otpauth_uri, mode: "totp" });
        } else {
          setSetupInfo({ uri: "", mode: "email" });
        }
        setLoading(false);
        return;
      }
      const { temp_token, message, otp_mode } = await authApi.login(email, password);
      router.push(
        `/auth/verify?temp_token=${temp_token}&otp_mode=${otp_mode}&hint=${encodeURIComponent(message)}`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-bg-decoration" aria-hidden="true">
        <div className="auth-orb auth-orb--1" />
        <div className="auth-orb auth-orb--2" />
      </div>
      <section className="auth-card-v2">
        <div className="auth-brand">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span className="brand-name">Resume Screening</span>
        </div>

        <h1 className="auth-title">
          {registerMode ? "Create your account" : "Welcome back"}
        </h1>
        <p className="auth-subtitle">
          {registerMode
            ? "Fill in your details to get started."
            : "Sign in to access your dashboard."}
        </p>

        {deletedNotice && (
          <div
            style={{
              background: "var(--good-soft, #EEEBFA)",
              border: "1px solid var(--color-liberty-green, #4729A3)",
              color: "var(--color-liberty-green, #4729A3)",
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "0.85rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Your account has been permanently deleted.</span>
            </span>
            <button
              type="button"
              onClick={() => setDeletedNotice(false)}
              aria-label="Dismiss notice"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-liberty-green, #4729A3)", display: "flex", alignItems: "center" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {setupInfo ? (
          <div className="auth-success-state">
            <div className="auth-success-icon" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="auth-success-heading">Account created!</h2>
            {setupInfo.mode === "totp" ? (
              <>
                <p className="auth-success-body">
                  Scan or copy the setup URI below into your authenticator app
                  (Google Authenticator, Authy, 1Password…).
                </p>
                <code className="setup-uri">{setupInfo.uri}</code>
              </>
            ) : (
              <p className="auth-success-body">
                A 6-digit code will be emailed to you each time you sign in.
                No authenticator app needed.
              </p>
            )}
            <button
              className="primary auth-switch-btn"
              onClick={() => { setSetupInfo(null); setRegisterMode(false); setError(null); }}
            >
              Continue to sign in →
            </button>
          </div>
        ) : (
          <form className="form-stack" onSubmit={handleSubmit}>
            <div>
              <label className="field-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={registerMode ? "new-password" : "current-password"}
              />
              {registerMode && <PasswordStrengthMeter password={password} onChange={setPasswordStrength} />}
            </div>
            {registerMode && (
              <div>
                <label className="field-label" htmlFor="account-role">Account type</label>
                <select id="account-role" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
                  <option value="recruiter">Recruiter</option>
                  <option value="candidate">Candidate</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            )}
            {error && (
              <div className="auth-error-box" role="alert">
                <p className="message error-message">{error}</p>
                {(error.includes("504") || error.includes("Timeout") || error.includes("waking")) && (
                  <button
                    type="button"
                    className="secondary btn-sm"
                    style={{ marginTop: 8, width: "100%" }}
                    onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
                  >
                    Retry Login (after backend wakes)
                  </button>
                )}
              </div>
            )}
            <button
              className="primary auth-submit-btn"
              id="login-submit"
              type="submit"
              disabled={registerDisabled || loading}
            >
              {loading ? "Connecting to backend…" : registerMode ? "Create account" : "Continue →"}
            </button>
          </form>
        )}

        {!setupInfo && (
          <div className="auth-footer-links">
            <button
              className="link-button"
              onClick={() => { setRegisterMode(!registerMode); setSetupInfo(null); setError(null); }}
            >
              {registerMode ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
            {!registerMode && (
              <button className="link-button forgot-link" onClick={() => router.push("/auth/forgot-password")}>
                Forgot password?
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
