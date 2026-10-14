"""
tests/test_pdf_report_accessibility.py — Tests verifying forensic PDF report generation,
metadata presence, readable typography, and table structure.
"""
from __future__ import annotations

import pymupdf
import pytest

from app.forensic_report import generate_forensic_report


def test_pdf_report_generates_valid_accessible_document():
    dummy_user = {
        "id": "11111111-2222-3333-4444-555555555555",
        "email": "candidate@example.co.uk",
        "role": "candidate",
        "created_at": "2026-10-01T10:00:00Z",
        "last_login_at": "2026-10-12T14:30:00Z",
    }
    activity_logs = [
        {"created_at": "2026-10-12T14:30:00Z", "action": "login_success", "detail": "Web session", "ip_address": "127.0.0.1"},
        {"created_at": "2026-10-12T14:32:00Z", "action": "resume_upload", "detail": "Single PDF", "ip_address": "127.0.0.1"},
    ]
    transfer_logs = [
        {"created_at": "2026-10-12T14:32:00Z", "transfer_type": "upload", "filename": "cv.pdf", "filesize_bytes": 10240, "status": "success"},
    ]

    pdf_bytes = generate_forensic_report(
        user=dummy_user,
        activity_logs=activity_logs,
        transfer_logs=transfer_logs,
        admin_email="compliance@resumescreening.local",
    )

    # 1. Binary validation
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF-")

    # 2. Inspect with PyMuPDF
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    assert doc.page_count >= 1

    # 3. Document metadata inspection (essential for screen readers and search indexing)
    meta = doc.metadata
    assert meta is not None
    assert meta.get("title") == "Forensic Enquiry Audit Report"
    assert "Resume Screening Platform" in (meta.get("author") or "")
    assert "candidate@example.co.uk" in (meta.get("subject") or "")

    # 4. Text content & structure extraction
    first_page = doc[0]
    page_text = first_page.get_text()

    assert "RESUME SCREENING SYSTEM" in page_text
    assert "Forensic Enquiry Audit Report" in page_text
    assert "candidate@example.co.uk" in page_text
    assert "SUBJECT USER RECORD" in page_text
    assert "SECURITY & FORENSIC ACTIVITY TRAIL" in page_text
    assert "CONFIDENTIAL & PRIVILEGED" in page_text

    doc.close()


def test_pdf_report_handles_empty_logs():
    dummy_user = {
        "id": "22222222-3333-4444-5555-666666666666",
        "email": "newuser@example.co.uk",
        "role": "recruiter",
        "created_at": "2026-10-13T09:00:00Z",
    }
    pdf_bytes = generate_forensic_report(
        user=dummy_user,
        activity_logs=[],
        transfer_logs=[],
        admin_email="admin@test.com",
    )

    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    text = doc[0].get_text()
    assert "No activity logs recorded for this account." in text
    assert "No data transfers recorded for this account." in text
    doc.close()


def test_pdf_report_handles_datetime_objects():
    import datetime
    now = datetime.datetime.now(datetime.timezone.utc)
    dummy_user = {
        "id": "33333333-4444-5555-6666-777777777777",
        "email": "datetime_user@example.co.uk",
        "role": "admin",
        "created_at": now,
        "last_login_at": now,
    }
    activity_logs = [
        {"created_at": now, "action": "admin_audit", "detail": "Inspected user", "ip_address": "10.0.0.1"},
    ]
    transfer_logs = [
        {"created_at": now, "transfer_type": "export", "filename": "test.pdf", "filesize_bytes": 2048, "status": "success"},
    ]
    pdf_bytes = generate_forensic_report(
        user=dummy_user,
        activity_logs=activity_logs,
        transfer_logs=transfer_logs,
        admin_email="superadmin@test.com",
    )
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF-")


@pytest.mark.asyncio
async def test_admin_export_pdf_endpoint():
    from httpx import AsyncClient, ASGITransport
    from unittest.mock import patch, AsyncMock
    from jose import jwt
    from app.config import settings
    from main import app

    admin_token = jwt.encode(
        {"sub": "admin-1", "email": "admin@example.com", "role": "admin"},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )

    mock_user = {
        "id": "target-1",
        "email": "user@example.com",
        "role": "candidate",
        "created_at": "2026-10-01T00:00:00Z",
        "last_login_at": None,
    }

    with patch("app.persistence.repository.is_token_revoked", new=AsyncMock(return_value=False)), \
         patch("app.persistence.repository.get_user", new=AsyncMock(side_effect=lambda uid: mock_user if uid == "target-1" else {"id": "admin-1", "email": "admin@example.com", "role": "admin"})), \
         patch("app.persistence.repository.get_user_tokens_revoked_before", new=AsyncMock(return_value=None)), \
         patch("app.persistence.repository.get_activity_logs", new=AsyncMock(return_value=[])), \
         patch("app.persistence.repository.get_transfer_logs", new=AsyncMock(return_value=[])), \
         patch("app.persistence.repository.log_activity", new=AsyncMock()), \
         patch("app.persistence.repository.log_transfer", new=AsyncMock()):

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            # Test 1: Header auth
            res = await client.get(
                "/api/admin/users/target-1/report-pdf",
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert res.status_code == 200
            assert res.headers["content-type"] == "application/pdf"
            assert res.content.startswith(b"%PDF-")

            # Test 2: Query param auth fallback
            res2 = await client.get(
                f"/api/admin/users/target-1/report-pdf?token={admin_token}",
            )
            assert res2.status_code == 200
            assert res2.headers["content-type"] == "application/pdf"
            assert res2.content.startswith(b"%PDF-")

