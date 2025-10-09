# 📍 TurnkeyAppShield - Backup Codes Management Location Guide

## 🔍 Where to Find the Backup Codes Management Options

The **"Option 1 - Regenerate Codes"** and **"Option 2 - Complete Reset"** buttons appear in the **Security Settings** section of the admin panel, but **ONLY after 2FA is successfully enabled**.

### 📋 Step-by-Step Guide to Access These Options:

#### Step 1: Login to Admin Panel
1. Go to: `https://3000-it2rdgg0o5rcpwefy6juh-6532622b.e2b.dev/admin`
2. Login with:
   - **Username**: `admin`
   - **Password**: `admin123`

#### Step 2: Navigate to Security Settings
1. After login, click on **"Security"** in the left sidebar
2. You'll see the "Two-Factor Authentication" section

#### Step 3: Enable 2FA (if not already enabled)
1. **Current Status**: 2FA is currently **DISABLED** in your system
2. Toggle the **"Enable 2FA"** switch
3. Scan the QR code with your authenticator app
4. Enter the 6-digit verification code
5. **Save your backup codes** that are generated

#### Step 4: Access Backup Codes Management Options
**After 2FA is successfully enabled**, you'll see these two buttons appear:

```
┌─────────────────────────────────────────────┐
│  🔄 Regenerate Backup Codes                │  ← Option 1
│  🗑️  Reset 2FA Completely                   │  ← Option 2
└─────────────────────────────────────────────┘

Regenerate: Create new backup codes (if you lost yours or want fresh ones)
Reset: Delete everything and start fresh (requires new QR code scan)
```

## 🎯 The Options Explained:

### Option 1: **Regenerate Backup Codes** (Yellow Button)
- **What it does**: Generates 8 fresh backup codes
- **What stays**: Your existing QR code/authenticator app setup
- **When to use**: When you've lost your backup codes but still have your authenticator app
- **Requires**: Your admin password to confirm

### Option 2: **Reset 2FA Completely** (Red Button)  
- **What it does**: Deletes everything (secret, backup codes, 2FA enabled status)
- **What happens**: You get a completely fresh start
- **When to use**: When you've deleted your authenticator app and want to start over
- **Requires**: Your admin password to confirm
- **Result**: You can set up 2FA again with a new QR code

## 🚨 Why You Don't See Them Now:

**Current Status**: 2FA is **DISABLED** in your database
```sql
SELECT username, two_fa_enabled FROM admin_users WHERE username = 'admin';
-- Result: two_fa_enabled = 0 (disabled)
```

**The management buttons are programmatically hidden when 2FA is disabled:**
```javascript
// In admin.js - buttons start hidden
<div id="2fa-management" class="hidden mt-4 space-y-3">

// They only appear when 2FA is successfully enabled
document.getElementById('2fa-management')?.classList.remove('hidden');
```

## 🔧 Quick Enable 2FA to See the Options:

1. **Login to admin panel**
2. **Go to Security settings**  
3. **Toggle "Enable 2FA"**
4. **Complete the setup process**
5. **The backup codes management buttons will appear immediately**

## 📱 Emergency Access Scenario:

If you **lose your authenticator app**:
1. **Use emergency password**: `PowerR151!151` (currently in database)
2. **Login successfully** 
3. **Go to Security settings**
4. **Click "Reset 2FA Completely"** (red button)
5. **Enter your admin password**  
6. **Set up fresh 2FA with new QR code**

---

**Note**: The buttons are there in the code and fully functional - they just need 2FA to be enabled first to become visible!