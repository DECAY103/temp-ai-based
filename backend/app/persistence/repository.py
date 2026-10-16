"""Database CRUD for authentication, jobs, and evaluation records."""
from __future__ import annotations

import json
from typing import Any, Optional

from app.database import get_pool
from app.models import BatchStatus, CandidateResult, UnifiedEvaluationSchema, UserRole


def _json(value: Any) -> str:
    return json.dumps(value if value is not None else {})


async def create_user(email: str, password_hash: str, role: UserRole, totp_secret: str) -> dict:
    pool = get_pool()
    async with pool.acquire() as conn:
        try:
            row = await conn.fetchrow(
                "INSERT INTO users (email, password_hash, role, totp_secret) VALUES ($1,$2,$3,$4) RETURNING id,email,role,totp_secret",
                email.lower(), password_hash, role.value, totp_secret,
            )
        except Exception as exc:
            if getattr(exc, "sqlstate", None) == "23505":
                raise ValueError("An account with that email already exists.") from exc
            raise
    return dict(row)


async def get_user_by_email(email: str) -> Optional[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id,email,password_hash,role,totp_secret,last_login_at FROM users WHERE email=$1", email.lower())
    return dict(row) if row else None


async def get_user(user_id: str) -> Optional[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id,email,password_hash,role,totp_secret,last_login_at,created_at FROM users WHERE id=$1::uuid", user_id)
    return dict(row) if row else None


async def update_last_login(user_id: str) -> Optional[str]:
    """Set last_login_at to NOW() and return the *previous* value in a single atomic CTE round-trip."""
    pool = get_pool()
    query = """
        WITH prev AS (
            SELECT last_login_at FROM users WHERE id = $1::uuid
        )
        UPDATE users
        SET last_login_at = NOW()
        WHERE id = $1::uuid
        RETURNING (SELECT last_login_at FROM prev) AS previous;
    """
    async with pool.acquire() as conn:
        previous = await conn.fetchval(query, user_id)
    if previous:
        return previous.isoformat()
    return None


async def update_password(user_id: str, new_password_hash: str) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute("UPDATE users SET password_hash=$1 WHERE id=$2::uuid", new_password_hash, user_id)


async def delete_user(user_id: str) -> bool:
    """Permanently delete a user account, owned batches, evaluations, and tokens.
    Anonymises activity and transfer logs so personal identifiers are wiped."""
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            user = await conn.fetchrow("SELECT id, email FROM users WHERE id=$1::uuid", user_id)
            if not user:
                return False
            user_email = user["email"]

            # Anonymise audit logs associated with this user
            await conn.execute(
                "UPDATE activity_logs SET email='[DELETED_USER]', ip_address=NULL, user_agent=NULL WHERE user_id=$1::uuid OR email=$2",
                user_id, user_email,
            )
            await conn.execute(
                "UPDATE transfer_audit_logs SET email='[DELETED_USER]', ip_address=NULL, user_agent=NULL WHERE user_id=$1::uuid OR email=$2",
                user_id, user_email,
            )
            # Delete batches owned by this user (cascades to candidate_evaluations)
            await conn.execute("DELETE FROM batch_jobs WHERE user_id=$1::uuid", user_id)
            # Delete any candidate evaluations directly linked to this user
            await conn.execute("DELETE FROM candidate_evaluations WHERE user_id=$1::uuid", user_id)
            # Invalidate/delete tokens and OTPs
            await conn.execute("DELETE FROM email_otp_codes WHERE user_id=$1::uuid", user_id)
            await conn.execute("DELETE FROM password_reset_tokens WHERE user_id=$1::uuid", user_id)
            await conn.execute("DELETE FROM revoked_tokens WHERE user_id=$1::uuid", user_id)
            # Delete user record
            res = await conn.execute("DELETE FROM users WHERE id=$1::uuid", user_id)
            return res.endswith("1")


# ─── Email OTP ────────────────────────────────────────────────────────────────

async def create_email_otp(user_id: str, code_hash: str, expires_at) -> None:
    """Invalidate any existing unused codes for the user and store the new code in a single atomic database round-trip."""
    pool = get_pool()
    query = """
        WITH invalidated AS (
            UPDATE email_otp_codes
            SET used = TRUE
            WHERE user_id = $1::uuid AND used = FALSE
            RETURNING id
        )
        INSERT INTO email_otp_codes (user_id, code, expires_at)
        VALUES ($1::uuid, $2, $3);
    """
    async with pool.acquire() as conn:
        await conn.execute(query, user_id, code_hash, expires_at)


async def verify_and_consume_email_otp(user_id: str, code_hash: str) -> Optional[dict]:
    """Verify the OTP, consume it, update last_login_at, and return user details in 1 single atomic round-trip.
    Returns dict with keys: user_id, email, role, previous_login, verified (bool).
    Returns None if user does not exist.
    """
    pool = get_pool()
    query = """
        WITH target_user AS (
            SELECT id, email, role, last_login_at
            FROM users
            WHERE id = $1::uuid
        ),
        target_otp AS (
            SELECT id, code
            FROM email_otp_codes
            WHERE user_id = $1::uuid AND used = FALSE AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
        ),
        mark_otp AS (
            UPDATE email_otp_codes
            SET used = TRUE
            WHERE id = (SELECT id FROM target_otp WHERE code = $2)
            RETURNING id
        ),
        upd_user AS (
            UPDATE users
            SET last_login_at = NOW()
            WHERE id = $1::uuid AND EXISTS (SELECT 1 FROM mark_otp)
            RETURNING id
        )
        SELECT 
            u.id AS user_id,
            u.email,
            u.role,
            u.last_login_at AS previous_login,
            EXISTS(SELECT 1 FROM mark_otp) AS verified
        FROM target_user u;
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, user_id, code_hash)
    if not row:
        return None
    res = dict(row)
    if res.get("previous_login"):
        res["previous_login"] = res["previous_login"].isoformat()
    return res


async def get_valid_email_otp(user_id: str) -> Optional[dict]:
    """Return the most recent unused, non-expired OTP row for the user."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id,code,expires_at FROM email_otp_codes WHERE user_id=$1::uuid AND used=FALSE AND expires_at>NOW() ORDER BY created_at DESC LIMIT 1",
            user_id,
        )
    return dict(row) if row else None


async def mark_email_otp_used(otp_id: str) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute("UPDATE email_otp_codes SET used=TRUE WHERE id=$1::uuid", otp_id)


# ─── Activity Logs ────────────────────────────────────────────────────────────

async def log_activity(
    action: str,
    *,
    user_id: str | None = None,
    email: str | None = None,
    detail: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO activity_logs (user_id,email,action,detail,ip_address,user_agent) VALUES ($1::uuid,$2,$3,$4,$5,$6)",
            user_id, email, action, detail, ip_address, user_agent,
        )


async def get_activity_logs(user_id: str | None = None, limit: int = 50) -> list[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        if user_id:
            rows = await conn.fetch(
                "SELECT id,user_id,email,action,detail,ip_address,user_agent,created_at FROM activity_logs WHERE user_id=$1::uuid ORDER BY created_at DESC LIMIT $2",
                user_id, limit,
            )
        else:
            rows = await conn.fetch(
                "SELECT id,user_id,email,action,detail,ip_address,user_agent,created_at FROM activity_logs ORDER BY created_at DESC LIMIT $1",
                limit,
            )
    return [
        {
            "id": str(r["id"]),
            "user_id": str(r["user_id"]) if r["user_id"] else None,
            "email": r["email"],
            "action": r["action"],
            "detail": r["detail"],
            "ip_address": r["ip_address"],
            "user_agent": r["user_agent"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else "",
        }
        for r in rows
    ]


# ─── Password Reset Tokens ────────────────────────────────────────────────────

async def create_password_reset_token(user_id: str, token: str, expires_at) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO password_reset_tokens (user_id,token,expires_at) VALUES ($1::uuid,$2,$3)",
            user_id, token, expires_at,
        )


async def get_valid_reset_token(token: str) -> Optional[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id,user_id,token,expires_at FROM password_reset_tokens WHERE token=$1 AND used=FALSE AND expires_at > NOW()",
            token,
        )
    return dict(row) if row else None


async def mark_reset_token_used(token: str) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute("UPDATE password_reset_tokens SET used=TRUE WHERE token=$1", token)


async def create_batch_job(
    batch_id: str,
    total_files: int,
    rubric: Any,
    upload_bytes: bytes,
    upload_filename: str,
    parent_batch_id: str | None = None,
    user_id: str | None = None,
) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO batch_jobs (batch_id,total_files,rubric,upload_bytes,upload_filename,parent_batch_id,user_id) VALUES ($1::uuid,$2,$3::jsonb,$4,$5,$6::uuid,$7::uuid)",
            batch_id, total_files, _json(rubric), upload_bytes, upload_filename, parent_batch_id, user_id,
        )


async def get_batch_metadata(batch_id: str) -> Optional[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT batch_id, user_id, parent_batch_id, status FROM batch_jobs WHERE batch_id=$1::uuid",
            batch_id,
        )
    return dict(row) if row else None


async def get_batch_owner(batch_id: str) -> str | None:
    pool = get_pool()
    async with pool.acquire() as conn:
        val = await conn.fetchval("SELECT user_id FROM batch_jobs WHERE batch_id=$1::uuid", batch_id)
        return str(val) if val else None


async def get_candidate_evaluation_owner(batch_id: str, candidate_id: str) -> str | None:
    pool = get_pool()
    async with pool.acquire() as conn:
        val = await conn.fetchval(
            "SELECT user_id FROM candidate_evaluations WHERE batch_id=$1::uuid AND candidate_id=$2::uuid",
            batch_id, candidate_id,
        )
        return str(val) if val else None


async def increment_batch_total_files(batch_id: str) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute("UPDATE batch_jobs SET total_files=total_files+1 WHERE batch_id=$1::uuid", batch_id)


# ─── Batch Timing Metrics ───────────────────────────────────────────────────

_batch_timings: dict[str, dict[str, Any]] = {}


def start_batch_timing(batch_id: str) -> None:
    import time
    _batch_timings[str(batch_id)] = {
        "start_time": time.perf_counter(),
        "ingestion_time_sec": None,
        "extraction_time_sec": None,
        "processing_time_sec": None,
        "total_time_sec": None,
    }


def set_batch_timing_stage(batch_id: str, stage: str, elapsed_sec: float) -> None:
    bid = str(batch_id)
    if bid not in _batch_timings:
        start_batch_timing(bid)
    _batch_timings[bid][stage] = round(elapsed_sec, 3)


def get_batch_timings(batch_id: str) -> dict[str, Any]:
    import time
    bid = str(batch_id)
    timings = dict(_batch_timings.get(bid, {}))
    if "start_time" in timings:
        timings["elapsed_time_sec"] = round(time.perf_counter() - timings["start_time"], 1)
    return timings


async def update_batch_timings(
    batch_id: str,
    *,
    ingestion_time_sec: float | None = None,
    extraction_time_sec: float | None = None,
    processing_time_sec: float | None = None,
    total_time_sec: float | None = None,
) -> None:
    bid = str(batch_id)
    if ingestion_time_sec is not None:
        set_batch_timing_stage(bid, "ingestion_time_sec", ingestion_time_sec)
    if extraction_time_sec is not None:
        set_batch_timing_stage(bid, "extraction_time_sec", extraction_time_sec)
    if processing_time_sec is not None:
        set_batch_timing_stage(bid, "processing_time_sec", processing_time_sec)
    if total_time_sec is not None:
        set_batch_timing_stage(bid, "total_time_sec", total_time_sec)

    pool = get_pool()
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """UPDATE batch_jobs SET
                   ingestion_time_sec = COALESCE($1, ingestion_time_sec),
                   extraction_time_sec = COALESCE($2, extraction_time_sec),
                   processing_time_sec = COALESCE($3, processing_time_sec),
                   total_time_sec = COALESCE($4, total_time_sec)
                   WHERE batch_id = $5::uuid""",
                ingestion_time_sec, extraction_time_sec, processing_time_sec, total_time_sec, batch_id
            )
    except Exception:
        # Fallback to in-memory metrics if DB column or connection unavailable
        pass


