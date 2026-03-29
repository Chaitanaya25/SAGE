CREATE TABLE IF NOT EXISTS hr_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
