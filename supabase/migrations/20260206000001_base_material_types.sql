-- Create base material types table
CREATE TABLE IF NOT EXISTS base_material_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE base_material_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all base material types"
ON base_material_types FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own base material types"
ON base_material_types FOR ALL
USING (auth.uid() = user_id);

-- Preload data
INSERT INTO base_material_types (name, status, user_id) 
SELECT name, 'ACTIVE', (SELECT id FROM auth.users LIMIT 1)
FROM (VALUES 
    ('Patra'), 
    ('Patti'), 
    ('Wire'), 
    ('Challa'), 
    ('Jali'), 
    ('Taka'), 
    ('Sheet'), 
    ('Rod'), 
    ('Spring'), 
    ('Other')
) AS t(name)
ON CONFLICT (name) DO NOTHING;
