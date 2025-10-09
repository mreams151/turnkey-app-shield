# Authy Logo Timeout Troubleshooting

## Issue Summary
Authy consistently searches for logos for 10 seconds, then times out with "no logo found" message, regardless of:
- ✅ No image parameter in TOTP URI
- ✅ Accessible logo URLs
- ✅ Different issuer names ("TurnkeyAppShield", "Turnkey Shield", "Admin Panel")
- ✅ Different URI formats

## Current Status: Testing "Admin Panel"
- **Current Issuer**: `Admin Panel`
- **Format**: `otpauth://totp/Admin Panel:username?secret=...&issuer=Admin Panel`
- **Expected**: Should not trigger logo lookup

## Ultimate Fallbacks Ready
If "Admin Panel" still triggers logo search:

### Option 1: Single Word Issuer
```typescript
const issuer = 'Admin';
// Format: otpauth://totp/Admin:username?secret=...&issuer=Admin
```

### Option 2: Username-Only Format
```typescript  
const issuer = adminUser.username;
// Format: otpauth://totp/username:username?secret=...&issuer=username
```

### Option 3: Minimal Format (Last Resort)
```typescript
const otpauthUrl = `otpauth://totp/${encodeURIComponent(adminUser.username)}?secret=${secret}`;
// Format: otpauth://totp/username?secret=... (no issuer)
```

## Alternative Authenticator Apps
If Authy continues having issues:
- **Google Authenticator** - Never searches for logos
- **Microsoft Authenticator** - Reliable, no logo timeouts  
- **1Password** - Clean TOTP handling
- **Bitwarden** - Simple, functional

## Production Logo Strategy
For production deployment:
1. Deploy to Cloudflare Pages first (stable HTTPS URLs)
2. Convert SVG to PNG format (better compatibility)
3. Test with multiple authenticator apps
4. Keep fallback without logo if issues persist