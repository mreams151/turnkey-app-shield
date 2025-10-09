#!/usr/bin/env node

// Test script for backup codes management functionality
const BASE_URL = 'https://3000-it2rdgg0o5rcpwefy6juh-6532622b.e2b.dev';

async function testBackupCodesManagement() {
    console.log('🧪 Testing TurnkeyAppShield Backup Codes Management');
    console.log('=' .repeat(50));
    
    try {
        // Step 1: Emergency Admin Setup
        console.log('1️⃣ Setting up admin user...');
        const setupResponse = await fetch(`${BASE_URL}/api/admin/setup-admin/emergency-setup-2024`);
        console.log(`   Setup Status: ${setupResponse.status}`);
        
        // Step 2: Admin Login
        console.log('2️⃣ Logging in as admin...');
        const loginResponse = await fetch(`${BASE_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        
        const loginData = await loginResponse.text();
        console.log(`   Login Status: ${loginResponse.status}`);
        console.log(`   Response: ${loginData || 'Empty response'}`);
        
        // Step 3: Test Emergency Password Login
        console.log('3️⃣ Testing emergency password login...');
        const emergencyLoginResponse = await fetch(`${BASE_URL}/api/admin/login-2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'PowerR151!151'  // Emergency password from database
            })
        });
        
        const emergencyData = await emergencyLoginResponse.text();
        console.log(`   Emergency Login Status: ${emergencyLoginResponse.status}`);
        console.log(`   Response: ${emergencyData || 'Empty response'}`);
        
        // Step 4: Test 2FA Setup Endpoint
        console.log('4️⃣ Testing 2FA setup endpoint availability...');
        const twoFASetupResponse = await fetch(`${BASE_URL}/api/admin/2fa/setup`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'  // Mock token for endpoint test
            },
            body: JSON.stringify({})
        });
        
        console.log(`   2FA Setup Status: ${twoFASetupResponse.status}`);
        const setupText = await twoFASetupResponse.text();
        console.log(`   Response: ${setupText || 'Empty response'}`);
        
        // Step 5: Test Backup Codes Regeneration Endpoint
        console.log('5️⃣ Testing backup codes regeneration endpoint...');
        const regenerateResponse = await fetch(`${BASE_URL}/api/admin/2fa/regenerate-backup-codes`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
            },
            body: JSON.stringify({
                password: 'admin123'
            })
        });
        
        console.log(`   Regenerate Status: ${regenerateResponse.status}`);
        const regenerateText = await regenerateResponse.text();
        console.log(`   Response: ${regenerateText || 'Empty response'}`);
        
        // Step 6: Test Complete 2FA Reset Endpoint
        console.log('6️⃣ Testing complete 2FA reset endpoint...');
        const resetResponse = await fetch(`${BASE_URL}/api/admin/2fa/reset-complete`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token'
            },
            body: JSON.stringify({
                password: 'admin123'
            })
        });
        
        console.log(`   Reset Status: ${resetResponse.status}`);
        const resetText = await resetResponse.text();
        console.log(`   Response: ${resetText || 'Empty response'}`);
        
        console.log('\n✅ Basic endpoint connectivity test completed!');
        console.log('📝 Note: Authorization errors (401/403) are expected without valid tokens');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

// Run the test
testBackupCodesManagement();