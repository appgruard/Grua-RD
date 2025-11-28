-- Add Azul payment support to services and conductores tables
-- Migration: Azul Payment Gateway Integration

-- Add azul_transaction_id to servicios table
ALTER TABLE servicios ADD COLUMN IF NOT EXISTS azul_transaction_id TEXT;

-- Add azul_merchant_id and azul_card_token to conductores table
ALTER TABLE conductores ADD COLUMN IF NOT EXISTS azul_merchant_id TEXT;
ALTER TABLE conductores ADD COLUMN IF NOT EXISTS azul_card_token TEXT;

-- Add azul_transaction_id to comisiones table
ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS azul_transaction_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_servicios_azul_transaction_id ON servicios(azul_transaction_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_azul_transaction_id ON comisiones(azul_transaction_id);
