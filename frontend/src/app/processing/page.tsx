"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { processingApi, ProcessingResult } from "@/lib/api";

function fileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function OutputCard({ result }: { result: ProcessingResult }) {
  return (
    <section className="output" aria-live="polite">
      <div className="output-heading">
        <div>
          <p className="eyebrow">Processing result</p>
          <h2>{result.input_type === "zip" ? "Batch complete" : "Resume complete"}</h2>
        </div>
        <div className="summary">
          <span><strong>{result.total_files}</strong> processed</span>
          <span className="good"><strong>{result.accepted_files}</strong> accepted</span>
          {result.rejected_files > 0 && <span className="bad"><strong>{result.rejected_files}</strong> flagged</span>}
        </div>
      </div>

      {/* Independent Timing Breakdown Card */}
      <div className="status-timings-card" style={{ marginBottom: "20px" }}>
        <div className="status-timings-header">
          <span style={{ fontSize: "0.8rem", fontWeight: 750, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary-purple)" }}>
            Process Breakdown and Time Spent
          </span>
          {result.total_time_sec != null && (
            <span className="timing-badge">
              Total Turnaround: {result.total_time_sec.toFixed(3)}s
            </span>
          )}
        </div>
        <div className="status-timings-grid">
          <div className="status-timing-item">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="status-timing-label">Part 1: Data Ingestion</span>
              <span className="status-timing-status completed">Completed</span>
            </div>
            <span className="status-timing-value">
              {result.ingestion_time_sec != null ? `Time spent: ${result.ingestion_time_sec.toFixed(3)}s` : "Time spent: Done"}
            </span>
            <span className="status-timing-subtext">File validation & unpacking</span>
          </div>

          <div className="status-timing-item">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="status-timing-label">Part 2: Data Extraction</span>
              <span className="status-timing-status completed">Completed</span>
            </div>
            <span className="status-timing-value">
              {result.extraction_time_sec != null ? `Time spent: ${result.extraction_time_sec.toFixed(3)}s` : "Time spent: Done"}
            </span>
            <span className="status-timing-subtext">PDF text extraction</span>
          </div>

          <div className="status-timing-item">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="status-timing-label">Part 3: Data Processing</span>
              <span className="status-timing-status completed">Completed</span>
            </div>
            <span className="status-timing-value">
              {result.processing_time_sec != null ? `Time spent: ${result.processing_time_sec.toFixed(3)}s` : "Time spent: Done"}
            </span>
            <span className="status-timing-subtext">PII anonymisation & safety scan</span>
          </div>
        </div>
      </div>

      {result.files.map((file) => (
        <article className="file-result" key={file.filename}>
          <div className="file-result-title">
            <div>
              <h3>{file.filename}</h3>
              <p>Person 2 pipeline: validate → extract → anonymise → scan</p>
            </div>
            <span className={`status ${file.status}`}>{file.status}</span>
          </div>

          <div className="checks">
            <span className={file.validation_passed ? "pass" : "fail"}>
              {file.validation_passed ? "Passed:" : "Failed:"} File validation
            </span>
            <span className={file.extracted_text ? "pass" : "muted"}>
              {file.extracted_text ? "Completed:" : "Pending:"} Text extraction
            </span>
            <span className={file.anonymised_text ? "pass" : "muted"}>
              {file.anonymised_text ? "Completed:" : "Pending:"} PII anonymisation
            </span>
            <span className={file.safety_passed === true ? "pass" : file.safety_passed === false ? "fail" : "muted"}>
              {file.safety_passed === true ? "Passed:" : file.safety_passed === false ? "Failed:" : "Pending:"} Safety scan
            </span>
          </div>

          {(file.extraction_time_sec != null || file.processing_time_sec != null) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginTop: "10px", fontSize: "0.8rem", color: "var(--muted)" }}>
              {file.ingestion_time_sec != null && <span>Ingestion: <strong style={{ color: "var(--ink)" }}>{file.ingestion_time_sec.toFixed(4)}s</strong></span>}
              {file.extraction_time_sec != null && <span>Extraction: <strong style={{ color: "var(--ink)" }}>{file.extraction_time_sec.toFixed(4)}s</strong></span>}
              {file.processing_time_sec != null && <span>Processing: <strong style={{ color: "var(--ink)" }}>{file.processing_time_sec.toFixed(4)}s</strong></span>}
              {file.total_time_sec != null && <span>Turnaround: <strong style={{ color: "var(--ink)" }}>{file.total_time_sec.toFixed(4)}s</strong></span>}
            </div>
          )}

          {file.error && <p className="message error-message">{file.error}</p>}
          {file.safety_reason && <p className="message warning-message">{file.safety_reason}</p>}

          {file.extracted_text && (
            <div className="text-grid">
              <div>
                <h4>Extracted text</h4>
                <pre>{file.extracted_text}</pre>
              </div>
              <div>
                <h4>Anonymised text</h4>
                <pre>{file.anonymised_text}</pre>
              </div>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}

export default function ProcessingPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingElapsed, setLoadingElapsed] = useState<number>(0);

  // Active elapsed timer while processing file
  useEffect(() => {
    if (!loading) return;
    const start = Date.now();
    const interval = setInterval(() => {
      setLoadingElapsed(Math.round(((Date.now() - start) / 1000) * 10) / 10);
    }, 100);
    return () => clearInterval(interval);
  }, [loading]);

  function chooseFile(nextFile: File | null) {
    setFile(nextFile);
    setResult(null);
    setError(null);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0] ?? null);
  }

  async function processFile(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setLoadingElapsed(0);
    setError(null);
    setResult(null);

    console.log(`\n[PREVIEW PROCESSING STARTED] File: ${file.name} (${file.size} bytes)`);

    try {
      const res = await processingApi.preview(file);
      setResult(res);

      console.log(
        `================================================================================\n` +
        `[PREVIEW PROCESSING COMPLETE] File: ${file.name}\n` +
        `  - Time spent on Data Ingestion : ${res.ingestion_time_sec != null ? res.ingestion_time_sec.toFixed(3) + 's' : 'N/A'}\n` +
        `  - Time spent on Data Extraction: ${res.extraction_time_sec != null ? res.extraction_time_sec.toFixed(3) + 's' : 'N/A'}\n` +
        `  - Time spent on Data Processing: ${res.processing_time_sec != null ? res.processing_time_sec.toFixed(3) + 's' : 'N/A'}\n` +
        `  - Total turnaround time        : ${res.total_time_sec != null ? res.total_time_sec.toFixed(3) + 's' : 'N/A'}\n` +
        `  - Total Files Processed        : ${res.total_files} (${res.accepted_files} accepted, ${res.rejected_files} flagged)\n` +
        `================================================================================`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "The file could not be processed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="hero">
        <p className="eyebrow">Resume screening · Person 2</p>
        <h1>See what the pipeline sees.</h1>
        <p>Upload one resume PDF or a ZIP of PDFs to validate it, extract its text, remove personal information, and run the safety scan.</p>
      </header>

      <div className={`split-layout${result ? " split-layout--has-result" : ""}`}>
        <form className="upload-card split-layout__upload" onSubmit={processFile}>
          <input ref={inputRef} className="file-control" id="resume-file" type="file" accept=".pdf,.zip,application/pdf,application/zip" onChange={onFileChange} />
          <button className="file-picker" type="button" onClick={() => inputRef.current?.click()}>
            <span className="file-picker__icon">↑</span>
            <span><strong>{file ? "Choose another file" : "Select a PDF or ZIP"}</strong><small>{file ? `${file.name} · ${fileSize(file.size)}` : "PDF up to 5 MB · ZIP up to 50 MB"}</small></span>
          </button>
          <div className="upload-actions">
            <p>Nothing is ranked or saved here—this shows only the ingestion and sanitisation output.</p>
            <button className="primary" type="submit" disabled={!file || loading}>
              {loading ? "Processing…" : "Process file"}
            </button>
          </div>

          {loading && (
            <div className="status-timings-card" style={{ marginTop: "16px" }}>
              <div className="status-timings-header">
                <span style={{ fontSize: "0.8rem", fontWeight: 750, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary-purple)" }}>
                  Process Breakdown and Time Spent
                </span>
                <span className="timing-badge">
                  Total Elapsed: {loadingElapsed.toFixed(1)}s
                </span>
              </div>
              <div className="status-timings-grid">
                <div className="status-timing-item">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="status-timing-label">Part 1: Data Ingestion</span>
                    <span className="status-timing-status running">In Progress</span>
                  </div>
                  <span className="status-timing-value">
                    Time spent: <span className="timing-pulsing">{loadingElapsed.toFixed(1)}s</span>
                  </span>
                  <span className="status-timing-subtext">Verifying file & payload</span>
                </div>

                <div className="status-timing-item">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="status-timing-label">Part 2: Data Extraction</span>
                    <span className="status-timing-status running">In Progress</span>
                  </div>
                  <span className="status-timing-value">
                    Time spent: <span className="timing-pulsing">Extracting…</span>
                  </span>
                  <span className="status-timing-subtext">Extracting PDF text</span>
                </div>

                <div className="status-timing-item">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span className="status-timing-label">Part 3: Data Processing</span>
                    <span className="status-timing-status running">In Progress</span>
                  </div>
                  <span className="status-timing-value">
                    Time spent: <span className="timing-pulsing">Scanning…</span>
                  </span>
                  <span className="status-timing-subtext">PII anonymisation & scan</span>
                </div>
              </div>
            </div>
          )}

          {error && <p className="message error-message" role="alert">{error}</p>}
        </form>

        {result && (
          <div className="split-layout__result">
            <OutputCard result={result} />
          </div>
        )}
      </div>
    </main>
  );
}