async def update_batch_status(batch_id: str, status: BatchStatus, error_log: str | None = None) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute("UPDATE batch_jobs SET status=$1,error_log=COALESCE($2,error_log) WHERE batch_id=$3::uuid", status.value, error_log, batch_id)


async def get_batch_status(batch_id: str) -> Optional[dict]:
    pool = get_pool()
    bid = str(batch_id)
    row = None
    try:
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """SELECT b.batch_id,b.status,b.total_files,b.error_log as batch_error_log,
                          b.ingestion_time_sec, b.extraction_time_sec, b.processing_time_sec, b.total_time_sec,
                          COUNT(c.id) FILTER (WHERE c.status IN ('completed','pre_filtered','failed')) processed_files,
                          COUNT(c.id) FILTER (WHERE c.status='failed') failed_files,
                          COUNT(c.id) FILTER (WHERE c.status='pre_filtered') pre_filtered_count,
                          ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.error_log), NULL) as candidate_errors
                   FROM batch_jobs b LEFT JOIN candidate_evaluations c ON c.batch_id=b.batch_id
                   WHERE b.batch_id=$1::uuid GROUP BY b.batch_id""", batch_id)
    except Exception:
        try:
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    """SELECT b.batch_id,b.status,b.total_files,b.error_log as batch_error_log,
                              COUNT(c.id) FILTER (WHERE c.status IN ('completed','pre_filtered','failed')) processed_files,
                              COUNT(c.id) FILTER (WHERE c.status='failed') failed_files,
                              COUNT(c.id) FILTER (WHERE c.status='pre_filtered') pre_filtered_count,
                              ARRAY_REMOVE(ARRAY_AGG(DISTINCT c.error_log), NULL) as candidate_errors
                       FROM batch_jobs b LEFT JOIN candidate_evaluations c ON c.batch_id=b.batch_id
                       WHERE b.batch_id=$1::uuid GROUP BY b.batch_id""", batch_id)
        except Exception:
            row = None
    if not row:
        mem = get_batch_timings(bid)
        if mem:
            return {
                "batch_id": bid,
                "status": "extracting" if not mem.get("extraction_time_sec") else "scoring",
                "total_files": 1,
                "processed_files": 0,
                "failed_files": 0,
                "pre_filtered_count": 0,
                "batch_error_log": None,
                "candidate_errors": [],
                "ingestion_time_sec": mem.get("ingestion_time_sec"),
                "extraction_time_sec": mem.get("extraction_time_sec"),
                "processing_time_sec": mem.get("processing_time_sec"),
                "total_time_sec": mem.get("total_time_sec"),
                "elapsed_time_sec": mem.get("elapsed_time_sec"),
            }
        return None
    res = dict(row)
    mem = get_batch_timings(bid)
    res["ingestion_time_sec"] = res.get("ingestion_time_sec") or mem.get("ingestion_time_sec")
    res["extraction_time_sec"] = res.get("extraction_time_sec") or mem.get("extraction_time_sec")
    res["processing_time_sec"] = res.get("processing_time_sec") or mem.get("processing_time_sec")
    res["total_time_sec"] = res.get("total_time_sec") or mem.get("total_time_sec")
    res["elapsed_time_sec"] = mem.get("elapsed_time_sec")
    return res


