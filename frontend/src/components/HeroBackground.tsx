import React from "react";

/**
 * HeroBackground provides a calm, clean ambient background
 * matching the Scandinavian SaaS aesthetic of the reference design,
 * rendered in the approved purple palette.
 */
export function HeroBackground() {
  return (
    <div className="hero-background-wrapper" aria-hidden="true">
      <div className="hero-ambient-glow" />
    </div>
  );
}
