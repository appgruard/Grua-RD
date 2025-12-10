-- Fix column name mismatch: azul_token -> azul_data_vault_token
-- This migration renames the column to match the schema

DO $$ 
BEGIN
  -- Check if client_payment_methods table exists with old column name
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_payment_methods' 
    AND column_name = 'azul_token'
  ) THEN
    -- Rename the column
    ALTER TABLE client_payment_methods RENAME COLUMN azul_token TO azul_data_vault_token;
  END IF;
  
  -- Check if operator_payment_methods table exists with old column name
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'operator_payment_methods' 
    AND column_name = 'azul_token'
  ) THEN
    -- Rename the column
    ALTER TABLE operator_payment_methods RENAME COLUMN azul_token TO azul_data_vault_token;
  END IF;
  
  -- If column doesn't exist at all, add it (for fresh databases or incomplete migrations)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_payment_methods' 
    AND column_name = 'azul_data_vault_token'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'client_payment_methods'
  ) THEN
    ALTER TABLE client_payment_methods ADD COLUMN azul_data_vault_token TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'operator_payment_methods' 
    AND column_name = 'azul_data_vault_token'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'operator_payment_methods'
  ) THEN
    ALTER TABLE operator_payment_methods ADD COLUMN azul_data_vault_token TEXT NOT NULL DEFAULT '';
  END IF;
END $$;