async def get_batch_context(batch_id: str) -> Optional[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT batch_id,rubric,upload_bytes,upload_filename,status,user_id FROM batch_jobs WHERE batch_id=$1::uuid", batch_id)
    return dict(row) if row else None


async def list_recoverable_batches() -> list[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT batch_id,rubric,upload_bytes,upload_filename FROM batch_jobs WHERE status=ANY($1::text[])", ["queued", "extracting", "scoring"])
    return [dict(row) for row in rows]


async def upsert_candidate_evaluation(
    batch_id: str,
    candidate_id: str,
    status: BatchStatus,
    cosine_score: float = 0.0,
    evaluation: Optional[UnifiedEvaluationSchema] = None,
    error_log: Optional[str] = None,
    filename: str | None = None,
    resume_bytes: bytes | None = None,
    user_id: str | None = None,
) -> None:
    pool = get_pool()
    payload = json.dumps(evaluation.model_dump()) if evaluation else None
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO candidate_evaluations (batch_id,candidate_id,status,cosine_similarity_score,evaluation,error_log,filename,resume_bytes,user_id)
               VALUES ($1::uuid,$2::uuid,$3,$4,$5::jsonb,$6,$7,$8,$9::uuid)
               ON CONFLICT (batch_id,candidate_id) DO UPDATE SET status=EXCLUDED.status,
               cosine_similarity_score=EXCLUDED.cosine_similarity_score,evaluation=COALESCE(EXCLUDED.evaluation,candidate_evaluations.evaluation),
               error_log=EXCLUDED.error_log,filename=COALESCE(EXCLUDED.filename,candidate_evaluations.filename),
               resume_bytes=COALESCE(EXCLUDED.resume_bytes,candidate_evaluations.resume_bytes),
               user_id=COALESCE(EXCLUDED.user_id,candidate_evaluations.user_id)""",
            batch_id, candidate_id, status.value, cosine_score, payload, error_log, filename, resume_bytes, user_id)


async def get_batch_results(batch_id: str) -> list[CandidateResult]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT candidate_id,status,cosine_similarity_score,evaluation,error_log,filename FROM candidate_evaluations WHERE batch_id=$1::uuid ORDER BY (evaluation->>'overall_score')::float DESC NULLS LAST,cosine_similarity_score DESC", batch_id)
    results: list[CandidateResult] = []
    for row in rows:
        value = row["evaluation"] or {}
        evaluation = json.loads(value) if isinstance(value, str) else value
        prefiltered = row["status"] == "pre_filtered"
        results.append(CandidateResult(
            candidate_id=str(row["candidate_id"]), status=BatchStatus(row["status"]), cosine_similarity_score=float(row["cosine_similarity_score"] or 0),
            overall_score=float(evaluation.get("overall_score", 0)), skill_match_score=float(evaluation.get("skill_match_score", 0)), work_experience_score=float(evaluation.get("work_experience_score", 0)),
            matching_skills=evaluation.get("matching_skills", []), missing_skills=evaluation.get("missing_skills", []),
            verdict_summary=evaluation.get("verdict_summary", "Not selected for detailed evaluation." if prefiltered else row["error_log"] or "Evaluation unavailable."),
            filename=row["filename"],
            error_log=row["error_log"],
        ))
    return results


async def get_candidate_filename(batch_id: str, candidate_id: str) -> str | None:
    pool = get_pool()
    async with pool.acquire() as conn:
        value = await conn.fetchval("SELECT filename FROM candidate_evaluations WHERE batch_id=$1::uuid AND candidate_id=$2::uuid", batch_id, candidate_id)
    return str(value) if value else None


async def get_candidate_resume_bytes(batch_id: str, candidate_id: str) -> bytes | None:
    pool = get_pool()
    async with pool.acquire() as conn:
        value = await conn.fetchval("SELECT resume_bytes FROM candidate_evaluations WHERE batch_id=$1::uuid AND candidate_id=$2::uuid", batch_id, candidate_id)
    return bytes(value) if value else None


async def list_recent_batches(user_id: str | None = None, is_admin: bool = False, limit: int = 25) -> list[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        if is_admin or user_id is None:
            rows = await conn.fetch(
                """SELECT b.batch_id, b.created_at, b.status, b.total_files, b.rubric, b.upload_filename,
                          COUNT(c.id) FILTER (WHERE c.status IN ('completed','pre_filtered','failed')) as candidate_count
                   FROM batch_jobs b
                   LEFT JOIN candidate_evaluations c ON c.batch_id = b.batch_id
                   WHERE b.parent_batch_id IS NULL
                   GROUP BY b.batch_id
                   ORDER BY b.created_at DESC
                   LIMIT $1""", limit)
        else:
            rows = await conn.fetch(
                """SELECT b.batch_id, b.created_at, b.status, b.total_files, b.rubric, b.upload_filename,
                          COUNT(c.id) FILTER (WHERE c.status IN ('completed','pre_filtered','failed')) as candidate_count
                   FROM batch_jobs b
                   LEFT JOIN candidate_evaluations c ON c.batch_id = b.batch_id
                   WHERE b.parent_batch_id IS NULL AND b.user_id = $1::uuid
                   GROUP BY b.batch_id
                   ORDER BY b.created_at DESC
                   LIMIT $2""", user_id, limit)
    results = []
    for r in rows:
        rub = r["rubric"] or {}
        rubric_obj = json.loads(rub) if isinstance(rub, str) else rub
        title = rubric_obj.get("title", "Untitled Job") if isinstance(rubric_obj, dict) else "Job Batch"
        results.append({
            "batch_id": str(r["batch_id"]),
            "created_at": r["created_at"].isoformat() if r["created_at"] else "",
            "status": r["status"],
            "total_files": int(r["total_files"]),
            "candidate_count": int(r["candidate_count"] or 0),
            "title": title,
            "upload_filename": r["upload_filename"] or "",
        })
    return results


# ─── Token Revocation & Invalidation ──────────────────────────────────────────

def _token_hash(token: str) -> str:
    import hashlib
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def revoke_token(token: str, user_id: str, expires_at) -> None:
    pool = get_pool()
    th = _token_hash(token)
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO revoked_tokens (token_hash, user_id, expires_at)
               VALUES ($1, $2::uuid, $3)
               ON CONFLICT (token_hash) DO NOTHING""",
            th, user_id, expires_at,
        )


async def is_token_revoked(token: str) -> bool:
    pool = get_pool()
    th = _token_hash(token)
    async with pool.acquire() as conn:
        val = await conn.fetchval("SELECT 1 FROM revoked_tokens WHERE token_hash=$1 AND expires_at > NOW()", th)
        return val is not None


async def revoke_all_user_tokens(user_id: str) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE users SET tokens_revoked_before=NOW() WHERE id=$1::uuid",
            user_id,
        )


