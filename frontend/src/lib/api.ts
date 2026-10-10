/**
 * api.ts — typed API client for the FastAPI backend.
 * Owner: Person 1 (M.1, M.2, M.10)
 *
 * All requests go through /api/* which next.config.js proxies to the backend.
 * Add the Authorization header by reading the JWT from cookies/localStorage
 * once auth is implemented.
 *
 * TODO (Person 1): Replace placeholder implementations with real fetch calls.
 */

const BASE = "/api";

// ─── Shared types ────────────────────────────────────────────────────────────

export interface BatchStatus {
  batch_id: string;
  status: "queued" | "extracting" | "scoring" | "pre_filtered" | "completed" | "failed";
  total_files: number;
  processed_files: number;
  failed_files: number;
  pre_filtered_count: number;
  progress_percentage: number;
}

export interface CandidateResult {
  candidate_id: string;
  overall_score: number;
  skill_match_score: number;
  work_experience_score: number;
  matching_skills: string[];
  missing_skills: string[];
  verdict_summary: string;
  cosine_similarity_score: number;
  status: "completed" | "pre_filtered";
}

export interface ProcessingFileResult {
  filename: string;
  status: "accepted" | "rejected" | "failed";
  validation_passed: boolean;
  extracted_text: string | null;
  anonymised_text: string | null;
  safety_passed: boolean | null;
  safety_reason: string | null;
  error: string | null;
}

export interface ProcessingResult {
  input_type: "pdf" | "zip";
  total_files: number;
  accepted_files: number;
  rejected_files: number;
  files: ProcessingFileResult[];
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: "include",
      headers: {
        ...init?.headers,
      },
      ...init,
    });
  } catch (netErr: unknown) {
    const msg = netErr instanceof Error ? netErr.message : "Network error";
    throw new Error(`Could not connect to backend (${msg}). Render may be sleeping or NEXT_PUBLIC_API_URL is invalid.`);
  }

  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (json.detail) {
          errorMessage = typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail);
        } else {
          errorMessage = text;
        }
      } catch {
        if (res.status === 504 || text.includes("504") || text.includes("Gateway Time-out")) {
          errorMessage = "Gateway Timeout (504): Render backend took too long to respond. On the free tier, Render spins down after 15 minutes of inactivity and takes ~50s to wake up. Please wait 30 seconds and try again.";
        } else if (res.status === 502 || text.includes("502") || text.includes("Bad Gateway")) {
          errorMessage = "Bad Gateway (502): Cannot reach Render backend. Check your Render deployment status and ensure NEXT_PUBLIC_API_URL in Vercel is set correctly.";
        } else {
          errorMessage = text || res.statusText;
        }
      }
    } catch {
      // ignore
    }
    throw new Error(errorMessage || `Request failed with HTTP status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Health API ───────────────────────────────────────────────────────────────

export interface HealthStatus {
  status: "ok" | "degraded" | "error" | "waking";
  database?: string;
  otp_mode?: string;
  email_delivery?: string;
  gmail_configured?: boolean;
  smtp_configured?: boolean;
  email_from?: string;
  latencyMs?: number;
  message?: string;
}

export const healthApi = {
  check: async (timeoutMs = 12000): Promise<HealthStatus> => {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${BASE}/health`, {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timer);
      const latency = Date.now() - start;

      if (!res.ok) {
        if (res.status === 504 || res.status === 502) {
          return { status: "waking", latencyMs: latency, message: "Backend is cold-starting on Render (~50s)..." };
        }
        return { status: "error", latencyMs: latency, message: `HTTP ${res.status}: ${res.statusText}` };
      }
      const data = await res.json();
      return {
        status: data.status === "ok" ? "ok" : "degraded",
        database: data.database,
        otp_mode: data.otp_mode,
        email_delivery: data.email_delivery,
        gmail_configured: data.gmail_configured,
        smtp_configured: data.smtp_configured,
        email_from: data.email_from,
        latencyMs: latency,
      };
    } catch (err: unknown) {
      const latency = Date.now() - start;
      const isAbort = err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"));
      return {
        status: isAbort ? "waking" : "error",
        latencyMs: latency,
        message: isAbort ? "Backend is cold-starting on Render (~50s)..." : (err instanceof Error ? err.message : "Offline"),
      };
    }
  },
};

// ─── Auth API (M.2) ───────────────────────────────────────────────────────────

export interface PasswordStrength {
  checks: Record<string, boolean>;
  score: number;
  level: "weak" | "fair" | "good" | "strong";
  is_acceptable: boolean;
}

export interface ActivityLogEntry {
  id: string;
  user_id: string | null;
  email: string | null;
  action: string;
  detail: string | null;
  ip_address: string | null;
  created_at: string;
}

export const authApi = {
  register: (email: string, password: string, role: "candidate" | "recruiter") =>
    request<{ message: string; otpauth_uri: string; otp_mode: string }>("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    }),
  login: (email: string, password: string) =>
    request<{ temp_token: string; message: string; otp_mode: string }>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),

  verify: (temp_token: string, code: string) =>
    request<{ access_token: string; token_type: string; role: string; last_login_at: string | null }>("/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ temp_token, code }),
    }),

  checkPasswordStrength: (password: string) =>
    request<PasswordStrength>("/auth/password-strength", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, new_password: string) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password }),
    }),

  getActivityLogs: () =>
    request<{ logs: ActivityLogEntry[] }>("/auth/activity-logs"),
};

// ─── Candidates API (M.1 / M.3) ──────────────────────────────────────────────

export const candidatesApi = {
  /** Upload a single PDF résumé. Returns batch_id. */
  upload: async (file: File, jobId: string): Promise<string> => {
    const form = new FormData();
    form.append("file", file);
    form.append("job_id", jobId);
    const data = await request<{ batch_id: string }>("/candidates/upload", {
      method: "POST",
      body: form,
    });
    return data.batch_id;
  },
};

// ─── Jobs API (M.3 / M.9 / M.10) ────────────────────────────────────────────

export const jobsApi = {
  /** Upload a ZIP batch + rubric. Returns batch_id. */
  uploadBatch: async (file: File, rubric: string): Promise<string> => {
    const form = new FormData();
    form.append("file", file);
    form.append("rubric", rubric);
    const data = await request<{ batch_id: string }>("/jobs/upload", {
      method: "POST",
      body: form,
    });
    return data.batch_id;
  },

  getStatus: (batchId: string) =>
    request<BatchStatus>(`/jobs/${batchId}/status`),

  getResults: async (batchId: string): Promise<CandidateResult[]> => {
    const data = await request<{ batch_id: string; results: CandidateResult[] }>(
      `/jobs/${batchId}/results`
    );
    return data.results;
  },
};

// ─── Ingestion & sanitisation preview (M.3 – M.6) ───────────────────────────

export const processingApi = {
  /** Run the Person 2 pipeline and return its direct, displayable output. */
  preview: async (file: File): Promise<ProcessingResult> => {
    const form = new FormData();
    form.append("file", file);
    return request<ProcessingResult>("/processing/preview", {
      method: "POST",
      body: form,
    });
  },
};
