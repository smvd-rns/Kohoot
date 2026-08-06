-- Add is_approved field to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT TRUE;
