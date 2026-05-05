-- Run this SQL in your Supabase SQL Editor to enable full CRUD operations for the beta feedback module.

-- 1. Create the Beta Feedback table
CREATE TABLE IF NOT EXISTS public.beta_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    user_email TEXT,
    type TEXT,
    description TEXT,
    path TEXT,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'new',
    admin_notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the Beta Feedback Notes table for admin communications
CREATE TABLE IF NOT EXISTS public.beta_feedback_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id TEXT, 
    admin_id TEXT,
    admin_email TEXT,
    content TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_feedback_notes ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies to allow operations 
-- Note: 'FOR ALL USING (true)' allows all users to read, update, insert, and delete. 
-- For production, you may want to restrict this to authenticated users or admins only.

DROP POLICY IF EXISTS "Allow full access to beta_feedback" ON public.beta_feedback;
CREATE POLICY "Allow full access to beta_feedback" 
ON public.beta_feedback FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow full access to beta_feedback_notes" ON public.beta_feedback_notes;
CREATE POLICY "Allow full access to beta_feedback_notes" 
ON public.beta_feedback_notes FOR ALL USING (true) WITH CHECK (true);

-- 5. Force cleanup of old test data if any columns have missing types (Optional)
-- DELETE FROM public.beta_feedback;
-- DELETE FROM public.beta_feedback_notes;
