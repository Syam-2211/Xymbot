const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
require('./config');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: true
    });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0];
            if (!m.message) return;
            
            // Logic to load and execute your plugins
            const files = fs.readdirSync('./plugins');
            for (let file of files) {
                if (file.endsWith('.js')) {
                    let handler = require(`./plugins/${file}`);
                    // Basic execution logic for plugins
                    if (typeof handler === 'function') await handler(m, { conn });
                }
            }
        } catch (err) {
            console.log(err);
        }
    });

    console.log(`${global.botName} is online!`);
}

startBot();
