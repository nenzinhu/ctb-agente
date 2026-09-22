-- Migration 005 — pin search_path on the RPC functions
-- Apply after scripts/migrations-004-rls.sql
--
-- Supabase's linter flags functions without a fixed search_path: a caller
-- could otherwise shadow `public` in their session and redirect what
-- `dispositivos` resolves to. Both functions are STABLE with no dynamic
-- SQL, so this is a pure hardening step.

ALTER FUNCTION search_dispositivos_tsvector(TEXT, INT) SET search_path = public;
ALTER FUNCTION search_dispositivos_vector(VECTOR(1024), INT) SET search_path = public;
