-- Add custom_weighting to questions table
ALTER TABLE questions ADD COLUMN custom_weighting BOOLEAN DEFAULT FALSE;

-- Add weight to answer_options table
ALTER TABLE answer_options ADD COLUMN weight INTEGER DEFAULT 0;

-- Update existing correct answer options to 100% weight
UPDATE answer_options SET weight = 100 WHERE is_correct = TRUE;
