const handler = async (m, { conn, isAdmin, isBotAdmin }) => {
    let chat = global.db.data.chats[m.chat];
    if (!chat || !chat.antilink) return true; // Only enforce if antilink is enabled

    // Regex to detect WhatsApp group links and general URLs
    const linkRegex = /chat.whatsapp.com\/([0-9A-Za-z]{20,24})|(https?:\/\/[^\s]+)/i;
    const text = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
    const isGroupLink = linkRegex.test(text);

    if (isGroupLink) {
        if (!isBotAdmin) return m.reply('I need to be an admin to kick users! 🛡️');
        if (isAdmin) return m.reply('Admin detected. I will allow the link this time. ✅');

        // Delete the message
        await conn.sendMessage(m.chat, { delete: m.key });

        // Initialize user in DB if not exists
        if (!global.db.data.users[m.sender]) {
            global.db.data.users[m.sender] = { warn: 0 };
        }
        
        // Increment warnings
        global.db.data.users[m.sender].warn += 1;
        const warnings = global.db.data.users[m.sender].warn;

        if (warnings < 3) {
            return conn.sendMessage(m.chat, { 
                text: `*🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 Security Alert*\n\n@${m.sender.split('@')[0]} Links are not allowed here! 🚫\n*Warning:* ${warnings}/3\n\nYou will be removed if you send 3 links.`, 
                mentions: [m.sender] 
            }, { quoted: m });
        } else {
            // Kick the user
            await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
            
            // Reset warnings
            global.db.data.users[m.sender].warn = 0;
            
            return conn.sendMessage(m.chat, { 
                text: `*🕊🦋⃝♥⃝ѕиєнα🍁♥⃝🦋⃝🕊 Security Alert*\n\n@${m.sender.split('@')[0]} has been removed for repeatedly sending links. 🚫`, 
                mentions: [m.sender] 
            }, { quoted: m });
        }
    }
    return true;
};

handler.customPrefix = /.*/; // Listens to all messages
handler.command = new RegExp();
handler.group = true; // Only works in groups

module.exports = handler;

