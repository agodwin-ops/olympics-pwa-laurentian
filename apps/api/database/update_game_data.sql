-- Update gameboard stations to match the actual game data
-- First, clear existing stations
DELETE FROM gameboard_stations;

-- Insert the actual game stations used in the frontend
INSERT INTO gameboard_stations (id, name, description, narrative, required_skill, completion_reward_xp, position_x, position_y) VALUES
(1, 'Saddledome Stadium', 'The Olympic Saddledome was the primary venue for ice hockey and figure skating', 'The Olympic Saddledome was the primary venue for ice hockey and figure skating. Located at Stampede Park, the facility was expected to cost $83 million but cost overruns pushed the facility to nearly $100 million. The organizing committee overpromised tickets to insiders and sponsors for seats to the premier Gold Medal Hockey game at the Saddledome. This is the first year that NHL players were allowed to play in the Olympics and Canada is a favourite to win the Gold medal against the dominating Soviet Union team.', 'Strength', 750, 15, 15),

(2, 'Nakiska Ski Venue', 'There was controversy when Nakiska was awarded the contract for all downhill events', 'There was a lot of controversy when Nakiska was awarded the contract for all downhill events. For many reasons, it was considered an inferior venue for an Olympic event. Apart from a not-very-technical course, the Nakiska ski area was notorious for having a lack of snow. The venue was banking on having a good snow year but just in case, a fleet of snow guns were brought in from the USA. When FIS inspects the course they think the base is too thin and wants to supplement with machine-made snow but other countries want to let the event go ahead with the subpar natural snow.', 'Endurance', 100, 25, 25),

(3, 'Olympic Village Dining Hall', 'The central gathering place for all Olympic athletes', 'The Olympic Village was designed to house 2,400 athletes and officials. The dining hall serves as the central meeting point where athletes from around the world gather. As Chef de Mission, you need to ensure Canadian athletes have proper nutrition and that any dietary restrictions are accommodated. However, you discover that the kitchen staff has been serving expired meat products to save money.', 'Tactics', 125, 35, 35),

(4, 'McMahon Stadium', 'The venue for the opening and closing ceremonies', 'McMahon Stadium hosted both the opening and closing ceremonies. The opening ceremony was a spectacular show featuring Canadian culture and winter sports. As Chef de Mission, you are responsible for coordinating the Canadian delegation''s entrance and ensuring all athletes are properly equipped and briefed on protocol.', 'Tactics', 150, 45, 45),

(5, 'Olympic Plaza', 'The heart of Olympic celebrations and medal ceremonies', 'Olympic Plaza was the site of medal ceremonies and public celebrations. The plaza became a gathering point for spectators and athletes alike. Your role involves coordinating Canadian medal ceremonies and managing media appearances for successful athletes.', 'Speed', 175, 55, 55),

(6, 'Canmore Nordic Centre', 'The venue for cross-country skiing and biathlon events', 'The Canmore Nordic Centre was built specifically for the 1988 Olympics and remains a world-class facility. Cross-country skiing and biathlon events required careful coordination of start times and equipment checks. Weather conditions could significantly impact race results.', 'Endurance', 200, 65, 65),

(7, 'Canada Olympic Park', 'The venue for ski jumping and bobsledding', 'Canada Olympic Park featured the ski jumping hills and bobsled track. These high-speed, high-risk events required extensive safety protocols and equipment inspections. The facility represented significant technological advancement in winter sports venues.', 'Climbing', 225, 75, 75),

(8, 'Olympic Saddledome (Figure Skating)', 'The premier figure skating venue with perfect ice conditions', 'The Saddledome''s ice was maintained at Olympic standards for figure skating competitions. The technical precision required for these events meant any ice imperfections could affect athlete performance and scoring.', 'Speed', 250, 85, 85),

(9, 'Stampede Corral (Ice Hockey Preliminary)', 'Secondary ice hockey venue for preliminary rounds', 'The historic Stampede Corral served as a secondary venue for preliminary ice hockey matches. While smaller than the Saddledome, it provided an intimate setting for early tournament games.', 'Strength', 275, 95, 95),

(10, 'Father David Bauer Olympic Arena', 'Training facility and backup venue', 'This facility served as a crucial training venue and backup location for ice sports. Proper scheduling and ice time allocation were essential for athlete preparation.', 'Tactics', 300, 105, 105),

(11, 'Closing Ceremony Finale', 'The culmination of your Olympic journey', 'As the Olympic Games draw to a close, you must coordinate the Canadian delegation''s participation in the closing ceremony. This represents the culmination of all your efforts as Chef de Mission.', 'Endurance', 500, 115, 115);

-- Update units to match current educational content structure
DELETE FROM units;

INSERT INTO units (id, name, description, order_index, is_active, created_by) VALUES
(uuid_generate_v4(), 'Olympic History & Heritage', 'Foundation knowledge of the Olympic movement and Calgary 1988 Winter Olympics', 1, true, NULL),
(uuid_generate_v4(), 'Leadership & Team Management', 'Essential skills for leading Olympic teams and managing athletes effectively', 2, true, NULL),
(uuid_generate_v4(), 'Strategic Planning & Operations', 'Advanced Olympic campaign planning, logistics, and competitive strategy', 3, true, NULL),
(uuid_generate_v4(), 'Crisis Management & Problem Solving', 'Handling unexpected challenges and making critical decisions under pressure', 4, true, NULL),
(uuid_generate_v4(), 'International Relations & Diplomacy', 'Working with international committees, sponsors, and media', 5, true, NULL);

-- Add some sample assignments for the updated units
INSERT INTO assignments (id, name, description, unit_id, max_xp, created_by) 
SELECT 
    uuid_generate_v4(),
    'Olympic Movement History',
    'Learn about the founding principles and evolution of the modern Olympic Games',
    id,
    100,
    NULL
FROM units WHERE name = 'Olympic History & Heritage';

INSERT INTO assignments (id, name, description, unit_id, max_xp, created_by) 
SELECT 
    uuid_generate_v4(),
    'Calgary 1988 Case Study',
    'Analyze the successes and challenges of the 1988 Calgary Winter Olympics',
    id,
    150,
    NULL
FROM units WHERE name = 'Olympic History & Heritage';

INSERT INTO assignments (id, name, description, unit_id, max_xp, created_by) 
SELECT 
    uuid_generate_v4(),
    'Team Leadership Fundamentals',
    'Essential leadership skills for managing Olympic teams and athlete support staff',
    id,
    125,
    NULL
FROM units WHERE name = 'Leadership & Team Management';

INSERT INTO assignments (id, name, description, unit_id, max_xp, created_by) 
SELECT 
    uuid_generate_v4(),
    'Strategic Olympic Planning',
    'Develop comprehensive plans for Olympic team preparation and competition strategies',
    id,
    175,
    NULL
FROM units WHERE name = 'Strategic Planning & Operations';