async def get_user_tokens_revoked_before(user_id: str):
    pool = get_pool()
    async with pool.acquire() as conn:
        return await conn.fetchval("SELECT tokens_revoked_before FROM users WHERE id=$1::uuid", user_id)


# ─── Data Retention & Cleanup ────────────────────────────────────────────────

async def purge_expired_data(
    resume_retention_days: int = 30,
    upload_retention_days: int = 30,
    token_retention_days: int = 7,
    log_retention_days: int = 90,
) -> dict[str, int]:
    """Configurable data-retention and cleanup mechanism.
    - Removes expired original resumes from candidate_evaluations.
    - Removes expired upload archives from batch_jobs.
    - Preserves data required by active processing ('queued', 'extracting', 'scoring') and fault recovery.
    - Purges expired OTPs, reset tokens, and revoked token records.
    - Repeatable and safe to run multiple times."""
    pool = get_pool()
    stats = {
        "purged_upload_bytes_batches": 0,
        "purged_candidate_resume_bytes": 0,
        "deleted_expired_otps": 0,
        "deleted_expired_reset_tokens": 0,
        "deleted_expired_revocations": 0,
    }
    async with pool.acquire() as conn:
        async with conn.transaction():
            # 1. Nullify upload_bytes on completed/failed batches older than upload_retention_days
            # Active batches ('queued', 'extracting', 'scoring') are strictly preserved for recovery!
            res1 = await conn.execute(
                """UPDATE batch_jobs
                   SET upload_bytes = NULL
                   WHERE status IN ('completed', 'failed')
                     AND upload_bytes IS NOT NULL
                     AND created_at < NOW() - ($1 || ' days')::INTERVAL""",
                str(upload_retention_days),
            )
            if res1:
                try:
                    stats["purged_upload_bytes_batches"] = int(res1.split()[-1])
                except (ValueError, IndexError):
                    pass

            # 2. Nullify candidate resume_bytes on finished evaluations older than resume_retention_days
            res2 = await conn.execute(
                """UPDATE candidate_evaluations
                   SET resume_bytes = NULL
                   WHERE status IN ('completed', 'pre_filtered', 'failed')
                     AND resume_bytes IS NOT NULL
                     AND created_at < NOW() - ($1 || ' days')::INTERVAL""",
                str(resume_retention_days),
            )
            if res2:
                try:
                    stats["purged_candidate_resume_bytes"] = int(res2.split()[-1])
                except (ValueError, IndexError):
                    pass

            # 3. Clean up expired / used OTP codes older than token_retention_days
            res3 = await conn.execute(
                """DELETE FROM email_otp_codes
                   WHERE (used = TRUE OR expires_at < NOW())
                     AND created_at < NOW() - ($1 || ' days')::INTERVAL""",
                str(token_retention_days),
            )
            if res3:
                try:
                    stats["deleted_expired_otps"] = int(res3.split()[-1])
                except (ValueError, IndexError):
                    pass

            # 4. Clean up expired / used password reset tokens older than token_retention_days
            res4 = await conn.execute(
                """DELETE FROM password_reset_tokens
                   WHERE (used = TRUE OR expires_at < NOW())
                     AND created_at < NOW() - ($1 || ' days')::INTERVAL""",
                str(token_retention_days),
            )
            if res4:
                try:
                    stats["deleted_expired_reset_tokens"] = int(res4.split()[-1])
                except (ValueError, IndexError):
                    pass

            # 5. Clean up expired revoked tokens whose token expiry has already elapsed
            res5 = await conn.execute("DELETE FROM revoked_tokens WHERE expires_at < NOW()")
            if res5:
                try:
                    stats["deleted_expired_revocations"] = int(res5.split()[-1])
                except (ValueError, IndexError):
                    pass

    return stats


