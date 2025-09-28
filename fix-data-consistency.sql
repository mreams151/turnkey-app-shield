-- Fix data consistency: Add activation log for Eva Martinez
-- Every customer with a license must have had at least one activation

INSERT INTO activation_logs (customer_id, product_id, license_key, device_fingerprint, device_name, operating_system, ip_address, country_code, file_name, file_version, status, activation_time) VALUES
(5, 4, 'DEFG-HIJK-LMNO-PQRS', 'e5f6789012345678901234567890abcdef1234567890abcdef123456789012', 'EVA-DESIGN-LAPTOP', 'Windows 11 Pro', '198.51.100.42', 'US', 'Analytics.exe', '1.2.0', 'suspended', '2024-01-05 11:15:00');

-- Add a security event explaining why Eva was suspended
INSERT INTO security_events (event_type, severity, customer_id, product_id, ip_address, description, created_at) VALUES
('license_violation', 'high', 5, 4, '198.51.100.42', 'License key shared across multiple unauthorized devices - account suspended', '2024-01-06 09:30:00');