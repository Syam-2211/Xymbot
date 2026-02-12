    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0];
            if (!m.message || m.key.fromMe) return; // Ignore your own messages

            const messageType = Object.keys(m.message)[0];
            const body = (messageType === 'conversation') ? m.message.conversation : 
                         (messageType === 'extendedTextMessage') ? m.message.extendedTextMessage.text : 
                         (messageType === 'imageMessage') ? m.message.imageMessage.caption : '';

            const prefix = '.'; // Your chosen prefix
            const isCommand = body.startsWith(prefix);
            if (!isCommand) return;

            const args = body.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            // --- Plugin Loader ---
            const pluginFolder = './plugins';
            const pluginFiles = fs.readdirSync(pluginFolder);

            for (const file of pluginFiles) {
                if (file.endsWith('.js')) {
                    const plugin = require(`${pluginFolder}/${file}`);
                    
                    // Check if the command matches the plugin's trigger
                    if (plugin.command && plugin.command.test(command)) {
                        console.log(`Executing: ${command} from ${file}`);
                        await plugin(m, { 
                            conn, 
                            args, 
                            usedPrefix: prefix, 
                            command,
                            isOwner: m.key.remoteJid.includes('919947121619'),
                            isAdmin: false // Simplified for initial test
                        });
                    }
                }
            }
        } catch (err) {
            console.error("Plugin Error:", err);
        }
    });