async def log_transfer(
    *,
    user_id: str | None = None,
    email: str | None = None,
    transfer_type: str,
    filename: str | None = None,
    filesize_bytes: int | None = None,
    item_count: int = 1,
    status: str = "success",
    detail: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO transfer_audit_logs
               (user_id, email, transfer_type, filename, filesize_bytes, item_count, status, detail, ip_address, user_agent)
               VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10)""",
            user_id, email, transfer_type, filename, filesize_bytes, item_count, status, detail, ip_address, user_agent
        )


async def get_transfer_logs(limit: int = 100) -> list[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, user_id, email, transfer_type, filename, filesize_bytes, item_count, status, detail, ip_address, user_agent, created_at
               FROM transfer_audit_logs
               ORDER BY created_at DESC
               LIMIT $1""",
            limit
        )
    return [
        {
            "id": str(r["id"]),
            "user_id": str(r["user_id"]) if r["user_id"] else None,
            "email": r["email"],
            "transfer_type": r["transfer_type"],
            "filename": r["filename"],
            "filesize_bytes": r["filesize_bytes"],
            "item_count": r["item_count"] or 1,
            "status": r["status"],
            "detail": r["detail"],
            "ip_address": r["ip_address"],
            "user_agent": r["user_agent"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else "",
        }
        for r in rows
    ]


async def list_all_users(search: str | None = None, limit: int = 100) -> list[dict]:
    pool = get_pool()
    async with pool.acquire() as conn:
        if search and search.strip():
            term = f"%{search.strip().lower()}%"
            rows = await conn.fetch(
                """SELECT id, email, role, created_at, last_login_at
                   FROM users
                   WHERE LOWER(email) LIKE $1
                   ORDER BY created_at DESC
                   LIMIT $2""",
                term, limit
            )
        else:
            rows = await conn.fetch(
                """SELECT id, email, role, created_at, last_login_at
                   FROM users
                   ORDER BY created_at DESC
                   LIMIT $1""",
                limit
            )
    return [
        {
            "id": str(r["id"]),
            "email": r["email"],
            "username": r["email"].split("@")[0] if r["email"] else "unknown",
            "role": r["role"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else "",
            "last_login_at": r["last_login_at"].isoformat() if r["last_login_at"] else None,
        }
        for r in rows
    ]


async def reset_database(admin_id: str, admin_email: str) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute("DELETE FROM candidate_evaluations")
            await conn.execute("DELETE FROM batch_jobs")
            await conn.execute("DELETE FROM transfer_audit_logs")
            await conn.execute("DELETE FROM activity_logs")
            await conn.execute("DELETE FROM email_otp_codes")
            await conn.execute("DELETE FROM password_reset_tokens")
            await conn.execute("DELETE FROM users WHERE id != $1::uuid", admin_id)
            await conn.execute(
                """INSERT INTO activity_logs (user_id, email, action, detail)
                   VALUES ($1::uuid, $2, 'db_reset_destructive', 'Wipe All Tables & Reset DB executed by administrator')""",
                admin_id, admin_email
            )
