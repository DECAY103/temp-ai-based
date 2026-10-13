"""
persistence/cleanup.py — Configurable data retention and cleanup runner.
Safe, idempotent, and preserves active processing data for fault-recovery.
"""
from __future__ import annotations

import logging
from typing import Any

from app.config import settings
from app.persistence import repository

logger = logging.getLogger(__name__)


async def run_retention_cleanup(
    resume_retention_days: int | None = None,
    upload_retention_days: int | None = None,
    token_retention_days: int | None = None,
    log_retention_days: int | None = None,
) -> dict[str, Any]:
    """Execute retention purge using configured or provided retention thresholds."""
    resume_days = resume_retention_days if resume_retention_days is not None else settings.resume_retention_days
    upload_days = upload_retention_days if upload_retention_days is not None else settings.upload_retention_days
    token_days = token_retention_days if token_retention_days is not None else settings.token_retention_days
    log_days = log_retention_days if log_retention_days is not None else settings.activity_log_retention_days

    logger.info(
        "Starting data-retention cleanup (resume_days=%d, upload_days=%d, token_days=%d, log_days=%d)...",
        resume_days, upload_days, token_days, log_days,
    )
    stats = await repository.purge_expired_data(
        resume_retention_days=resume_days,
        upload_retention_days=upload_days,
        token_retention_days=token_days,
        log_retention_days=log_days,
    )
    logger.info("Data-retention cleanup finished: %s", stats)
    return stats
