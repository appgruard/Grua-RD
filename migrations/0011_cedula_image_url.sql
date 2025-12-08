-- Add cedula_image_url column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS cedula_image_url TEXT;
