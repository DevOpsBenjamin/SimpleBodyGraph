-- Create logs table with user isolation
CREATE TABLE public.logs (
    id UUID PRIMARY KEY,
    date DATE NOT NULL,
    mass NUMERIC(5, 2) NOT NULL,
    body_fat NUMERIC(4, 2) NOT NULL,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- 1. Read Policy: Users can only read their own logs
CREATE POLICY "Allow users to read their own logs" 
ON public.logs FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Insert Policy: Users can only insert logs under their own user_id
CREATE POLICY "Allow users to insert their own logs" 
ON public.logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Update Policy: Users can only update their own logs
CREATE POLICY "Allow users to update their own logs" 
ON public.logs FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Delete Policy: Users can only delete their own logs
CREATE POLICY "Allow users to delete their own logs" 
ON public.logs FOR DELETE 
USING (auth.uid() = user_id);
