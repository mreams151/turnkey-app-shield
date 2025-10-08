// Script to create admin user with hashed password
import { PasswordUtils } from './src/utils/security.ts';

async function createAdminUser() {
    try {
        const password = 'admin123';
        const hashedPassword = await PasswordUtils.hashPassword(password);
        console.log(`INSERT INTO admin_users (username, password_hash, created_at, updated_at) VALUES ('admin', '${hashedPassword}', datetime('now'), datetime('now'));`);
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
}

createAdminUser();