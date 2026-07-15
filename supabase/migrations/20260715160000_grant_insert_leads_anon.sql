-- Fix: anon role missing INSERT grant on leads table
-- RLS policy "Public insert leads" exists but table-level GRANT was missing
-- This caused "permission denied for table leads" when submitting the simulator form

GRANT INSERT ON leads TO anon;
