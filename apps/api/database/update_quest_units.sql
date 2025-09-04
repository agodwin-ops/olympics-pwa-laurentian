-- Update units to match the actual Quest structure used in the game
-- Clear existing units and add the correct Quest-based units
DELETE FROM units;

-- Insert the actual Quest units used in the frontend
INSERT INTO units (id, name, description, order_index, is_active, created_by) VALUES
(uuid_generate_v4(), 'Quest 1: Babies', 'Prenatal development and infancy stage - foundational Olympic athlete development', 1, true, NULL),
(uuid_generate_v4(), 'Quest 2: Children', 'Childhood development and early athletic training - building fundamental skills', 2, true, NULL),
(uuid_generate_v4(), 'Quest 3: Adolescence', 'Adolescence and beyond - advanced training and competitive performance', 3, true, NULL);

-- Add sample assignments for each Quest unit
-- Quest 1: Babies assignments
INSERT INTO assignments (id, name, description, unit_id, max_xp, created_by) 
SELECT 
    uuid_generate_v4(),
    'Prenatal Athletic Development',
    'Understanding how prenatal factors influence future athletic potential',
    id,
    100,
    NULL
FROM units WHERE name = 'Quest 1: Babies';

INSERT INTO assignments (id, name, description, unit_id, max_xp, created_by) 
SELECT 
    uuid_generate_v4(),
    'Infant Motor Skills Foundation',
    'Early motor development patterns that support future Olympic performance',
    id,
    125,
    NULL
FROM units WHERE name = 'Quest 1: Babies';

-- Quest 2: Children assignments  
INSERT INTO assignments (id, name, description, unit_id, max_xp, created_by) 
SELECT 
    uuid_generate_v4(),
    'Childhood Athletic Training Principles',
    'Age-appropriate training methods for developing young athletes',
    id,
    150,
    NULL
FROM units WHERE name = 'Quest 2: Children';

INSERT INTO assignments (id, name, description, unit_id, max_xp, created_by) 
SELECT 
    uuid_generate_v4(),
    'Building Fundamental Movement Skills',
    'Core movement patterns essential for winter Olympic sports',
    id,
    175,
    NULL
FROM units WHERE name = 'Quest 2: Children';

-- Quest 3: Adolescence assignments
INSERT INTO assignments (id, name, description, unit_id, max_xp, created_by) 
SELECT 
    uuid_generate_v4(),
    'Advanced Competitive Training',
    'High-performance training methods for adolescent and adult athletes',
    id,
    200,
    NULL
FROM units WHERE name = 'Quest 3: Adolescence';

INSERT INTO assignments (id, name, description, unit_id, max_xp, created_by) 
SELECT 
    uuid_generate_v4(),
    'Olympic Performance Psychology',
    'Mental preparation and performance optimization for elite competition',
    id,
    250,
    NULL
FROM units WHERE name = 'Quest 3: Adolescence';