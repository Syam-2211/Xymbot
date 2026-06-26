const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    makeCacheableSignalKeyStore 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
require('./config');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    
    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        browser: ["Syam-Bot", "Safari", "1.0.0"]
    });

    conn.ev.on('creds.update', saveCreds);

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('📸 Scan the QR code below to link 🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Connected! 🤍⃞𝄟ꪶ𝐒͢ʏ᪳ᴀ͓ᴍ͎ ͢𝐒ᴇ͓ꪳʀ͎𖦻⃞🍓 is now the owner.');
        }
    });

    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0];
            if (!m.message || m.key.fromMe) return;

            const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || '';
            const prefix = '.'; 
            
            if (!body.startsWith(prefix)) return;

            const args = body.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            // --- TEST RESPONSE ---
                if (command === 'test') {
          // 1. Send "typing..." status to the chat
                     await conn.sendPresenceUpdate('composing', m.key.remoteJid);
    
        // 2. Add a randomized delay (e.g., between 2 to 4 seconds)
                     const delay = Math.floor(Math.random() * 2000) + 2000;
                     await new Promise(resolve => setTimeout(resolve, delay));
    
     // 3. Send the actual message
                     return await conn.sendMessage(m.key.remoteJid, { text: 'Hello! 🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 is online and responding!' });
                }
        

            // --- PLUGIN LOADER ---
            const pluginFiles = fs.readdirSync('./plugins');
            for (const file of pluginFiles) {
                if (file.endsWith('.js')) {
                    const plugin = require(`./plugins/${file}`);
                    
                    // Improved check for both String and Regex commands
                    const isCommand = Array.isArray(plugin.command) 
                        ? plugin.command.includes(command) 
                        : (plugin.command instanceof RegExp ? plugin.command.test(command) : plugin.command === command);

                    if (isCommand) {
                        await plugin(m, { 
                            conn, 
                            args, 
                            usedPrefix: prefix, 
                            command,
                            isOwner: m.key.remoteJid.includes('919947121619') 
                        });
                    }
                }
            }
        } catch (err) {
            console.error("Handler Error:", err);
        }
    }); // End of messages.upsert
} // End of startBot

startBot();
