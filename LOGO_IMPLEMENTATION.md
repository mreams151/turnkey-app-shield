# Logo Implementation Guide for Production

## Current Status
✅ **TurnkeyAppShield branding** - Working (shows proper name in Authy)
❌ **Custom logo** - Temporarily disabled due to Authy compatibility issues

## Why Logo Failed in Development
1. **Temporary URLs**: Sandbox URLs are not permanent/trusted
2. **SVG Format**: Authy might prefer PNG/JPG over SVG
3. **CORS Issues**: Some authenticator apps have strict CORS requirements
4. **HTTPS Requirements**: Logo URLs must be HTTPS with valid certificates

## Production Implementation Plan

### Option 1: Deploy to Production First
```typescript
// In production with stable HTTPS URL:
const logoUrl = `https://your-domain.com/static/turnkey-logo.png`;
const otpauthUrl = WebCryptoTOTP.keyuri(adminUser.username, issuer, secret, logoUrl);
```

### Option 2: Convert SVG to PNG
```bash
# Convert the SVG to PNG format (more compatible)
# Use an online converter or imagemagick:
convert turnkey-logo-v2.svg -background none -size 512x512 turnkey-logo.png
```

### Option 3: Use CDN/External Hosting
Upload the logo to:
- GitHub Pages
- Cloudflare R2 with public access
- Any CDN service
- ImgBB, Imgur, etc.

### Option 4: Base64 Embed (Not Recommended)
```typescript
// Embed logo as base64 (makes QR codes very large)
const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...";
```

## Recommended Approach
1. **Deploy to production** with Cloudflare Pages first
2. **Use PNG format** instead of SVG
3. **Test with multiple authenticator apps** (Google, Microsoft, Authy)
4. **Keep fallback without logo** if any issues persist

## Current Working Configuration
```typescript
// This works reliably across all authenticator apps:
const issuer = 'TurnkeyAppShield';
const otpauthUrl = WebCryptoTOTP.keyuri(adminUser.username, issuer, secret);
// Format: otpauth://totp/TurnkeyAppShield:username?secret=...&issuer=TurnkeyAppShield
```