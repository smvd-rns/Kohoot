-- Add custom link fields to quiz_sessions table
ALTER TABLE quiz_sessions
ADD COLUMN IF NOT EXISTS custom_link_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS custom_link_url TEXT,
ADD COLUMN IF NOT EXISTS custom_link_label TEXT;
