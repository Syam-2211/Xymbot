const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'database/bot_config.json');

// Default config
let botConfig = {
    prefix: '.',
    owner: ['919947121619'],
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
