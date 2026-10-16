"""Immediate preview API for Person 2's ingestion and sanitisation pipeline.

This endpoint intentionally stops before ranking or persistence.  It is useful
for checking what a submitted resume becomes after validation, extraction, PII
redaction, and the prompt-injection scan.
"""
from __future__ import annotations

import io
import time
import zipfile

from fastapi import APIRouter, Depends, File, UploadFile

from app.ingestion.extractor import ExtractionError, extract_text
from app.ingestion.validator import ValidationError, check_pdf, check_zip
from app.models import ProcessingFileResult, ProcessingResponse, UserRole
from app.security import CurrentUser, require_roles
from app.sanitisation.adversarial import scan_safe
from app.sanitisation.anonymiser import anonymise

router = APIRouter()


def _process_pdf(filename: str, pdf_bytes: bytes) -> ProcessingFileResult:
    """Run M.3–M.6 for a single PDF and keep failures and stage timings visible to the UI."""
    t_start = time.perf_counter()

    # Stage 1: Data Ingestion / Validation
    t_ingest_start = time.perf_counter()
    try:
        # ``python-magic`` uses native state and is not safe to invoke from
        # FastAPI's worker thread on every platform. Validation is small and
        # bounded by the upload limit, so keep it on the request thread.
        check_pdf(pdf_bytes)
        ingestion_time = round(time.perf_counter() - t_ingest_start, 4)
    except ValidationError as exc:
        ingestion_time = round(time.perf_counter() - t_ingest_start, 4)
        total_time = round(time.perf_counter() - t_start, 4)
        return ProcessingFileResult(
            filename=filename,
            status="failed",
            validation_passed=False,
            error=str(exc),
            ingestion_time_sec=ingestion_time,
            total_time_sec=total_time,
        )

    # Stage 2: Data Extraction
    t_extract_start = time.perf_counter()
    try:
        extracted_text = extract_text(pdf_bytes)
        extraction_time = round(time.perf_counter() - t_extract_start, 4)
    except ExtractionError as exc:
        extraction_time = round(time.perf_counter() - t_extract_start, 4)
        total_time = round(time.perf_counter() - t_start, 4)
        return ProcessingFileResult(
            filename=filename,
            status="failed",
            validation_passed=True,
            error=str(exc),
            ingestion_time_sec=ingestion_time,
            extraction_time_sec=extraction_time,
            total_time_sec=total_time,
        )

    # Stage 3: Data Processing (Sanitisation & Adversarial Prompt-Injection Scan)
    t_proc_start = time.perf_counter()
    anonymised_text = anonymise(extracted_text)
    safety_passed, safety_reason = scan_safe(anonymised_text)
    processing_time = round(time.perf_counter() - t_proc_start, 4)
    total_time = round(time.perf_counter() - t_start, 4)

    return ProcessingFileResult(
        filename=filename,
        status="accepted" if safety_passed else "rejected",
        validation_passed=True,
        extracted_text=extracted_text,
        anonymised_text=anonymised_text,
        safety_passed=safety_passed,
        safety_reason=safety_reason or None,
        ingestion_time_sec=ingestion_time,
        extraction_time_sec=extraction_time,
        processing_time_sec=processing_time,
        total_time_sec=total_time,
    )


@router.post("/preview", response_model=ProcessingResponse)
async def preview_processing(
    file: UploadFile = File(..., description="A PDF resume or ZIP of PDF resumes"),
    user: CurrentUser = Depends(require_roles(UserRole.candidate, UserRole.recruiter, UserRole.admin)),
) -> ProcessingResponse:
    """Return the direct output of validation, extraction, anonymisation and scan with timing metrics."""
    t_total_start = time.perf_counter()
    t_ingest_start = time.perf_counter()
    file_bytes = await file.read()
    filename = file.filename or "uploaded-file"

    print(f"\n================================================================================")
    print(f"[PREVIEW PROCESSING STARTED] File: {filename} ({len(file_bytes)} bytes)")
    print(f"================================================================================")

    if filename.lower().endswith(".zip"):
        try:
            pdf_names = check_zip(file_bytes)
            ingestion_time = round(time.perf_counter() - t_ingest_start, 3)
            print(f"[DATA INGESTION COMPLETED] Time spent on Data Ingestion = {ingestion_time:.3f}s (ZIP archive unpacked, {len(pdf_names)} candidate PDFs)")
        except ValidationError as exc:
            ingestion_time = round(time.perf_counter() - t_ingest_start, 3)
            total_time = round(time.perf_counter() - t_total_start, 3)
            print(f"[DATA INGESTION FAILED] ZIP validation error after {ingestion_time:.3f}s: {exc}")
            results = [ProcessingFileResult(
                filename=filename,
                status="failed",
                validation_passed=False,
                error=str(exc),
                ingestion_time_sec=ingestion_time,
                total_time_sec=total_time,
            )]
            return ProcessingResponse(
                input_type="zip",
                total_files=1,
                accepted_files=0,
                rejected_files=1,
                files=results,
                ingestion_time_sec=ingestion_time,
                total_time_sec=total_time,
            )

        with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
            pdf_members = [(name, archive.read(name)) for name in pdf_names]
        results = [
            _process_pdf(member_name, member_bytes)
            for member_name, member_bytes in pdf_members
        ]
        input_type = "zip"
    else:
        ingestion_time = round(time.perf_counter() - t_ingest_start, 3)
        print(f"[DATA INGESTION COMPLETED] Time spent on Data Ingestion = {ingestion_time:.3f}s (Single PDF staged)")
        results = [_process_pdf(filename, file_bytes)]
        input_type = "pdf"

    total_extract_time = round(sum(r.extraction_time_sec or 0.0 for r in results), 3)
    total_proc_time = round(sum(r.processing_time_sec or 0.0 for r in results), 3)
    total_time = round(time.perf_counter() - t_total_start, 3)

    print(f"[DATA EXTRACTION COMPLETED] Time spent on Data Extraction = {total_extract_time:.3f}s across {len(results)} file(s)")
    print(f"[DATA PROCESSING COMPLETED] Time spent on Data Processing = {total_proc_time:.3f}s (PII sanitisation & safety scans)")
    print(f"================================================================================")
    print(f"[PREVIEW PROCESSING COMPLETE] Time spent on each part of the process:")
    print(f"   - Time spent on Data Ingestion : {ingestion_time:.3f}s")
    print(f"   - Time spent on Data Extraction: {total_extract_time:.3f}s")
    print(f"   - Time spent on Data Processing: {total_proc_time:.3f}s")
    print(f"   - Total turnaround time        : {total_time:.3f}s")
    print(f"================================================================================\n")

    accepted_files = sum(result.status == "accepted" for result in results)
    return ProcessingResponse(
        input_type=input_type,
        total_files=len(results),
        accepted_files=accepted_files,
        rejected_files=len(results) - accepted_files,
        files=results,
        ingestion_time_sec=ingestion_time,
        extraction_time_sec=total_extract_time,
        processing_time_sec=total_proc_time,
        total_time_sec=total_time,
    )
