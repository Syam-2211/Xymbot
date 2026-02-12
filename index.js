const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore, 
    PHONENUMBER_MCC 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const readline = require("readline");
require('./config');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    
    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // Disabled for Pairing Code
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
    });

    // --- Pairing Code Logic ---
    if (!conn.authState.creds.registered) {
        const phoneNumber = "919947121619"; // Your confirmed number
        await delay(3000);
        let code = await conn.requestPairingCode(phoneNumber);
        console.log(`\n\x1b[32m【 PAIRING CODE FOR SNHEA-BOT 】\x1b[0m`);
        console.log(`Your Code: \x1b[33m${code}\x1b[0m\n`);
    }

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('messages.upsert', async (chatUpdate) => {
        const m = chatUpdate.messages[0];
        if (!m.message) return;
        // Plugin loading logic remains the same...
    });

    console.log(`\x1b[36m${global.botName} is initializing...\x1b[0m`);
}

startBot();
