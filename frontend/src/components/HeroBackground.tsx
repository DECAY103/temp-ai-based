import React from "react";

/**
 * HeroBackground renders subtle layered waves and soft ambient glow
 * behind the landing page hero using strictly the approved brand palette:
 * - Pale Lavender (#EEEBFA)
 * - Light Purple (#BDADEB)
 * - Medium Purple (#8B70DB)
 *
 * All wave fills and strokes use gentle opacities ensuring text contrast
 * remains exceptionally crisp, legible, and WCAG AAA compliant.
 */
export function HeroBackground() {
  return (
    <div className="hero-background-wrapper" aria-hidden="true">
      {/* Soft atmospheric gradient glow behind the hero title */}
      <div className="hero-ambient-glow" />

      {/* Layered smooth bezier curves in the purple palette */}
      <svg
        className="hero-waves-svg"
        viewBox="0 0 1440 520"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Wave Gradient 1: Pale Lavender to Light Purple tint */}
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EEEBFA" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#BDADEB" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#EEEBFA" stopOpacity="0.10" />
          </linearGradient>

          {/* Wave Gradient 2: Light Purple to Medium Purple accent */}
          <linearGradient id="waveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#BDADEB" stopOpacity="0.32" />
            <stop offset="55%" stopColor="#8B70DB" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#EEEBFA" stopOpacity="0.05" />
          </linearGradient>

          {/* Wave Gradient 3: Soft ambient base wave */}
          <linearGradient id="waveGrad3" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#EEEBFA" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Crest Stroke 1 */}
          <linearGradient id="waveStroke1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#BDADEB" stopOpacity="0.15" />
            <stop offset="40%" stopColor="#8B70DB" stopOpacity="0.35" />
            <stop offset="75%" stopColor="#BDADEB" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#BDADEB" stopOpacity="0.08" />
          </linearGradient>

          {/* Crest Stroke 2 */}
          <linearGradient id="waveStroke2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B70DB" stopOpacity="0.08" />
            <stop offset="50%" stopColor="#BDADEB" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#8B70DB" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Deep base wave */}
        <path
          d="M0 210 C320 290 600 120 940 220 C1200 300 1340 230 1440 200 L1440 520 L0 520 Z"
          fill="url(#waveGrad3)"
        />

        {/* Back undulating wave */}
        <path
          d="M0 130 C260 225 500 95 760 180 C1000 265 1220 145 1440 175 L1440 520 L0 520 Z"
          fill="url(#waveGrad1)"
        />

        {/* Crest line for back wave */}
        <path
          d="M0 130 C260 225 500 95 760 180 C1000 265 1220 145 1440 175"
          stroke="url(#waveStroke1)"
          strokeWidth="1.5"
          fill="none"
        />

        {/* Front rolling wave */}
        <path
          d="M0 250 C380 160 690 325 1010 215 C1230 145 1370 215 1440 235 L1440 520 L0 520 Z"
          fill="url(#waveGrad2)"
        />

        {/* Crest line for front wave */}
        <path
          d="M0 250 C380 160 690 325 1010 215 C1230 145 1370 215 1440 235"
          stroke="url(#waveStroke2)"
          strokeWidth="1.2"
          fill="none"
        />
      </svg>
    </div>
  );
}
