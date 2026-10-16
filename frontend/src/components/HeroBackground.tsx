import React from "react";

/**
 * HeroBackground renders a soft, elegant light purple gradient ambiance
 * and subtle flowing waves behind the hero section.
 *
 * All wave crest lines and paths are positioned strictly below the hero text
 * area (Y >= 330 in the coordinate space), accompanied by an elliptical
 * clearance mask ensuring NO lines ever cross through the text.
 */
export function HeroBackground() {
  return (
    <div className="hero-background-wrapper" aria-hidden="true">
      {/* Soft atmospheric gradient glow centered behind the hero title */}
      <div className="hero-ambient-glow" />

      {/* Layered smooth bezier curves in the approved brand purple palette */}
      <svg
        className="hero-waves-svg"
        viewBox="0 0 1440 540"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Wave Gradient 1: Pale Lavender to Light Purple tint */}
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EEEBFA" stopOpacity="0.75" />
            <stop offset="45%" stopColor="#BDADEB" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#EEEBFA" stopOpacity="0.08" />
          </linearGradient>

          {/* Wave Gradient 2: Light Purple to Medium Purple accent */}
          <linearGradient id="waveGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#BDADEB" stopOpacity="0.30" />
            <stop offset="55%" stopColor="#8B70DB" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#EEEBFA" stopOpacity="0.04" />
          </linearGradient>

          {/* Wave Gradient 3: Soft ambient base wave */}
          <linearGradient id="waveGrad3" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#EEEBFA" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Crest Stroke 1 */}
          <linearGradient id="waveStroke1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#BDADEB" stopOpacity="0.15" />
            <stop offset="35%" stopColor="#8B70DB" stopOpacity="0.32" />
            <stop offset="70%" stopColor="#BDADEB" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#BDADEB" stopOpacity="0.08" />
          </linearGradient>

          {/* Crest Stroke 2 */}
          <linearGradient id="waveStroke2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B70DB" stopOpacity="0.08" />
            <stop offset="50%" stopColor="#BDADEB" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#8B70DB" stopOpacity="0.10" />
          </linearGradient>

          {/* Text Clearance Mask: Guarantees zero line intersection in the text area */}
          <mask id="heroTextClearanceMask">
            <rect width="1440" height="540" fill="white" />
            {/* Soft cutout over the hero text bounding box */}
            <ellipse cx="720" cy="170" rx="480" ry="175" fill="black" />
          </mask>
        </defs>

        {/* Deep base wave (flows below text at Y >= 330) */}
        <path
          d="M0 340 C320 380 600 355 720 365 C920 375 1180 345 1440 330 L1440 540 L0 540 Z"
          fill="url(#waveGrad3)"
        />

        {/* Back undulating wave */}
        <path
          d="M0 370 C240 405 500 365 720 390 C960 415 1200 360 1440 375 L1440 540 L0 540 Z"
          fill="url(#waveGrad1)"
        />

        {/* Back wave crest line with text clearance mask */}
        <path
          d="M0 370 C240 405 500 365 720 390 C960 415 1200 360 1440 375"
          stroke="url(#waveStroke1)"
          strokeWidth="1.5"
          fill="none"
          mask="url(#heroTextClearanceMask)"
        />

        {/* Front rolling wave */}
        <path
          d="M0 420 C340 390 660 435 720 430 C1000 415 1240 445 1440 415 L1440 540 L0 540 Z"
          fill="url(#waveGrad2)"
        />

        {/* Front wave crest line with text clearance mask */}
        <path
          d="M0 420 C340 390 660 435 720 430 C1000 415 1240 445 1440 415"
          stroke="url(#waveStroke2)"
          strokeWidth="1.2"
          fill="none"
          mask="url(#heroTextClearanceMask)"
        />
      </svg>
    </div>
  );
}
