/**
 * Run this file ON RENDER via the Shell tab:
 *   node extract_session.js
 * 
 * It prints your SESSION_ID string to copy into Render env vars.
 */
const fs = require('fs');
const path = require('path');

const sessionDir = './session';
if (!fs.existsSync(sessionDir)) {
    console.error('❌ No session folder found at', sessionDir);
    process.exit(1);
}

const files = fs.readdirSync(sessionDir);
if (!files.length) {
    console.error('❌ Session folder is empty!');
    process.exit(1);
}

const obj = {};
for (const f of files) {
    const full = path.join(sessionDir, f);
    try {
        obj[f] = fs.readFileSync(full, 'utf8');
    } catch (e) {
        console.warn('⚠️ Skipping', f, ':', e.message);
    }
}

const b64 = Buffer.from(JSON.stringify(obj)).toString('base64');
console.log('\n============ COPY EVERYTHING BELOW ============');
console.log('XYMBOT~' + b64);
console.log('============ COPY EVERYTHING ABOVE ============\n');
