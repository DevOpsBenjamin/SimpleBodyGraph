-- Create measurements table with user isolation
CREATE TABLE public.measurements (
    id UUID PRIMARY KEY,
    date DATE NOT NULL,
    waist NUMERIC(5, 2),
    chest NUMERIC(5, 2),
    arms NUMERIC(5, 2),
    thighs NUMERIC(5, 2),
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- 1. Read Policy: Users can only read their own measurements
CREATE POLICY "Allow users to read their own measurements"
ON public.measurements FOR SELECT
USING (auth.uid() = user_id);

-- 2. Insert Policy: Users can only insert measurements under their own user_id
CREATE POLICY "Allow users to insert their own measurements"
ON public.measurements FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Update Policy: Users can only update their own measurements
CREATE POLICY "Allow users to update their own measurements"
ON public.measurements FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Delete Policy: Users can only delete their own measurements
CREATE POLICY "Allow users to delete their own measurements"
ON public.measurements FOR DELETE
USING (auth.uid() = user_id);

-- Grant privileges to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.measurements TO authenticated;
