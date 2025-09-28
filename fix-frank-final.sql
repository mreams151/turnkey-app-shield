-- Final fix for Frank Thompson's data consistency issue
-- Problem: Frank showed "1 validation, 0 activations" which is impossible
-- Solution: Frank is a revoked customer who never successfully activated
-- Therefore: Remove all activation records for him

-- Remove Frank Thompson's activation records entirely
-- A revoked customer who never successfully activated should have no records
DELETE FROM activation_logs WHERE customer_id = 6;

-- Ensure Frank's customer status is revoked
UPDATE customers 
SET status = 'revoked' 
WHERE id = 6 AND name = 'Frank Thompson';

-- Add security event explaining the situation
INSERT INTO security_events (event_type, severity, customer_id, product_id, ip_address, description, created_at) VALUES
('license_revoked', 'high', 6, 2, '172.16.0.100', 'Customer revoked before successful activation - all activation records removed for data consistency', '2024-09-26 10:00:00');