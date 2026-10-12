"""
forensic_report.py — Generates official forensic enquiry audit report PDFs for administrators.
Uses pymupdf for instant, high-fidelity PDF generation without external binaries.
"""
from __future__ import annotations

import datetime
import pymupdf


def generate_forensic_report(
    user: dict,
    activity_logs: list[dict],
    transfer_logs: list[dict],
    admin_email: str = "administrator",
) -> bytes:
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)  # A4 standard

    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # Colors
    c_brand = (0.2, 0.25, 0.8)       # Indigo
    c_dark = (0.06, 0.09, 0.16)      # Slate dark
    c_muted = (0.4, 0.45, 0.53)      # Slate muted
    c_line = (0.88, 0.91, 0.94)      # Slate border
    c_bg_box = (0.97, 0.98, 0.99)    # Light gray

    # Header Bar
    page.draw_rect(pymupdf.Rect(40, 40, 555, 42), fill=c_brand, color=c_brand)
    page.insert_text((40, 60), "RESUME SCREENING SYSTEM", fontsize=9, fontname="helv", color=c_brand)
    page.insert_text((40, 80), "Forensic Enquiry Audit Report", fontsize=18, fontname="helv", color=c_dark)
    page.insert_text((40, 96), f"Generated: {now_str} | Auditor: {admin_email}", fontsize=8, fontname="helv", color=c_muted)

    # Subject Profile Box
    page.draw_rect(pymupdf.Rect(40, 110, 555, 200), fill=c_bg_box, color=c_line)
    page.insert_text((55, 128), "SUBJECT USER RECORD", fontsize=10, fontname="helv", color=c_brand)

    email = user.get("email", "Unknown")
    user_id = str(user.get("id", "Unknown"))
    role = user.get("role", "Unknown").upper()
    created_at = user.get("created_at", "Unknown")
    last_login = user.get("last_login_at") or "None (Never logged in)"

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
            ts = log.get("created_at", "")[:19]
            action = log.get("action", "")
            detail = (log.get("detail") or "—")[:35]
            ip = log.get("ip_address") or "—"

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
            ts = t.get("created_at", "")[:19]
            tt = t.get("transfer_type", "")
            fn = (t.get("filename") or "—")[:30]
            st = t.get("status", "success")
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
