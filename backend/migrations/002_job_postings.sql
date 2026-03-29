CREATE TABLE IF NOT EXISTS job_postings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT NOT NULL,
    company_email TEXT NOT NULL,
    job_title TEXT NOT NULL,
    job_role TEXT NOT NULL,
    job_description TEXT NOT NULL,
    requirements TEXT,
    salary_range TEXT,
    location TEXT DEFAULT 'Remote',
    deadline DATE,
    max_candidates INTEGER DEFAULT 50,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE IF EXISTS interviews
ADD COLUMN IF NOT EXISTS job_id UUID;

CREATE INDEX IF NOT EXISTS idx_interviews_job_id ON interviews(job_id);
