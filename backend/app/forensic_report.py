"""
forensic_report.py — Generates forensic enquiry audit report PDFs for administrators.
Uses pymupdf with accessible typography, standardised brand palette, and document metadata.

Accessibility Note:
  This generator sets document metadata (Title, Author, Subject, Keywords, Creator)
  and follows high-contrast layout principles (WCAG AAA contrast ratios using
  Deep Earthy Brown on Linen/White). Full PDF/UA semantic tagging (/StructTreeRoot)
  is an architectural limitation of canvas-drawn PyMuPDF documents and requires
  external tag-tree compilers for formal PDF/UA-1 certification.
"""
from __future__ import annotations

import datetime
from typing import Any
import pymupdf


def _format_timestamp(val: Any) -> str:
    """Safely format string, datetime, or None into a standardized UTC timestamp string."""
    if val is None or val == "":
        return "—"
    if isinstance(val, (datetime.datetime, datetime.date)):
        return val.strftime("%Y-%m-%d %H:%M:%S")
    s = str(val).strip()
    return s[:19] if len(s) >= 19 else s


def generate_forensic_report(
    user: dict,
    activity_logs: list[dict],
    transfer_logs: list[dict],
    admin_email: str = "administrator",
) -> bytes:
    doc = pymupdf.open()

    # Set document metadata for assistive technologies
    doc.set_metadata({
        "title": "Forensic Enquiry Audit Report",
        "author": f"Resume Screening Platform (Auditor: {admin_email})",
        "subject": f"Forensic Security Audit Trail for User {user.get('email', 'Unknown')}",
        "creator": "Resume Screening Platform PDF Engine",
        "producer": "PyMuPDF Accessible Forensic Engine",
        "keywords": "audit, forensic, security, resume screening, compliance",
    })
    if hasattr(doc, "set_language"):
        try:
            doc.set_language("en-GB")
        except Exception:
            pass

    page = doc.new_page(width=595, height=842)  # A4 standard

    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # Standardised Brand & Accessibility Palette (Digital Brand Identity Manual)
    # Purple 2 (#4729A3) - Primary Accent
    c_brand = (0.278, 0.161, 0.639)
    # Deep Earthy Brown (#150202) - Body text (AAA contrast on white & linen)
    c_dark = (0.082, 0.008, 0.008)
    # Grey 03 (#606060) - Muted labels
    c_muted = (0.376, 0.376, 0.376)
    # Grey 01 (#C6C6C6) - Dividers & borders
    c_line = (0.776, 0.776, 0.776)
    # Linen (#EBEAEA) - Highlight box background
    c_bg_box = (0.922, 0.918, 0.918)
    # Inclusive (#FFFFFF) - White
    c_white = (1.0, 1.0, 1.0)

    # Header Bar
    page.draw_rect(pymupdf.Rect(40, 40, 555, 42), fill=c_brand, color=c_brand)
    page.insert_text((40, 60), "RESUME SCREENING SYSTEM", fontsize=9, fontname="helv", color=c_brand)
    page.insert_text((40, 80), "Forensic Enquiry Audit Report", fontsize=18, fontname="helv", color=c_dark)
    page.insert_text((40, 96), f"Generated: {now_str} | Auditor: {admin_email}", fontsize=8, fontname="helv", color=c_muted)

    # Subject Profile Box
    page.draw_rect(pymupdf.Rect(40, 110, 555, 200), fill=c_bg_box, color=c_line)
    page.insert_text((55, 128), "SUBJECT USER RECORD", fontsize=10, fontname="helv", color=c_brand)

    email = str(user.get("email") or "Unknown")
    user_id = str(user.get("id") or "Unknown")
    role = str(user.get("role") or "Unknown").upper()
    created_at = _format_timestamp(user.get("created_at"))
    last_login_raw = user.get("last_login_at")
    last_login = _format_timestamp(last_login_raw) if last_login_raw else "None (Never logged in)"

    page.insert_text((55, 146), f"Email Address: {email}", fontsize=9, fontname="helv", color=c_dark)
    page.insert_text((55, 160), f"User ID: {user_id}", fontsize=9, fontname="helv", color=c_dark)
    page.insert_text((55, 174), f"Assigned Role: {role}", fontsize=9, fontname="helv", color=c_dark)
    page.insert_text((310, 146), f"Registered: {created_at}", fontsize=9, fontname="helv", color=c_dark)
    page.insert_text((310, 160), f"Last Login: {last_login}", fontsize=9, fontname="helv", color=c_dark)
    page.insert_text((310, 174), f"Audit Trail Entries: {len(activity_logs)}", fontsize=9, fontname="helv", color=c_dark)
    page.insert_text((310, 188), f"Associated Transfers: {len(transfer_logs)}", fontsize=9, fontname="helv", color=c_dark)

    y = 225

    # Section 1: Security & Activity Trail
    page.insert_text((40, y), "SECURITY & FORENSIC ACTIVITY TRAIL", fontsize=11, fontname="helv", color=c_dark)
    y += 14
    page.draw_line(pymupdf.Point(40, y), pymupdf.Point(555, y), color=c_line, width=1)
    y += 15

    # Table Header
    page.draw_rect(pymupdf.Rect(40, y - 10, 555, y + 6), fill=c_bg_box, color=c_line)
    page.insert_text((45, y), "Timestamp (UTC)", fontsize=8, fontname="helv", color=c_muted)
    page.insert_text((155, y), "Action", fontsize=8, fontname="helv", color=c_muted)
    page.insert_text((270, y), "Detail / Parameters", fontsize=8, fontname="helv", color=c_muted)
    page.insert_text((450, y), "IP Address", fontsize=8, fontname="helv", color=c_muted)
    y += 16

    if not activity_logs:
        page.insert_text((45, y), "No activity logs recorded for this account.", fontsize=8, fontname="helv", color=c_muted)
        y += 18
    else:
        for log in activity_logs[:15]:
            if y > 760:
                page = doc.new_page(width=595, height=842)
                y = 50
            ts = _format_timestamp(log.get("created_at"))
            action = str(log.get("action") or "")
            detail = str(log.get("detail") or "—")[:35]
            ip = str(log.get("ip_address") or "—")

            page.insert_text((45, y), ts, fontsize=7.5, fontname="helv", color=c_dark)
            page.insert_text((155, y), action[:20], fontsize=7.5, fontname="helv", color=c_brand)
            page.insert_text((270, y), detail, fontsize=7.5, fontname="helv", color=c_dark)
            page.insert_text((450, y), ip[:18], fontsize=7.5, fontname="helv", color=c_muted)
            y += 14

    y += 15
    if y > 700:
        page = doc.new_page(width=595, height=842)
        y = 50

    # Section 2: Data Transfer Audit
    page.insert_text((40, y), "ASSOCIATED DATA TRANSFERS & BLOB AUDIT", fontsize=11, fontname="helv", color=c_dark)
    y += 14
    page.draw_line(pymupdf.Point(40, y), pymupdf.Point(555, y), color=c_line, width=1)
    y += 15

    page.draw_rect(pymupdf.Rect(40, y - 10, 555, y + 6), fill=c_bg_box, color=c_line)
    page.insert_text((45, y), "Timestamp (UTC)", fontsize=8, fontname="helv", color=c_muted)
    page.insert_text((155, y), "Transfer Type", fontsize=8, fontname="helv", color=c_muted)
    page.insert_text((270, y), "Filename / Resource", fontsize=8, fontname="helv", color=c_muted)
    page.insert_text((450, y), "Status / Size", fontsize=8, fontname="helv", color=c_muted)
    y += 16

    if not transfer_logs:
        page.insert_text((45, y), "No data transfers recorded for this account.", fontsize=8, fontname="helv", color=c_muted)
        y += 18
    else:
        for t in transfer_logs[:12]:
            if y > 760:
                page = doc.new_page(width=595, height=842)
                y = 50
            ts = _format_timestamp(t.get("created_at"))
            tt = str(t.get("transfer_type") or "")
            fn = str(t.get("filename") or "—")[:30]
            st = str(t.get("status") or "success")
            size = f"{round((t.get('filesize_bytes') or 0)/1024, 1)} KB" if t.get("filesize_bytes") else ""

            page.insert_text((45, y), ts, fontsize=7.5, fontname="helv", color=c_dark)
            page.insert_text((155, y), tt[:20], fontsize=7.5, fontname="helv", color=c_dark)
            page.insert_text((270, y), fn, fontsize=7.5, fontname="helv", color=c_dark)
            page.insert_text((450, y), f"{st.upper()} {size}".strip(), fontsize=7.5, fontname="helv", color=c_brand)
            y += 14

    # Footer Disclaimer
    if y > 760:
        page = doc.new_page(width=595, height=842)
        y = 50
    y = max(y + 25, 780)
    page.draw_line(pymupdf.Point(40, y - 8), pymupdf.Point(555, y - 8), color=c_line, width=1)
    disclaimer = (
        "CONFIDENTIAL & PRIVILEGED: Official audit trail generated from PostgreSQL append-only security logs. "
        "Intended strictly for administrative oversight and compliance verification."
    )
    page.insert_text((40, y + 4), disclaimer, fontsize=6.5, fontname="helv", color=c_muted)

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes
