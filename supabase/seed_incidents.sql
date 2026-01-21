-- Sample Incidents for NexaraVision
-- Run this in Supabase SQL Editor after running schema.sql

-- Get camera IDs and location ID
DO $$
DECLARE
    loc_id UUID;
    cam_entrance UUID;
    cam_parking UUID;
    cam_lobby UUID;
    cam_hallway UUID;
BEGIN
    -- Get location ID
    SELECT id INTO loc_id FROM locations WHERE name = 'Main Building' LIMIT 1;

    -- Get camera IDs
    SELECT id INTO cam_entrance FROM cameras WHERE name = 'Entrance Camera' LIMIT 1;
    SELECT id INTO cam_parking FROM cameras WHERE name = 'Parking Lot' LIMIT 1;
    SELECT id INTO cam_lobby FROM cameras WHERE name = 'Lobby' LIMIT 1;
    SELECT id INTO cam_hallway FROM cameras WHERE name = 'Hallway A' LIMIT 1;

    -- Insert sample incidents (last 30 days)
    -- Entrance Camera incidents
    INSERT INTO incidents (camera_id, location_id, confidence, violence_score, model_used, status, detected_at, acknowledged_at, resolved_at)
    VALUES
    (cam_entrance, loc_id, 92.5, 0.89, 'Violence Detection AI v2', 'resolved', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 55 minutes', NOW() - INTERVAL '1 hour 30 minutes'),
    (cam_entrance, loc_id, 87.3, 0.82, 'Violence Detection AI v2', 'resolved', NOW() - INTERVAL '1 day 3 hours', NOW() - INTERVAL '1 day 2 hours 50 minutes', NOW() - INTERVAL '1 day 2 hours'),
    (cam_entrance, loc_id, 94.1, 0.91, 'Violence Detection AI v2', 'false_positive', NOW() - INTERVAL '2 days 5 hours', NOW() - INTERVAL '2 days 4 hours 45 minutes', NOW() - INTERVAL '2 days 4 hours'),
    (cam_entrance, loc_id, 78.9, 0.75, 'Violence Detection AI v2', 'resolved', NOW() - INTERVAL '3 days 8 hours', NOW() - INTERVAL '3 days 7 hours 52 minutes', NOW() - INTERVAL '3 days 7 hours'),
    (cam_entrance, loc_id, 91.2, 0.88, 'Violence Detection AI v2', 'detected', NOW() - INTERVAL '30 minutes', NULL, NULL),
    (cam_entrance, loc_id, 85.6, 0.81, 'Violence Detection AI v2', 'acknowledged', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '40 minutes', NULL),
    (cam_entrance, loc_id, 96.3, 0.94, 'Violence Detection AI v2', 'resolved', NOW() - INTERVAL '5 days 2 hours', NOW() - INTERVAL '5 days 1 hour 55 minutes', NOW() - INTERVAL '5 days 1 hour'),
    (cam_entrance, loc_id, 82.4, 0.78, 'Violence Detection AI v2', 'resolved', NOW() - INTERVAL '6 days 4 hours', NOW() - INTERVAL '6 days 3 hours 48 minutes', NOW() - INTERVAL '6 days 3 hours');

    -- Parking Lot incidents
    INSERT INTO incidents (camera_id, location_id, confidence, violence_score, model_used, status, detected_at, acknowledged_at, resolved_at)
    VALUES
    (cam_parking, loc_id, 89.7, 0.85, 'Violence Detection AI v2', 'resolved', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours 55 minutes', NOW() - INTERVAL '3 hours 20 minutes'),
    (cam_parking, loc_id, 93.8, 0.90, 'Violence Detection AI v2', 'resolved', NOW() - INTERVAL '1 day 6 hours', NOW() - INTERVAL '1 day 5 hours 50 minutes', NOW() - INTERVAL '1 day 5 hours'),
    (cam_parking, loc_id, 76.2, 0.72, 'Violence Detection AI v2', 'false_positive', NOW() - INTERVAL '2 days 1 hour', NOW() - INTERVAL '2 days 55 minutes', NOW() - INTERVAL '2 days 30 minutes'),
    (cam_parking, loc_id, 88.5, 0.84, 'Violence Detection AI v2', 'responding', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '12 minutes', NULL),
    (cam_parking, loc_id, 95.1, 0.92, 'Violence Detection AI v2', 'resolved', NOW() - INTERVAL '4 days 3 hours', NOW() - INTERVAL '4 days 2 hours 55 minutes', NOW() - INTERVAL '4 days 2 hours'),
    (cam_parking, loc_id, 81.9, 0.77, 'Violence Detection AI v2', 'resolved', NOW() - INTERVAL '7 days 5 hours', NOW() - INTERVAL '7 days 4 hours 52 minutes', NOW() - INTERVAL '7 days 4 hours');

    -- Lobby incidents
    INSERT INTO incidents (camera_id, location_id, confidence, violence_score, model_used, status, detected_at, acknowledged_at, resolved_at)
    VALUES
    (cam_lobby, loc_id, 90.3, 0.86, 'Violence Detection AI v2', 'resolved', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours 55 minutes', NOW() - INTERVAL '5 hours 10 minutes'),
    (cam_lobby, loc_id, 84.7, 0.80, 'Violence Detection AI v2', 'resolved', NOW() - INTERVAL '1 day 9 hours', NOW() - INTERVAL '1 day 8 hours 48 minutes', NOW() - INTERVAL '1 day 8 hours'),
    (cam_lobby, loc_id, 97.2, 0.95, 'Violence Detection AI v2', 'resolved', NOW() - INTERVAL '3 days 2 hours', NOW() - INTERVAL '3 days 1 hour 52 minutes', NOW() - INTERVAL '3 days 1 hour'),
    (cam_lobby, loc_id, 79.8, 0.74, 'Violence Detection AI v2', 'false_positive', NOW() - INTERVAL '5 days 7 hours', NOW() - INTERVAL '5 days 6 hours 45 minutes', NOW() - INTERVAL '5 days 6 hours');

    -- Hallway A incidents
    INSERT INTO incidents (camera_id, location_id, confidence, violence_score, model_used, status, detected_at, acknowledged_at, resolved_at)
    VALUES
    (cam_hallway, loc_id, 86.9, 0.83, 'Violence Detection AI v2', 'detected', NOW() - INTERVAL '20 minutes', NULL, NULL),
    (cam_hallway, loc_id, 91.5, 0.88, 'Violence Detection AI v2', 'resolved', NOW() - INTERVAL '8 hours', NOW() - INTERVAL '7 hours 55 minutes', NOW() - INTERVAL '7 hours 15 minutes'),
    (cam_hallway, loc_id, 83.2, 0.79, 'Violence Detection AI v2', 'resolved', NOW() - INTERVAL '2 days 4 hours', NOW() - INTERVAL '2 days 3 hours 50 minutes', NOW() - INTERVAL '2 days 3 hours'),
    (cam_hallway, loc_id, 94.6, 0.91, 'Violence Detection AI v2', 'resolved', NOW() - INTERVAL '4 days 6 hours', NOW() - INTERVAL '4 days 5 hours 48 minutes', NOW() - INTERVAL '4 days 5 hours'),
    (cam_hallway, loc_id, 77.4, 0.73, 'Violence Detection AI v2', 'false_positive', NOW() - INTERVAL '6 days 1 hour', NOW() - INTERVAL '6 days 52 minutes', NOW() - INTERVAL '6 days 20 minutes');

END $$;

-- Verify the data
SELECT
    c.name as camera_name,
    COUNT(i.id) as incident_count,
    c.status
FROM cameras c
LEFT JOIN incidents i ON i.camera_id = c.id
GROUP BY c.id, c.name, c.status
ORDER BY incident_count DESC;
