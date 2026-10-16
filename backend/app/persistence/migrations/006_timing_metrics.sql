-- migrations/006_timing_metrics.sql
-- Records performance timing metrics for data ingestion, extraction, and evaluation processing.

ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS ingestion_time_sec DOUBLE PRECISION;
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS extraction_time_sec DOUBLE PRECISION;
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS processing_time_sec DOUBLE PRECISION;
ALTER TABLE batch_jobs ADD COLUMN IF NOT EXISTS total_time_sec DOUBLE PRECISION;
