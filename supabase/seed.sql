-- Seed Data
-- Passwords should be handled by Supabase Auth in real scenarios. here we just insert profiles
-- Note: In local dev, you'd usually create users via Auth API first. 
-- For SQL seeding, we assume IDs exist or we insert into auth.users if possible (usually restricted).
-- We will just insert into public.profiles assuming the IDs match what the developer creates or using a mock ID strategy.

-- User 1: Ahmed (Male, 25, London)
INSERT INTO profiles (id, email, full_name, gender, dob, city, country, sect, wants_hijab, has_children)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'ahmed@test.com', 'Ahmed Ali', 'male', '1999-01-01', 'London', 'UK', 'Sunni', true, false);

-- User 2: Fatima (Female, 23, London)
INSERT INTO profiles (id, email, full_name, gender, dob, city, country, sect, wants_hijab, has_children)
VALUES 
    ('00000000-0000-0000-0000-000000000002', 'fatima@test.com', 'Fatima Khan', 'female', '2001-01-01', 'London', 'UK', 'Sunni', true, false);

-- User 3: Zaid (Male, 17, ERROR should fail)
-- INSERT INTO profiles ... VALUES ... '2008-01-01' -> Should fail check constraint.
