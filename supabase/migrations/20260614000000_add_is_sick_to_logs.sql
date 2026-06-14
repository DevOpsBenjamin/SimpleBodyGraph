-- Migration to add is_sick column to logs table
ALTER TABLE public.logs ADD COLUMN is_sick BOOLEAN DEFAULT FALSE NOT NULL;
