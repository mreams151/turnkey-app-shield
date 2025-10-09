# 🔐 TurnkeyAppShield - Secret Key & Copy Button Guide

## 🤔 **What is the Secret Key?**

The **Secret Key** (like `3ZIP7H22HS2G0BTNLLQLBEKMHXBSM2HP`) is a **Base32-encoded string** that contains the same TOTP (Time-based One-Time Password) information as the QR code, but in text format.

### 📱 **Why Do We Need Both QR Code AND Secret Key?**

| Method | Use Case | When to Use |
|--------|----------|-------------|
| **🔲 QR Code** | Quick scanning with phone | Most common - scan with authenticator app |
| **🔑 Secret Key** | Manual text entry | When QR code won't scan or manual setup needed |

**Both methods create the SAME 6-digit codes** - they're just different input methods for the same cryptographic secret.

---

## 🎯 **When to Use the Secret Key:**

### 1. **📷 QR Code Won't Scan**
- Poor camera quality
- Bad lighting conditions
- Damaged or blurry QR code
- Screen glare or reflection

### 2. **🖥️ Desktop Authenticator Apps**
- Authy Desktop
- 1Password Desktop
- Bitwarden Desktop
- Apps without camera access

### 3. **📱 Manual Entry Preference**
- Some users prefer typing over scanning
- Corporate security policies
- Accessibility requirements

### 4. **🔄 Backup & Recovery**
- Save secret key in password manager
- Print backup for secure storage
- Multiple device setup

### 5. **🛠️ Troubleshooting**
- When QR scanning repeatedly fails
- Testing different authenticator apps
- Verifying TOTP implementation

---

## ✨ **New Copy Button Features Added:**

### **📋 Copy Secret Key Button**
```
┌─────────────────────────────────────────────────────┐
│  Secret Key (Manual Entry):                        │
│  ┌─────────────────────────────────┐ ┌───────────┐ │
│  │ 3ZIP7H22HS2G0BTNLLQLBEKMHXBSM2HP │ │📋 Copy    │ │
│  └─────────────────────────────────┘ └───────────┘ │
│  Use this key if you can't scan the QR code        │
└─────────────────────────────────────────────────────┘
```

### **📋 Copy Backup Codes Button** 
```
┌─────────────────────────────────────────────────────┐
│  New Backup Codes Generated                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │LBR797AP │ │ZINTQJT2 │ │VT7LV6UM │ │1UN3D3Q0 │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│  │8NXHSVHS │ │ADF60W89 │ │N38PE1X6 │ │OFA1ZDJU │ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ │
│                                                   │
│  📋 Copy All Codes      ✅ I've Saved My Codes   │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 **How to Use the Copy Buttons:**

### **Method 1: Copy Secret Key**
1. **Setup 2FA**: Go to Security → Enable 2FA
2. **See QR Code**: Modal shows QR code and secret key
3. **Click Copy**: Blue "Copy" button next to secret key
4. **Paste**: Into your authenticator app's manual entry field

### **Method 2: Copy Backup Codes**
1. **Generate Codes**: Either during initial setup or regeneration
2. **View Modal**: See all 8 backup codes displayed
3. **Click Copy**: Blue "Copy All Codes" button
4. **Save**: Paste into password manager or secure notes

---

## 📱 **Authenticator App Manual Entry Steps:**

### **Google Authenticator:**
1. Open app → **"+"** → **"Enter setup key"**
2. **Account**: `admin@turnkey.local`
3. **Key**: `3ZIP7H22HS2G0BTNLLQLBEKMHXBSM2HP` (paste from copy button)
4. **Save** → App generates 6-digit codes

### **Authy Desktop:**
1. **"+"** → **"Add Account"** → **"Manual Entry"**
2. **Name**: `TurnkeyAppShield Admin`
3. **Secret**: Paste the copied secret key
4. **Digits**: 6, **Period**: 30 seconds

### **1Password:**
1. **New Item** → **"One-Time Password"**
2. **Secret**: Paste copied key
3. **Account**: `admin@turnkey.local`

---

## 🎯 **Test the Copy Buttons Now:**

### **🔗 Live Testing URL:**
**https://3000-it2rdgg0o5rcpwefy6juh-6532622b.e2b.dev/admin**

### **📋 Test Steps:**
1. **Login**: admin / admin123
2. **Navigate**: Security → Two-Factor Authentication  
3. **Reset 2FA**: Click "Reset 2FA Completely" to start fresh
4. **Enable 2FA**: Toggle the switch
5. **Test Copy Secret**: Click copy button next to secret key
6. **Complete Setup**: Enter 6-digit code from your app
7. **Test Copy Backup**: Click "Copy All Codes" for backup codes

---

## 💡 **Pro Tips:**

### **🔒 Security Best Practices:**
- **Save secret key** in password manager for backup
- **Store backup codes** securely (not in same location as phone)
- **Test backup codes** before relying on them
- **Use different devices** for authenticator and backup codes

### **🛠️ Troubleshooting:**
- **Copy fails?** Check browser clipboard permissions
- **Secret doesn't work?** Ensure no extra spaces when pasting
- **Wrong codes?** Check device time synchronization
- **Still issues?** Use emergency password: `PowerR151!151`

---

## ✅ **Feature Complete!**

Both copy buttons are now implemented and ready for production use:

- ✅ **Copy Secret Key**: One-click copy of TOTP secret for manual entry
- ✅ **Copy Backup Codes**: One-click copy of all 8 backup codes  
- ✅ **Visual Feedback**: Buttons change to "Copied!" with green color
- ✅ **Error Handling**: Graceful fallback if clipboard access fails
- ✅ **User-Friendly**: Clear labels and helpful instructions

**The secret key copy functionality makes 2FA setup much more user-friendly!** 🚀