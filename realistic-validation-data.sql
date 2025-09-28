-- Add realistic validation data to demonstrate the difference between activations and validations
-- Each customer can have 1 activation (unique device) but multiple validations (software starts)

-- Alice Johnson: 1 device, multiple daily validations
INSERT INTO activation_logs (customer_id, product_id, license_key, device_fingerprint, device_name, operating_system, ip_address, country_code, file_name, file_version, status, activation_time) VALUES
-- Day 1
(1, 1, 'ABCD-EFGH-IJKL-MNOP', 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456', 'ALICE-PC', 'Windows 11 Pro', '192.168.1.100', 'US', 'ProSuite.exe', '2.1.0', 'valid', '2024-09-27 08:00:00'),
(1, 1, 'ABCD-EFGH-IJKL-MNOP', 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456', 'ALICE-PC', 'Windows 11 Pro', '192.168.1.100', 'US', 'ProSuite.exe', '2.1.0', 'valid', '2024-09-27 14:30:00'),
(1, 1, 'ABCD-EFGH-IJKL-MNOP', 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456', 'ALICE-PC', 'Windows 11 Pro', '192.168.1.100', 'US', 'ProSuite.exe', '2.1.0', 'valid', '2024-09-27 19:15:00'),
-- Day 2  
(1, 1, 'ABCD-EFGH-IJKL-MNOP', 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456', 'ALICE-PC', 'Windows 11 Pro', '192.168.1.100', 'US', 'ProSuite.exe', '2.1.0', 'valid', '2024-09-28 09:00:00'),
(1, 1, 'ABCD-EFGH-IJKL-MNOP', 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456', 'ALICE-PC', 'Windows 11 Pro', '192.168.1.100', 'US', 'ProSuite.exe', '2.1.0', 'valid', '2024-09-28 15:45:00'),

-- Bob Smith: 1 device, heavy usage
INSERT INTO activation_logs (customer_id, product_id, license_key, device_fingerprint, device_name, operating_system, ip_address, country_code, file_name, file_version, status, activation_time) VALUES
(2, 2, 'QRST-UVWX-YZAB-CDEF', 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567', 'BOB-WORKSTATION', 'Windows 11 Enterprise', '10.0.1.50', 'CA', 'SecurityGuard.exe', '1.5.2', 'valid', '2024-09-27 07:00:00'),
(2, 2, 'QRST-UVWX-YZAB-CDEF', 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567', 'BOB-WORKSTATION', 'Windows 11 Enterprise', '10.0.1.50', 'CA', 'SecurityGuard.exe', '1.5.2', 'valid', '2024-09-27 07:30:00'),
(2, 2, 'QRST-UVWX-YZAB-CDEF', 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567', 'BOB-WORKSTATION', 'Windows 11 Enterprise', '10.0.1.50', 'CA', 'SecurityGuard.exe', '1.5.2', 'valid', '2024-09-27 12:15:00'),
(2, 2, 'QRST-UVWX-YZAB-CDEF', 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567', 'BOB-WORKSTATION', 'Windows 11 Enterprise', '10.0.1.50', 'CA', 'SecurityGuard.exe', '1.5.2', 'valid', '2024-09-27 16:45:00'),
(2, 2, 'QRST-UVWX-YZAB-CDEF', 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567', 'BOB-WORKSTATION', 'Windows 11 Enterprise', '10.0.1.50', 'CA', 'SecurityGuard.exe', '1.5.2', 'valid', '2024-09-28 08:00:00'),
(2, 2, 'QRST-UVWX-YZAB-CDEF', 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567', 'BOB-WORKSTATION', 'Windows 11 Enterprise', '10.0.1.50', 'CA', 'SecurityGuard.exe', '1.5.2', 'valid', '2024-09-28 13:30:00'),

-- David Wilson: 2 devices (home + work), multiple validations
INSERT INTO activation_logs (customer_id, product_id, license_key, device_fingerprint, device_name, operating_system, ip_address, country_code, file_name, file_version, status, activation_time) VALUES
-- Work computer
(4, 3, 'WXYZ-1234-5678-9ABC', 'd4e5f6789012345678901234567890abcdef1234567890abcdef123456789', 'DAVID-WORK', 'Windows 11 Pro', '198.51.100.25', 'AU', 'DevTools.exe', '3.0.1', 'valid', '2024-09-27 09:00:00'),
(4, 3, 'WXYZ-1234-5678-9ABC', 'd4e5f6789012345678901234567890abcdef1234567890abcdef123456789', 'DAVID-WORK', 'Windows 11 Pro', '198.51.100.25', 'AU', 'DevTools.exe', '3.0.1', 'valid', '2024-09-27 17:30:00'),
-- Home computer (different device fingerprint)
(4, 3, 'WXYZ-1234-5678-9ABC', 'david_home_device_fingerprint_different_from_work_computer_unique_id', 'DAVID-HOME', 'Windows 11 Pro', '198.51.100.26', 'AU', 'DevTools.exe', '3.0.1', 'valid', '2024-09-27 20:00:00'),
(4, 3, 'WXYZ-1234-5678-9ABC', 'david_home_device_fingerprint_different_from_work_computer_unique_id', 'DAVID-HOME', 'Windows 11 Pro', '198.51.100.26', 'AU', 'DevTools.exe', '3.0.1', 'valid', '2024-09-28 10:15:00');