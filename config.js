const fs = require('fs');
const path = require('path');

// Auto-load .env file if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    try {
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                const [k, ...v] = trimmed.split('=');
                if (k && !process.env[k.trim()]) {
                    process.env[k.trim()] = v.join('=').trim();
                }
            }
        }
    } catch (e) { }
}

const configPath = path.join(__dirname, 'database/bot_config.json');

// Default config
let botConfig = {
    prefix: '.',
    owner: ['919947121619', '918075495063'],
    ownerName: '🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓',
    botName: '🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊',
    worktype: 'public',
    sudo: []
};

// Load from database if exists
try {
    if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf8');
        botConfig = { ...botConfig, ...JSON.parse(data) };
    }
} catch (e) {
    console.error('Error loading bot_config.json', e);
}

// Ensure database folder exists
try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
} catch (e) { }

// Apply dynamically to globals so existing plugins continue to work flawlessly
global.owner = botConfig.owner;
global.ownerName = botConfig.ownerName;
global.botName = botConfig.botName;
global.WORKTYPE = botConfig.worktype;
global.sudo = botConfig.sudo;

// ── API KEYS ─────────────────────────────────────────────────────────────────
// Please set these in your hosting environment variables or .env file!
global.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'your_gemini_api_key_here';
global.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your_openai_api_key_here';
global.LICENSE_KEY = process.env.LICENSE_KEY || '';
global.SESSION_ID = process.env.SESSION_ID || 'XYMBOT~eyJub2lzZUtleSI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiZ00wbzZTb1dPNVZOYjJHZVZtR05Kc00rWGlSandqZzFqbUNrelc0ejNIaz0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiaDJLNHNqZlN6LzZpUEI3bDlHWEhwcitqdWRLU01HNGF4aTd3cE5uaUdYZz0ifX0sInBhaXJpbmdFcGhlbWVyYWxLZXlQYWlyIjp7InByaXZhdGUiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJ1RVh0MytjZlVlNDRrcVN1cE1FbFdzZ3Q2Yy9mOWlNRkphL1QrcFN6dlVRPSJ9LCJwdWJsaWMiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJ3OVBYQTlDdWRLK08xdlUxVUc0LzdPc1JCNU5RUTViU01RRFA1eXRQdmpZPSJ9fSwic2lnbmVkSWRlbnRpdHlLZXkiOnsicHJpdmF0ZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IitJK2cvNnhTbWZoVmU2RmRZMys2ZTRyMGhVRHZjVjlGb3NWWnFWYy9mazA9In0sInB1YmxpYyI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6Inp1U3ZlZzFvU1VzQ0lBWUFucStGS1RFaEU2bUdoRnhGMWY2WjlBNTlyd0k9In19LCJzaWduZWRQcmVLZXkiOnsia2V5UGFpciI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoia1AxdzVUQWk2MzdYbHY2TUZTQVR0emMxeXZ4V2JHMVV1UUs4M2F5b1gwMD0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiNG5sRFZQL0UwL1lqYzJCcVZsWjV1cWVrZnVsZUFHbklES3BxSU9xclRXbz0ifX0sInNpZ25hdHVyZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6ImFTQ2FXMzZKOVh5YVU5UkJ6QWk3RG1HUGxHTjljODNIOWR5a1hMQWcvUzlpeXJDQzErYU5mcFd3a0dTZmNsNW1QV3l3ZHorY21PRWF0UkdlSXlJNENnPT0ifSwia2V5SWQiOjF9LCJyZWdpc3RyYXRpb25JZCI6NjksImFkdlNlY3JldEtleSI6IjBmRXcwTGI2ZXlHc3FiMXE0K2o2Q0JJRzRsTmk1U2dZZEF6VEU5SXVLbUE9IiwicHJvY2Vzc2VkSGlzdG9yeU1lc3NhZ2VzIjpbXSwibmV4dFByZUtleUlkIjo4MTMsImZpcnN0VW51cGxvYWRlZFByZUtleUlkIjo4MTMsImFjY291bnRTeW5jQ291bnRlciI6MCwiYWNjb3VudFNldHRpbmdzIjp7InVuYXJjaGl2ZUNoYXRzIjpmYWxzZX0sInJlZ2lzdGVyZWQiOmZhbHNlLCJhY2NvdW50Ijp7ImRldGFpbHMiOiJDTGl0L2ZZR0VObktyZFlHR0FFZ0FDZ0EiLCJhY2NvdW50U2lnbmF0dXJlS2V5IjoiTno4b3dCczdzQnVzN21pZUdmQWNNdVpOQnhJUWJIcEhWa1hNb01RODBFWT0iLCJhY2NvdW50U2lnbmF0dXJlIjoiOE9aZU9reUhiZStxZmlpNXhLL0pEa2FFdDZZc2FnSG1nSmR0dXVkcnNyUzZJU2lwRVNEcDRKeEd3a1hKc0RzczRkc2R6QzBuTkV5N3J1OTVvTG5QQUE9PSIsImRldmljZVNpZ25hdHVyZSI6IjRyQ0hhOWFuUGF6RG0xaUgzcmNrc3NmR3VHVkl0UTU1Wk9PVzByK29neFM2V3g2bWxIUWcxb3hEcGtrR0lwc3J0TVdKYlBkK3VRUUp0eUdZbkpKSkR3PT0ifSwibWUiOnsiaWQiOiI5MTk5NDcxMjE2MTk6NTlAcy53aGF0c2FwcC5uZXQiLCJsaWQiOiIyMTU2OTMyNTc5MzQyNzo1OUBsaWQifSwic2lnbmFsSWRlbnRpdGllcyI6W3siaWRlbnRpZmllciI6eyJuYW1lIjoiMjE1NjkzMjU3OTM0Mjc6NTlAbGlkIiwiZGV2aWNlSWQiOjB9LCJpZGVudGlmaWVyS2V5Ijp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiQlRjL0tNQWJPN0Fick81b25obndIRExtVFFjU0VHeDZSMVpGektERVBOQkcifX1dLCJwbGF0Zm9ybSI6ImFuZHJvaWQiLCJyb3V0aW5nSW5mbyI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IkNBMElBZ2dGIn0sImxhc3RBY2NvdW50U3luY1RpbWVzdGFtcCI6MTc5MTcxNDY1NCwibGFzdFByb3BIYXNoIjoiM0ROYkoifQ==';
// Initializing the database for your group settings
global.db = { data: { chats: {}, users: {} } };

// Load language string translations
global.LANG = require('./language.json').STRINGS;

module.exports = {
    getPrefix: () => botConfig.prefix,
    updateSettings: (newValues) => {
        botConfig = { ...botConfig, ...newValues };

        global.owner = botConfig.owner;
        global.ownerName = botConfig.ownerName;
        global.botName = botConfig.botName;
        global.WORKTYPE = botConfig.worktype;
        global.sudo = botConfig.sudo;

        fs.writeFileSync(configPath, JSON.stringify(botConfig, null, 2));
    }
};
