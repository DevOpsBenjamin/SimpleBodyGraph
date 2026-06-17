-- Migration to remove is_sick column from logs table
ALTER TABLE public.logs DROP COLUMN is_sick;
