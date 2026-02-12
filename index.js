const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    delay, 
    makeCacheableSignalKeyStore, 
    DisconnectReason 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
require('./config');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    
    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        browser: ["Ubuntu", "Chrome", "20.0.04"] // Helps avoid some linking errors
    });

    // Pairing Code Trigger
    if (!conn.authState.creds.registered) {
        const phoneNumber = "919947121619"; 
        await delay(5000); // Gives it time to initialize before requesting code
        let code = await conn.requestPairingCode(phoneNumber);
        console.log(`\n\x1b[32m【 PAIRING CODE 】\x1b[0m`);
        console.log(`Your Code: \x1b[33m${code}\x1b[0m\n`);
    }

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            let reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`❌ Connection Closed. Reason: ${reason}`);
            // Auto-reconnect logic
            if (reason !== DisconnectReason.loggedOut) {
                console.log("🔄 Reconnecting...");
                startBot();
            }
        } else if (connection === 'open') {
            console.log(`\x1b[32m✅ SUCCESS: ${global.botName} is now Connected!\x1b[0m`);
        }
    });

    // Simple message handler to trigger your plugins
    conn.ev.on('messages.upsert', async (chatUpdate) => {
        const m = chatUpdate.messages[0];
        if (!m.message) return;
        // Your existing plugin loading logic goes here
    });
}

startBot();
