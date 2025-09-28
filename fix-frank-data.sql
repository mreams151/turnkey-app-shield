-- Fix Frank Thompson's data inconsistency
-- If his customer account is revoked, his activation should also be revoked

UPDATE activation_logs 
SET status = 'blocked' 
WHERE customer_id = 6 AND license_key = 'TUVW-XYZA-BCDE-FGHI';

-- Add a security event explaining the revocation
INSERT INTO security_events (event_type, severity, customer_id, product_id, ip_address, description, created_at) VALUES
('license_revoked', 'high', 6, 2, '172.16.0.100', 'Enterprise license revoked due to contract violation', '2024-09-26 10:00:00');