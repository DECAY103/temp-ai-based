# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Recruiters & Hiring Managers (Primary)**: HR and technical recruiters evaluating candidate pools against structured job requirements. They upload candidate batches (ZIP archives up to 50 MB) or review portal submissions, configure job rubrics (skills, required experience), monitor real-time background processing, and inspect candidate rankings, sub-score breakdowns, and skill gap analyses on the leaderboard.
- **Job Candidates (Secondary)**: Applicants submitting individual resumes (PDF up to 5 MB) linked to a specific recruiter job batch ID, receiving transparent, objective, and anonymised screening feedback.
- **System Administrators**: Technical administrators managing user accounts, enforcing role-based access control (RBAC), and auditing background pipeline health and data cleanup routines.

## Product Purpose

Minimise recruiter screening time and eliminate demographic bias through automated PII stripping, adversarial prompt-injection scanning, and a two-stage AI evaluation pipeline that scores candidates against recruiter-defined job rubrics. Success means delivering objective, reproducible, and explainable candidate rankings with clear competency and tenure gap breakdowns while strictly protecting candidate privacy.

## Positioning

A bias-mitigated, privacy-first decision support system that strips personal identifiers and filters prompt injection attacks *before* evaluation. It combines fast local transformer embeddings (`sentence-transformers/all-MiniLM-L6-v2`) for semantic pre-filtering with deep structured LLM evaluation (`Gemini 2.5 Flash`) against explicit job rubrics—producing verifiable sub-scores and itemised gap analyses rather than opaque, subjective rejections.

## Operating Context

- **Recruiter Workspace**: High-density desktop dashboard featuring batch uploads, live progress tracking via status polling, interactive sortable leaderboards, score breakdowns (technical skills vs. experience tenure), and side-by-side candidate comparison modals.
- **Candidate Portal**: Simple, split-layout interface for submitting single PDF resumes and polling application evaluation status.
- **Security & Privacy Framework**: JWT + 2FA authentication, role-based access control (RBAC), backend-enforced batch ownership, granular cookie consent management, and automated retention cleanup routines for uploaded resumes and temporary archives.
- **Design Guidelines Alignment**: Non-governmental web application adhering to the core typography, high contrast, accessibility, and cookie-management principles from the Digital Brand Identity Manual.

## Capabilities and Constraints

- **Ingestion & Sanitisation**:
  - Magic-byte validation and archive inspection (PDF ≤ 5 MB, ZIP ≤ 50 MB).
  - High-fidelity text extraction via PyMuPDF.
  - Automated PII anonymisation stripping names, emails, phone numbers, and physical addresses via regex and spaCy (`en_core_web_sm`).
  - Adversarial prompt-injection detection to prevent resume manipulation attacks.
- **Evaluation Pipeline**:
  - Stage 1: Local semantic cosine similarity (`all-MiniLM-L6-v2`) promoting top candidates.
  - Stage 2: Structured LLM scoring (`Gemini 2.5 Flash`) providing overall scores, technical skill matches, tenure evaluation, and identified gaps.
- **Technical Constraints**:
  - English-only application; no multilingual or translation functionality.
  - Non-government application; no government-specific portals, credentials, or integrations.
  - Code-first UI build path (audited directly in code without pre-generated visual mockup images).

## Brand Commitments

- **Product Name**: AI-based Resume Screening System
- **Academic Attribution**: Department of Information Technology, NITK Surathkal (Contributors: Harsha B, Harshith R, Marthula Venkata Naga Rohith).
- **Voice & Tone**: Objective, analytical, professional, transparent, and privacy-conscious.

## Evidence on Hand

- Recruiter job rubric template: `rubric.json` (specifying title, required skills, and minimum experience).
- Architecture and technical specifications: `README.md`, `instructions.md`, `task.md`, and `DEPLOYMENT.md`.
- Database schema & migrations: `backend/app/persistence/migrations/001_initial.sql`.
- Backend FastAPI engine: `backend/main.py` and routers (`auth`, `jobs`, `candidates`, `processing`, `admin`).
- Frontend Next.js application: `frontend/src/app` (pages for recruiter, candidate, leaderboard, auth, admin) and components.

## Product Principles

1. **Objective & Bias-Free by Construction**: Strip demographic markers (PII) and adversarial exploits before any evaluation occurs; candidates are evaluated strictly on verified qualifications and rubric criteria.
2. **Explainable Decision Support**: Never present a black-box evaluation; provide granular sub-scores (skills vs. experience tenure) and itemised gap analyses so recruiters understand the precise reasoning.
3. **Privacy and Data Minimisation**: Collect only necessary information, provide granular cookie controls, enforce strict backend batch ownership, and run repeatable data retention cleanup for stored resumes.
4. **Resilient Asynchronous Workflows**: Heavy ingestion and two-stage AI evaluations run as robust background batch jobs with real-time status polling and orphan job recovery.

## Accessibility & Inclusion

- Adherence to WCAG 2.1 AA contrast standards for all text, badges, and interactive controls.
- Standardised responsive typography scale based on the Digital Brand Identity Manual (H1 36px/24px down to small text 12px/10px) with 1.2–1.5 line heights.
- Accessible data tables with left-aligned textual data, right-aligned numeric metrics, and centred column headers.
- Keyboard-accessible dialogs, focus indicators, and screen-reader-friendly semantic status indicators.
