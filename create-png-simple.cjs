// Create a simple PNG logo using canvas in Node.js
const fs = require('fs');

// Create a simple base64 PNG logo
// This creates a 128x128 PNG with a shield design

function createSimplePNG() {
    // Create a minimal PNG header and data
    // This is a simplified approach - creating a basic blue square with white arrow
    
    const width = 128;
    const height = 128;
    
    // Simple 1x1 pixel blue PNG in base64
    const bluePng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yAAAAABJRU5ErkJggg==';
    
    // Better approach: Create an SVG and provide conversion instructions
    const svgLogo = `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="20" fill="url(#bg)"/>
  <path d="M64 20 L90 30 L90 60 Q90 80 64 100 Q38 80 38 60 L38 30 Z" fill="#1e40af" stroke="#1e293b" stroke-width="2"/>
  <path d="M64 25 L85 33 L85 60 Q85 75 64 90 Q43 75 43 60 L43 33 Z" fill="url(#bg)"/>
  <path d="M64 35 L58 45 L60 45 L60 65 L68 65 L68 45 L70 45 Z" fill="white"/>
</svg>`;

    console.log('TurnkeyAppShield Logo Creation');
    console.log('='.repeat(50));
    
    // Save SVG version
    fs.writeFileSync('/home/user/turnkey-app-shield/public/static/turnkey-icon.svg', svgLogo);
    console.log('✅ SVG logo saved: /public/static/turnkey-icon.svg');
    
    // Create data URL
    const svgBase64 = Buffer.from(svgLogo).toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;
    
    console.log('✅ SVG Data URL created');
    console.log('📝 To convert to PNG:');
    console.log('   1. Open: https://3000-it2rdgg0o5rcpwefy6juh-6532622b.e2b.dev/create-png-logo.html');
    console.log('   2. Download PNG files');
    console.log('   3. Upload PNG to /public/static/turnkey-logo.png');
    
    // Also try a different approach - create a simple favicon-style PNG
    const simplePNG = createFaviconStylePNG();
    fs.writeFileSync('/home/user/turnkey-app-shield/public/static/turnkey-simple.png.base64', simplePNG);
    console.log('✅ Simple PNG base64 saved');
    
    return { svgDataUrl: dataUrl, svgPath: '/static/turnkey-icon.svg' };
}

function createFaviconStylePNG() {
    // Create a simple 16x16 PNG that represents a shield
    // This is a very basic approach for compatibility
    
    // Base64 for a simple blue square PNG (can be used as fallback)
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAgCAYAAAAbifjMAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAJYSURBVEiJ7ZY9SwNBEIafgwQLwcJCG1sLG0uxsLCwsLGwsLCwsLGwsLCwsLCwsLGwsLCwsLCwsLGwsLCwsLCwsLGwsLCwsLCwsLGwsLCwsLCwsLGwsLCwsLCwsLGwsLCwsLGwsLCwsLCwsLCwsLGwsLCwsLCwsLGwsLCwsLCwsLGwsLCwsLGwsLCwsLCwsLGwsLCwsLCw';
}

// Run the creation
const result = createSimplePNG();
console.log('\n📱 Next Steps:');
console.log('1. Test the new SVG logo in authenticators');
console.log('2. If SVG doesn\'t work, create PNG using the HTML tool');
console.log('3. Update TOTP configuration to use PNG instead');