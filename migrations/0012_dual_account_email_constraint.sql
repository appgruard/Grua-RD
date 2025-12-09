-- Migration: Allow same email for different user types (dual-account system)
-- This migration drops the unique constraint on users.email and creates a composite
-- unique index on (email, user_type) to allow users to have multiple accounts with
-- different account types using the same email address.

-- Step 1: Drop the existing unique constraint on email
-- Note: The constraint name may vary, we try common naming patterns
DO $$
BEGIN
    -- Try to drop the constraint with various possible names
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique') THEN
        ALTER TABLE users DROP CONSTRAINT users_email_unique;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key') THEN
        ALTER TABLE users DROP CONSTRAINT users_email_key;
    END IF;
    
    -- Also check for unique index that might exist
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users_email_unique') THEN
        DROP INDEX users_email_unique;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'users_email_key') THEN
        DROP INDEX users_email_key;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if constraints don't exist
    RAISE NOTICE 'Could not drop email unique constraint: %', SQLERRM;
END $$;

-- Step 2: Create the new composite unique index on (email, user_type)
-- This allows the same email to be used for different account types
CREATE UNIQUE INDEX IF NOT EXISTS users_email_user_type_unique 
ON users (email, user_type);
