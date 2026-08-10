-- =============================================================
-- Add phone column to profiles table
-- Run in Supabase SQL Editor
-- SAFE: adds a nullable column, no existing users are affected
-- =============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;
