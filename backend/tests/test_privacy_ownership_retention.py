"""
tests/test_privacy_ownership_retention.py — Tests for batch ownership,
access authorization, account deletion, token revocation, and data retention cleanup.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.models import BatchStatus, UserRole
from app.persistence import repository
from app.persistence.cleanup import run_retention_cleanup
from app.routers.jobs import _verify_batch_access, download_original_resume, get_batch_results, get_batch_status, list_jobs
from app.security import CurrentUser, current_user


# ─── 1. Batch Ownership & Access Control Tests ─────────────────────────────────

@pytest.mark.asyncio
async def test_recruiter_can_only_list_own_batches():
    recruiter_a = CurrentUser(user_id=str(uuid.uuid4()), email="recruiter_a@test.com", role=UserRole.recruiter)
    admin_user = CurrentUser(user_id=str(uuid.uuid4()), email="admin@test.com", role=UserRole.admin)

    with patch("app.persistence.repository.list_recent_batches", new_callable=AsyncMock) as mock_list:
        mock_list.return_value = [{"batch_id": "b1", "title": "Job A"}]

        # Recruiter list call
        await list_jobs(user=recruiter_a)
        mock_list.assert_called_with(user_id=recruiter_a.user_id, is_admin=False, limit=25)

        # Admin list call
        await list_jobs(user=admin_user)
        mock_list.assert_called_with(user_id=admin_user.user_id, is_admin=True, limit=25)


@pytest.mark.asyncio
async def test_cross_user_batch_status_access_denied():
    user_a = CurrentUser(user_id=str(uuid.uuid4()), email="a@test.com", role=UserRole.recruiter)
    user_b = CurrentUser(user_id=str(uuid.uuid4()), email="b@test.com", role=UserRole.recruiter)
    admin = CurrentUser(user_id=str(uuid.uuid4()), email="admin@test.com", role=UserRole.admin)

    batch_meta = {
        "batch_id": "b123",
        "user_id": user_a.user_id,
        "parent_batch_id": None,
        "status": "completed",
    }

    with patch("app.persistence.repository.get_batch_metadata", new_callable=AsyncMock) as mock_meta:
        mock_meta.return_value = batch_meta

        # Owner accesses: succeeds
        allowed = await _verify_batch_access("b123", user=user_a)
        assert allowed == batch_meta

        # Admin accesses: succeeds
        admin_allowed = await _verify_batch_access("b123", user=admin)
        assert admin_allowed == batch_meta

        # Unrelated user accesses: 403 Forbidden
        with pytest.raises(HTTPException) as exc_info:
            await _verify_batch_access("b123", user=user_b)
        assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_cross_user_results_access_denied():
    user_a = CurrentUser(user_id=str(uuid.uuid4()), email="a@test.com", role=UserRole.recruiter)
    user_b = CurrentUser(user_id=str(uuid.uuid4()), email="b@test.com", role=UserRole.recruiter)

    batch_meta = {"batch_id": "b123", "user_id": user_a.user_id, "parent_batch_id": None, "status": "completed"}

    with patch("app.persistence.repository.get_batch_metadata", new_callable=AsyncMock, return_value=batch_meta):
        with pytest.raises(HTTPException) as exc_info:
            await get_batch_results("b123", user=user_b)
        assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_candidate_cannot_download_unowned_resume():
    cand_a = CurrentUser(user_id=str(uuid.uuid4()), email="cand_a@test.com", role=UserRole.candidate)
    cand_b = CurrentUser(user_id=str(uuid.uuid4()), email="cand_b@test.com", role=UserRole.candidate)

    batch_meta = {"batch_id": "b123", "user_id": cand_a.user_id, "parent_batch_id": None, "status": "completed"}

    with patch("app.persistence.repository.get_batch_metadata", new_callable=AsyncMock, return_value=batch_meta), \
         patch("app.persistence.repository.get_candidate_evaluation_owner", new_callable=AsyncMock, return_value=cand_a.user_id):
        # cand_b attempts to download cand_a's resume
        with pytest.raises(HTTPException) as exc_info:
            await download_original_resume("b123", "c999", user=cand_b)
        assert exc_info.value.status_code == 403


# ─── 2. Token Revocation & Invalidation Tests ─────────────────────────────────

@pytest.mark.asyncio
async def test_token_revocation_blocks_authenticated_access():
    user_id = str(uuid.uuid4())
    token = "mock-jwt-token-xyz"

    mock_pool = MagicMock()
    mock_conn = AsyncMock()

    # Simulate token found in revoked_tokens table
    mock_conn.fetchval.return_value = 1
    mock_pool.acquire.return_value.__aenter__.return_value = mock_conn

    with patch("app.persistence.repository.get_pool", return_value=mock_pool):
        is_revoked = await repository.is_token_revoked(token)
        assert is_revoked is True


@pytest.mark.asyncio
async def test_current_user_rejects_revoked_token():
    token = "test-token"
    claims = {"sub": str(uuid.uuid4()), "email": "test@test.com", "role": "recruiter", "iat": int(datetime.now(timezone.utc).timestamp())}

    with patch("jose.jwt.decode", return_value=claims), \
         patch("app.persistence.repository.is_token_revoked", new_callable=AsyncMock, return_value=True):
        with pytest.raises(HTTPException) as exc_info:
            await current_user(authorization=f"Bearer {token}")
        assert exc_info.value.status_code == 401
        assert "revoked" in exc_info.value.detail.lower()


# ─── 3. Account Deletion & Cascading Tests ────────────────────────────────────

def _build_mock_conn():
    mock_conn = MagicMock()
    mock_conn.fetchrow = AsyncMock()
    mock_conn.fetchval = AsyncMock()
    mock_conn.fetch = AsyncMock()
    mock_conn.execute = AsyncMock()
    mock_tx = MagicMock()
    mock_tx.__aenter__ = AsyncMock(return_value=None)
    mock_tx.__aexit__ = AsyncMock(return_value=None)
    mock_conn.transaction.return_value = mock_tx
    return mock_conn


@pytest.mark.asyncio
async def test_delete_user_anonymises_logs_and_cleans_records():
    user_id = str(uuid.uuid4())
    user_email = "testuser@screening.com"

    mock_pool = MagicMock()
    mock_conn = _build_mock_conn()
    # First query fetches user
    mock_conn.fetchrow.return_value = {"id": user_id, "email": user_email}
    # Final execute returns 'DELETE 1'
    mock_conn.execute.return_value = "DELETE 1"

    mock_pool.acquire.return_value.__aenter__.return_value = mock_conn

    with patch("app.persistence.repository.get_pool", return_value=mock_pool):
        success = await repository.delete_user(user_id)
        assert success is True

        # Verify activity logs anonymised to [DELETED_USER]
        executed_sqls = [call.args[0] for call in mock_conn.execute.call_args_list]
        assert any("UPDATE activity_logs SET email='[DELETED_USER]'" in sql for sql in executed_sqls)
        assert any("UPDATE transfer_audit_logs SET email='[DELETED_USER]'" in sql for sql in executed_sqls)
        assert any("DELETE FROM batch_jobs WHERE user_id=$1::uuid" in sql for sql in executed_sqls)
        assert any("DELETE FROM users WHERE id=$1::uuid" in sql for sql in executed_sqls)


@pytest.mark.asyncio
async def test_repeat_delete_user_returns_false():
    user_id = str(uuid.uuid4())

    mock_pool = MagicMock()
    mock_conn = _build_mock_conn()
    # User not found on repeat delete
    mock_conn.fetchrow.return_value = None
    mock_pool.acquire.return_value.__aenter__.return_value = mock_conn

    with patch("app.persistence.repository.get_pool", return_value=mock_pool):
        success = await repository.delete_user(user_id)
        assert success is False


# ─── 4. Data Retention Cleanup Tests ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_purge_expired_data_preserves_active_jobs():
    mock_pool = MagicMock()
    mock_conn = _build_mock_conn()
    mock_conn.execute.side_effect = [
        "UPDATE 5",  # upload_bytes purged
        "UPDATE 12", # resume_bytes purged
        "DELETE 3",  # expired otps
        "DELETE 2",  # expired reset tokens
        "DELETE 1",  # expired revocations
    ]
    mock_pool.acquire.return_value.__aenter__.return_value = mock_conn

    with patch("app.persistence.repository.get_pool", return_value=mock_pool):
        stats = await repository.purge_expired_data(
            resume_retention_days=30,
            upload_retention_days=30,
            token_retention_days=7,
        )

        assert stats["purged_upload_bytes_batches"] == 5
        assert stats["purged_candidate_resume_bytes"] == 12
        assert stats["deleted_expired_otps"] == 3

        # Verify SQL statements protect active jobs ('queued', 'extracting', 'scoring')
        executed_sqls = [call.args[0] for call in mock_conn.execute.call_args_list]
        upload_purge_sql = executed_sqls[0]
        assert "WHERE status IN ('completed', 'failed')" in upload_purge_sql


@pytest.mark.asyncio
async def test_run_retention_cleanup_wrapper():
    with patch("app.persistence.repository.purge_expired_data", new_callable=AsyncMock) as mock_purge:
        mock_purge.return_value = {"purged_upload_bytes_batches": 2}
        result = await run_retention_cleanup(resume_retention_days=15, upload_retention_days=15)
        assert result["purged_upload_bytes_batches"] == 2
        mock_purge.assert_called_once()
