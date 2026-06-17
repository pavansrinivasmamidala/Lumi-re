-- SQL query to execute in your Supabase Dashboard -> SQL Editor
-- This creates the required table for shared documents

CREATE TABLE IF NOT EXISTS public.shared_documents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pages JSONB NOT NULL,
    translations JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Note: Since the app currently does not require authentication to read/write documents, we enable anon access
ALTER TABLE public.shared_documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.shared_documents 
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

CREATE POLICY "Allow anonymous update on shared_documents" 
ON public.shared_documents FOR UPDATE 
TO anon 
USING (true);

CREATE POLICY "Allow anonymous select on shared_documents" 
ON public.shared_documents FOR SELECT 
TO anon
USING (true);

CREATE POLICY "Allow anonymous insert on shared_documents" 
ON public.shared_documents FOR INSERT 
TO anon 
WITH CHECK (true);

CREATE POLICY "Allow anonymous delete on shared_documents" 
ON public.shared_documents FOR DELETE 
TO anon 
USING (true);
