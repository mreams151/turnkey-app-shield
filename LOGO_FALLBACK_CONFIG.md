# TurnkeyAppShield Logo Configuration Guide

## Current Implementation
✅ **Branding**: "TurnkeyAppShield: admin"  
✅ **Logo**: PNG format (512x512) at `/static/turnkey-logo.png`  
✅ **Format**: `otpauth://totp/TurnkeyAppShield:admin?secret=...&image=https://...`  

## If Logo Still Causes Timeout Issues

### Quick Fix 1: Remove Logo, Keep Branding
Edit `/src/routes/admin.ts` around line 4992:

```typescript
// Change from:
const otpauthUrl = WebCryptoTOTP.keyuri(adminUser.username, issuer, secret, logoUrl);

// To:
const otpauthUrl = WebCryptoTOTP.keyuri(adminUser.username, issuer, secret);
```

Result: "TurnkeyAppShield: admin" with generic icon, no timeout.

### Quick Fix 2: Try Different Logo Formats
Replace the logoUrl with different formats:

```typescript
// Option 1: SVG version
const logoUrl = `https://3000-it2rdgg0o5rcpwefy6juh-6532622b.e2b.dev/static/turnkey-logo-v2.svg`;

// Option 2: PNG version (current)
const logoUrl = `https://3000-it2rdgg0o5rcpwefy6juh-6532622b.e2b.dev/static/turnkey-logo.png`;

// Option 3: Base64 embedded (not recommended - makes QR huge)
const logoUrl = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...`;
```

### Quick Fix 3: Safe Mode Fallback
```typescript
// Guaranteed to work - revert to safe configuration
const issuer = 'Admin Panel';
const otpauthUrl = WebCryptoTOTP.keyuri(adminUser.username, issuer, secret);
```

## Rebuild Commands After Changes
```bash
cd /home/user/turnkey-app-shield
npm run build
fuser -k 3000/tcp 2>/dev/null || true
pm2 start ecosystem.config.cjs
```

## Alternative Authenticator Apps
If Authy continues having logo issues:
- **Google Authenticator** - Most reliable, never has logo problems
- **Microsoft Authenticator** - Good logo support
- **1Password** - Excellent TOTP handling
- **Bitwarden** - Open source, reliable

## Production Considerations
- Use stable HTTPS domain instead of sandbox URL
- Test with multiple authenticator apps
- Keep fallback configuration ready
- Consider user education about manual logo addition