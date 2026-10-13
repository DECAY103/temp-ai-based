/**
 * PasswordStrengthMeter — real-time password strength indicator.
 * Shows a segmented strength bar + checklist of requirements.
 * Used on registration and password reset pages.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import type { PasswordStrength } from "@/lib/api";

interface PasswordStrengthMeterProps {
  password: string;
  onChange?: (strength: PasswordStrength | null) => void;
}

const LABELS: Record<string, string> = {
  min_length: "At least 8 characters",
  has_upper: "Uppercase letter (A-Z)",
  has_lower: "Lowercase letter (a-z)",
  has_digit: "Number (0-9)",
  has_special: "Special character (!@#$…)",
};

const LEVEL_COLORS: Record<string, string> = {
  weak: "#DC3545", // Coral Red
  fair: "#D97706", // Mustard Yellow (accessible text tone)
  good: "#198754", // Liberty Green
  strong: "#198754", // Liberty Green
};

function evaluateLocally(password: string): PasswordStrength {
  const checks: Record<string, boolean> = {
    min_length: password.length >= 8,
    has_upper: /[A-Z]/.test(password),
    has_lower: /[a-z]/.test(password),
    has_digit: /\d/.test(password),
    has_special: /[!@#$%^&*()_+\-=\[\]{}|;':",./<>?`~]/.test(password),
  };
  const score = Object.values(checks).filter(Boolean).length;
  let level: PasswordStrength["level"] = "weak";
  if (score >= 5) level = "strong";
  else if (score >= 4) level = "good";
  else if (score >= 3) level = "fair";
  return { checks, score, level, is_acceptable: score >= 4 };
}

export function PasswordStrengthMeter({ password, onChange }: PasswordStrengthMeterProps) {
  const [strength, setStrength] = useState<PasswordStrength | null>(null);

  const update = useCallback(
    (s: PasswordStrength | null) => {
      setStrength(s);
      onChange?.(s);
    },
    [onChange],
  );

  useEffect(() => {
    if (!password) {
      update(null);
      return;
    }
    update(evaluateLocally(password));
  }, [password, update]);

  if (!strength) return null;

  const color = LEVEL_COLORS[strength.level] ?? LEVEL_COLORS.weak;
  const segments = 5;
  const filled = strength.score;

  return (
    <div className="password-strength" aria-live="polite">
      <div className="strength-bar" role="meter" aria-valuenow={strength.score} aria-valuemin={0} aria-valuemax={5} aria-label={`Password strength: ${strength.level}`}>
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className="strength-bar__segment"
            style={{ background: i < filled ? color : "var(--color-linen, #EBEAEA)" }}
          />
        ))}
      </div>
      <p className="strength-label" style={{ color }}>
        {strength.level.charAt(0).toUpperCase() + strength.level.slice(1)}
        {!strength.is_acceptable && <span className="strength-hint"> — must be at least Good</span>}
      </p>
      <ul className="strength-checks">
        {Object.entries(strength.checks).map(([key, ok]) => (
          <li key={key} className={ok ? "check-pass" : "check-fail"}>
            <span className="check-icon" style={{ display: "inline-flex", alignItems: "center", marginRight: "6px" }}>
              {ok ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="8" />
                </svg>
              )}
            </span>
            <span>{LABELS[key] ?? key}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
