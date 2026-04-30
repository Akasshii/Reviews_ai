-- Migration 002: add source_stats column for combined platform reports
ALTER TABLE reports ADD COLUMN IF NOT EXISTS source_stats JSONB;
