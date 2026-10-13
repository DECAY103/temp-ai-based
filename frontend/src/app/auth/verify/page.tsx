/**
 * 2FA verification page — supports both email-OTP and TOTP.
 * Pre-fetches dashboard routes and validates OTP instantly on 6th digit entry.
 */
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { authApi } from "@/lib/api";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const tempToken = params.get("temp_token") ?? "";
  const otpMode = params.get("otp_mode") ?? "email";
  const hint = params.get("hint") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  // Pre-fetch destination routes in the background while user reads code
  useEffect(() => {
    router.prefetch("/recruiter");
    router.prefetch("/candidate");
    router.prefetch("/admin");
  }, [router]);

  const doVerify = async (cleanCode: string) => {
    if (isSubmittingRef.current) return;
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) return;
    if (!tempToken) {
      setError("Verification session has expired or is invalid. Please sign in again.");
      return;
    }

    isSubmittingRef.current = true;
    setError(null);
    setLoading(true);

    try {
      const { access_token, role: userRole, last_login_at } = await authApi.verify(tempToken, cleanCode);
      if (typeof window !== "undefined") {
        if (access_token) {
          localStorage.setItem("access_token", access_token);
          document.cookie = `access_token=${access_token}; path=/; max-age=86400; SameSite=Lax;`;
          document.cookie = `logged_in=1; path=/; max-age=86400; SameSite=Lax;`;
          document.cookie = `user_role=${userRole}; path=/; max-age=86400; SameSite=Lax;`;
        }
        localStorage.setItem("user_role", userRole);
        localStorage.setItem("user_last_login", last_login_at || "first_login");
      }
      const destination = userRole === "admin" ? "/admin" : userRole === "recruiter" ? "/recruiter" : "/candidate";
      router.push(destination);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed. Please check the code and try again.");
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim();

    if (!tempToken) {
      setError("Verification session has expired or is invalid. Please sign in again.");
      return;
    }
    if (!cleanCode) {
      setError("Please enter your 6-digit verification code.");
      return;
    }
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setError("The verification code must be exactly 6 digits.");
      return;
    }

    await doVerify(cleanCode);
  }

  const isEmail = otpMode === "email";

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

        <h1 className="auth-title">Two-factor verification</h1>
        <p className="auth-subtitle">
          {hint ||
            (isEmail
              ? "A 6-digit code was sent to your email address."
              : "Enter the 6-digit code from your authenticator app.")}
        </p>

        {isEmail && (
          <div className="otp-email-badge">
            <span>📧</span> Check your inbox — the code expires in 10 minutes
          </div>
        )}

        <form className="form-stack" onSubmit={handleSubmit} style={{ marginTop: "20px" }}>
          <div>
            <label className="field-label" htmlFor="2fa-code">
              {isEmail ? "Email verification code" : "Authenticator code"}
            </label>
            <input
              id="2fa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              value={code}
              autoFocus
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                setCode(digits);
                if (error && digits.length === 6) {
                  setError(null);
                }
                if (digits.length === 6 && !loading) {
                  void doVerify(digits);
                }
              }}
              required
              className="otp-input"
            />
          </div>
          {error && <p className="message error-message" role="alert">{error}</p>}
          <button
            className="primary auth-submit-btn"
            id="verify-submit"
            type="submit"
            disabled={loading || code.trim().length !== 6}
          >
            {loading ? "Verifying…" : "Verify →"}
          </button>
        </form>

        <div className="auth-footer-links" style={{ marginTop: "16px" }}>
          <button className="link-button" onClick={() => router.push("/auth/login")}>
            ← Back to sign in
          </button>
        </div>
      </section>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <main className="auth-shell">
        <section className="auth-card-v2">
          <p style={{ color: "var(--muted)", textAlign: "center" }}>Loading…</p>
        </section>
      </main>
    }>
      <VerifyForm />
    </Suspense>
  );
}
