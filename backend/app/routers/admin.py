"""
admin.py — Administrator routes for system audit, user inspection, forensic reporting,
and destructive database reset.
Protected strictly by require_roles(UserRole.admin).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel

from app.forensic_report import generate_forensic_report
from app.models import UserRole
from app.persistence import repository
from app.security import CurrentUser, require_roles

router = APIRouter(prefix="/admin", tags=["admin"])


class ResetConfirmRequest(BaseModel):
    confirmation: str  # Must match "WIPE" or "RESET"


@router.get("/users")
async def list_users(
    search: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    user: CurrentUser = Depends(require_roles(UserRole.admin)),
) -> list[dict]:
    """List registered users with registration date and last login details."""
    return await repository.list_all_users(search=search, limit=limit)


@router.get("/users/{user_id}/logs")
async def get_user_logs(
    user_id: str,
    limit: int = Query(default=100, ge=1, le=500),
    user: CurrentUser = Depends(require_roles(UserRole.admin)),
) -> list[dict]:
    """Retrieve activity logs for a specific user."""
    return await repository.get_activity_logs(user_id=user_id, limit=limit)


@router.get("/users/{user_id}/report-pdf")
async def export_user_report_pdf(
    user_id: str,
    request: Request,
    user: CurrentUser = Depends(require_roles(UserRole.admin)),
) -> Response:
    """Generate and download a forensic enquiry audit report PDF for the user."""
    target_user = await repository.get_user(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User record not found.")

    activity_logs = await repository.get_activity_logs(user_id=user_id, limit=100)
    all_transfers = await repository.get_transfer_logs(limit=200)
    user_transfers = [t for t in all_transfers if t.get("user_id") == user_id or t.get("email") == target_user.get("email")]

    pdf_bytes = generate_forensic_report(
        user=target_user,
        activity_logs=activity_logs,
        transfer_logs=user_transfers,
        admin_email=user.email,
    )

    # Log report generation in audit trail
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")
    await repository.log_activity(
        "forensic_report_exported",
        user_id=user.user_id,
        email=user.email,
        detail=f"Exported forensic audit report for user {target_user.get('email')} ({user_id})",
        ip_address=ip,
        user_agent=ua,
    )
    await repository.log_transfer(
        user_id=user.user_id,
        email=user.email,
        transfer_type="forensic_report_export",
        filename=f"enquiry_report_{user_id[:8]}.pdf",
        filesize_bytes=len(pdf_bytes),
        item_count=1,
        status="success",
        detail=f"Generated PDF for subject {target_user.get('email')}",
        ip_address=ip,
        user_agent=ua,
    )

    filename = f"forensic_report_{target_user.get('email', 'user').split('@')[0]}_{user_id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/activity-logs")
async def get_all_activity_logs(
    limit: int = Query(default=150, ge=1, le=500),
    user: CurrentUser = Depends(require_roles(UserRole.admin)),
) -> list[dict]:
    """Retrieve system-wide activity logs."""
    return await repository.get_activity_logs(user_id=None, limit=limit)


@router.get("/transfer-logs")
async def get_all_transfer_logs(
    limit: int = Query(default=150, ge=1, le=500),
    user: CurrentUser = Depends(require_roles(UserRole.admin)),
) -> list[dict]:
    """Retrieve transfer audit logs (file uploads, resume downloads, exports)."""
    return await repository.get_transfer_logs(limit=limit)


@router.post("/reset-db")
async def wipe_and_reset_database(
    body: ResetConfirmRequest,
    request: Request,
    user: CurrentUser = Depends(require_roles(UserRole.admin)),
) -> dict:
    """
    Destructive action: Permanently erases candidate evaluations, batches,
    audit logs, and non-admin users. Re-seeds default state.
    """
    if body.confirmation.strip().upper() not in {"WIPE", "RESET", "CONFIRM"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid confirmation code. You must type WIPE or RESET to proceed.",
        )

    await repository.reset_database(admin_id=user.user_id, admin_email=user.email)
    return {
        "status": "success",
        "message": "All database tables wiped and reset successfully. Administrator account preserved.",
    }


@router.delete("/users/{user_id}")
async def admin_delete_user(
    user_id: str,
    request: Request,
    user: CurrentUser = Depends(require_roles(UserRole.admin)),
) -> dict:
    """Delete a user account as administrator."""
    target_user = await repository.get_user(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User record not found.")

    if str(target_user["id"]) == str(user.user_id):
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own administrator session from this table. Use self-service account deletion.",
        )

    success = await repository.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete user record.")

    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")
    await repository.log_activity(
        "admin_deleted_user",
        user_id=user.user_id,
        email=user.email,
        detail=f"Admin deleted user {target_user.get('email')} ({user_id})",
        ip_address=ip,
        user_agent=ua,
    )
    return {
        "status": "success",
        "message": f"User {target_user.get('email')} successfully deleted.",
    }


class RetentionCleanupRequest(BaseModel):
    resume_retention_days: int | None = None
    upload_retention_days: int | None = None
    token_retention_days: int | None = None
    log_retention_days: int | None = None


@router.post("/retention/cleanup")
async def trigger_retention_cleanup(
    request: Request,
    body: RetentionCleanupRequest | None = None,
    user: CurrentUser = Depends(require_roles(UserRole.admin)),
) -> dict:
    """Trigger configurable data-retention cleanup of expired resumes, archives, and tokens."""
    from app.persistence.cleanup import run_retention_cleanup

    req = body or RetentionCleanupRequest()
    stats = await run_retention_cleanup(
        resume_retention_days=req.resume_retention_days,
        upload_retention_days=req.upload_retention_days,
        token_retention_days=req.token_retention_days,
        log_retention_days=req.log_retention_days,
    )

    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")
    await repository.log_activity(
        "retention_cleanup_executed",
        user_id=user.user_id,
        email=user.email,
        detail=f"Retention cleanup executed: {stats}",
        ip_address=ip,
        user_agent=ua,
    )
    return {
        "status": "success",
        "message": "Data-retention cleanup completed successfully.",
        "stats": stats,
    }


